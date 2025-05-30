import {
  supabase,
  handleSupabaseError,
  debugLog,
  TABLES,
  ROLES,
  generateInviteCode,
} from '../config/supabase';

class GroupsService {
  constructor() {
    this.activeSubscriptions = new Map();
  }

  // 👥 Crea nuovo gruppo con debug migliorato
  async createGroup(name, description = '') {
    debugLog('Creating Group', { name, description });

    try {
      // Test autenticazione
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        debugLog('Create Group - Auth Error', null, authError);
        throw authError;
      }

      if (!user) {
        debugLog('Create Group - No User', 'Utente non autenticato');
        throw new Error('Utente non autenticato');
      }

      debugLog('Create Group - User Authenticated', {
        userId: user.id,
        email: user.email,
      });

      // Genera codice invito
      const inviteCode = generateInviteCode();
      debugLog('Create Group - Generated Invite Code', inviteCode);

      // Prepara dati gruppo
      const groupData = {
        name: name.trim(),
        description: description.trim(),
        created_by: user.id,
        invite_code: inviteCode,
      };

      debugLog('Create Group - Inserting Group Data', groupData);

      // Crea il gruppo
      const { data: newGroup, error: groupError } = await supabase
        .from(TABLES.GROUPS)
        .insert([groupData])
        .select('*')
        .single();

      if (groupError) {
        debugLog('Create Group - Group Insert Error', null, groupError);
        throw groupError;
      }

      debugLog('Create Group - Group Created Successfully', newGroup);

      // Prepara dati membro
      const memberData = {
        group_id: newGroup.id,
        user_id: user.id,
        role: ROLES.ADMIN,
      };

      debugLog('Create Group - Adding Admin Member', memberData);

      // Aggiungi il creatore come admin del gruppo
      const { error: memberError } = await supabase
        .from(TABLES.GROUP_MEMBERS)
        .insert([memberData]);

      if (memberError) {
        debugLog('Create Group - Member Insert Error', null, memberError);
        throw memberError;
      }

      debugLog('Create Group - Admin Member Added Successfully');

      const result = {
        success: true,
        group: newGroup,
        message: 'Gruppo creato con successo!',
      };

      debugLog('Create Group - Final Result', result);
      return result;
    } catch (error) {
      const errorMessage = handleSupabaseError(error);
      debugLog('Create Group - Final Error', null, error);

      return {
        success: false,
        error: errorMessage,
        details: error.message, // Per debug
      };
    }
  }

  // 📋 Ottieni tutti i gruppi dell'utente con debug
  async getUserGroups() {
    debugLog('Getting User Groups', 'Starting...');

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        debugLog('Get User Groups - Auth Error', null, authError);
        throw authError;
      }

      if (!user) {
        throw new Error('Utente non autenticato');
      }

      debugLog('Get User Groups - User Authenticated', { userId: user.id });

      // Prima ottieni gli ID dei gruppi di cui l'utente fa parte
      const { data: memberGroups, error: memberError } = await supabase
        .from(TABLES.GROUP_MEMBERS)
        .select('group_id')
        .eq('user_id', user.id);

      if (memberError) {
        debugLog('Get User Groups - Member Groups Error', null, memberError);
        throw memberError;
      }

      debugLog('Get User Groups - Member Groups Found', memberGroups);

      if (!memberGroups || memberGroups.length === 0) {
        debugLog(
          'Get User Groups - No Groups Found',
          'User is not member of any group'
        );
        return {
          success: true,
          groups: [],
        };
      }

      const groupIds = memberGroups.map((mg) => mg.group_id);
      debugLog('Get User Groups - Group IDs', groupIds);

      // Query semplificata senza join complessi
      const { data: groups, error: groupsError } = await supabase
        .from(TABLES.GROUPS)
        .select('*')
        .in('id', groupIds)
        .order('created_at', { ascending: false });

      if (groupsError) {
        debugLog('Get User Groups - Groups Query Error', null, groupsError);
        throw groupsError;
      }

      debugLog('Get User Groups - Groups Data Retrieved', groups);

      // Per ogni gruppo, carica separatamente membri e spese
      const groupsWithStats = await Promise.all(
        groups.map(async (group) => {
          // Carica membri
          const { data: members } = await supabase
            .from(TABLES.GROUP_MEMBERS)
            .select('user_id, role')
            .eq('group_id', group.id);

          // Carica spese
          const { data: expenses } = await supabase
            .from(TABLES.EXPENSES)
            .select('id, total_amount')
            .eq('group_id', group.id);

          return {
            ...group,
            memberCount: members?.length || 0,
            expenseCount: expenses?.length || 0,
            totalAmount:
              expenses?.reduce(
                (sum, expense) => sum + parseFloat(expense.total_amount),
                0
              ) || 0,
            userRole:
              members?.find((member) => member.user_id === user.id)?.role ||
              'member',
          };
        })
      );

      debugLog('Get User Groups - Final Result', groupsWithStats);

      return {
        success: true,
        groups: groupsWithStats,
      };
    } catch (error) {
      const errorMessage = handleSupabaseError(error);
      debugLog('Get User Groups - Final Error', null, error);

      return {
        success: false,
        error: errorMessage,
        details: error.message,
      };
    }
  }

  // 🔍 Ottieni dettagli gruppo con debug - QUERY SEMPLIFICATA
  async getGroupDetails(groupId) {
    debugLog('Getting Group Details', { groupId });

    try {
      // Query base del gruppo
      const { data: group, error: groupError } = await supabase
        .from(TABLES.GROUPS)
        .select('*')
        .eq('id', groupId)
        .single();

      if (groupError) {
        debugLog('Get Group Details - Group Query Error', null, groupError);
        throw groupError;
      }

      // Carica membri separatamente
      const { data: members, error: membersError } = await supabase
        .from(TABLES.GROUP_MEMBERS)
        .select('user_id, role, joined_at')
        .eq('group_id', groupId);

      if (membersError) {
        debugLog('Get Group Details - Members Query Error', null, membersError);
        // Non bloccare se i membri non si caricano
      }

      // Aggiungi i membri al gruppo
      const groupWithMembers = {
        ...group,
        group_members: members || [],
      };

      debugLog('Get Group Details - Success', groupWithMembers);

      return {
        success: true,
        group: groupWithMembers,
      };
    } catch (error) {
      const errorMessage = handleSupabaseError(error);
      debugLog('Get Group Details - Final Error', null, error);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  // 🎯 Unisciti a gruppo tramite codice invito con debug
  async joinGroupByInviteCode(inviteCode) {
    debugLog('Joining Group by Invite Code', { inviteCode });

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      if (!user) {
        throw new Error('Utente non autenticato');
      }

      debugLog('Join Group - User Authenticated', { userId: user.id });

      // Trova il gruppo con il codice invito
      const { data: groupData, error: groupError } = await supabase
        .from(TABLES.GROUPS)
        .select('*')
        .eq('invite_code', inviteCode.toUpperCase())
        .single();

      if (groupError) {
        debugLog('Join Group - Group Search Error', null, groupError);
        if (groupError.code === 'PGRST116') {
          throw new Error('Codice invito non valido');
        }
        throw groupError;
      }

      if (!groupData) {
        throw new Error('Codice invito non valido');
      }

      debugLog('Join Group - Group Found', groupData);

      // Verifica se l'utente è già membro
      const { data: existingMember, error: memberCheckError } = await supabase
        .from(TABLES.GROUP_MEMBERS)
        .select('*')
        .eq('group_id', groupData.id)
        .eq('user_id', user.id)
        .single();

      if (memberCheckError && memberCheckError.code !== 'PGRST116') {
        debugLog('Join Group - Member Check Error', null, memberCheckError);
        throw memberCheckError;
      }

      if (existingMember) {
        debugLog('Join Group - Already Member', existingMember);
        return {
          success: false,
          error: 'Sei già membro di questo gruppo',
        };
      }

      // Aggiungi l'utente al gruppo
      const memberData = {
        group_id: groupData.id,
        user_id: user.id,
        role: ROLES.MEMBER,
      };

      debugLog('Join Group - Adding Member', memberData);

      const { error: memberError } = await supabase
        .from(TABLES.GROUP_MEMBERS)
        .insert([memberData]);

      if (memberError) {
        debugLog('Join Group - Member Insert Error', null, memberError);
        throw memberError;
      }

      debugLog('Join Group - Success');

      return {
        success: true,
        group: groupData,
        message: `Ti sei unito al gruppo "${groupData.name}"!`,
      };
    } catch (error) {
      const errorMessage = handleSupabaseError(error);
      debugLog('Join Group - Final Error', null, error);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  // 💰 Crea nuova spesa con debug migliorato
  async createExpense(groupId, expenseData) {
    debugLog('Creating Expense', { groupId, expenseData });

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      if (!user) {
        throw new Error('Utente non autenticato');
      }

      debugLog('Create Expense - User Authenticated', { userId: user.id });

      // Verifica che l'utente sia membro del gruppo
      const { data: memberData, error: memberError } = await supabase
        .from(TABLES.GROUP_MEMBERS)
        .select('*')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .single();

      if (memberError) {
        debugLog('Create Expense - Member Check Error', null, memberError);
        if (memberError.code === 'PGRST116') {
          throw new Error('Non sei membro di questo gruppo');
        }
        throw memberError;
      }

      if (!memberData) {
        throw new Error('Non sei membro di questo gruppo');
      }

      debugLog('Create Expense - User is Member', memberData);

      // Prepara dati spesa
      const newExpenseData = {
        group_id: groupId,
        created_by: user.id,
        title: expenseData.title.trim(),
        description: expenseData.description?.trim() || '',
        total_amount: parseFloat(expenseData.totalAmount),
        location: expenseData.location?.trim() || '',
        expense_date:
          expenseData.date || new Date().toISOString().split('T')[0],
      };

      debugLog('Create Expense - Inserting Expense', newExpenseData);

      // Crea la spesa
      const { data: expense, error: expenseError } = await supabase
        .from(TABLES.EXPENSES)
        .insert([newExpenseData])
        .select('*')
        .single();

      if (expenseError) {
        debugLog('Create Expense - Expense Insert Error', null, expenseError);
        throw expenseError;
      }

      debugLog('Create Expense - Expense Created', expense);

      // Crea i consumi (expense_shares)
      if (expenseData.shares && Object.keys(expenseData.shares).length > 0) {
        const shares = Object.entries(expenseData.shares)
          .filter(([_, amount]) => parseFloat(amount) > 0)
          .map(([userId, amount]) => ({
            expense_id: expense.id,
            user_id: userId,
            amount_consumed: parseFloat(amount),
          }));

        debugLog('Create Expense - Inserting Shares', shares);

        if (shares.length > 0) {
          const { error: sharesError } = await supabase
            .from(TABLES.EXPENSE_SHARES)
            .insert(shares);

          if (sharesError) {
            debugLog('Create Expense - Shares Insert Error', null, sharesError);
            throw sharesError;
          }

          debugLog('Create Expense - Shares Created Successfully');
        }
      }

      debugLog('Create Expense - Success');

      return {
        success: true,
        expense: expense,
        message: 'Spesa aggiunta con successo!',
      };
    } catch (error) {
      const errorMessage = handleSupabaseError(error);
      debugLog('Create Expense - Final Error', null, error);

      return {
        success: false,
        error: errorMessage,
        details: error.message,
      };
    }
  }

  // 📋 Ottieni spese del gruppo - QUERY SEMPLIFICATA
  async getGroupExpenses(groupId) {
    debugLog('Getting Group Expenses', { groupId });

    try {
      // Query base delle spese
      const { data: expenses, error: expensesError } = await supabase
        .from(TABLES.EXPENSES)
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false });

      if (expensesError) {
        debugLog('Get Group Expenses - Expenses Error', null, expensesError);
        throw expensesError;
      }

      // Per ogni spesa, carica i consumi separatamente
      const expensesWithShares = await Promise.all(
        expenses.map(async (expense) => {
          const { data: shares } = await supabase
            .from(TABLES.EXPENSE_SHARES)
            .select('user_id, amount_consumed')
            .eq('expense_id', expense.id);

          return {
            ...expense,
            expense_shares: shares || [],
          };
        })
      );

      debugLog('Get Group Expenses - Success', {
        count: expensesWithShares?.length || 0,
      });

      return {
        success: true,
        expenses: expensesWithShares || [],
      };
    } catch (error) {
      const errorMessage = handleSupabaseError(error);
      debugLog('Get Group Expenses - Final Error', null, error);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  // 🧮 Calcola bilanci gruppo
  async calculateGroupBalances(groupId) {
    debugLog('Calculating Group Balances', { groupId });

    try {
      const { data, error } = await supabase
        .from('user_group_balances')
        .select('*')
        .eq('group_id', groupId);

      if (error) {
        debugLog('Calculate Group Balances - Error', null, error);
        throw error;
      }

      debugLog('Calculate Group Balances - Data Retrieved', data);

      // Calcola regolamenti ottimali
      const settlements = this.calculateOptimalSettlements(data || []);

      debugLog(
        'Calculate Group Balances - Settlements Calculated',
        settlements
      );

      return {
        success: true,
        balances: data || [],
        settlements: settlements,
      };
    } catch (error) {
      const errorMessage = handleSupabaseError(error);
      debugLog('Calculate Group Balances - Final Error', null, error);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  // 🔄 Calcola regolamenti ottimali
  calculateOptimalSettlements(balances) {
    debugLog('Calculating Optimal Settlements', balances);

    const creditors = balances
      .filter((b) => parseFloat(b.balance) > 0.01)
      .map((b) => ({ ...b, balance: parseFloat(b.balance) }))
      .sort((a, b) => b.balance - a.balance);

    const debtors = balances
      .filter((b) => parseFloat(b.balance) < -0.01)
      .map((b) => ({ ...b, balance: Math.abs(parseFloat(b.balance)) }))
      .sort((a, b) => b.balance - a.balance);

    debugLog('Settlements - Creditors', creditors);
    debugLog('Settlements - Debtors', debtors);

    const settlements = [];
    let i = 0,
      j = 0;

    while (i < creditors.length && j < debtors.length) {
      const creditor = creditors[i];
      const debtor = debtors[j];

      const transferAmount = Math.min(creditor.balance, debtor.balance);

      if (transferAmount > 0.01) {
        settlements.push({
          from: debtor.full_name || debtor.email,
          fromUserId: debtor.user_id,
          to: creditor.full_name || creditor.email,
          toUserId: creditor.user_id,
          amount: transferAmount,
        });

        creditor.balance -= transferAmount;
        debtor.balance -= transferAmount;
      }

      if (creditor.balance <= 0.01) i++;
      if (debtor.balance <= 0.01) j++;
    }

    debugLog('Settlements - Final Settlements', settlements);
    return settlements;
  }

  // 🔔 Sottoscrivi ai cambiamenti real-time del gruppo
  subscribeToGroupChanges(groupId, callbacks) {
    const channelName = `group_${groupId}`;

    debugLog('Subscribing to Group Changes', { groupId, channelName });

    // Chiudi sottoscrizione esistente se presente
    if (this.activeSubscriptions.has(channelName)) {
      this.activeSubscriptions.get(channelName).unsubscribe();
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: TABLES.EXPENSES,
          filter: `group_id=eq.${groupId}`,
        },
        (payload) => {
          debugLog('Real-time - Expense Change', payload);
          if (callbacks.onExpenseChange) {
            callbacks.onExpenseChange(payload);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: TABLES.GROUP_MEMBERS,
          filter: `group_id=eq.${groupId}`,
        },
        (payload) => {
          debugLog('Real-time - Member Change', payload);
          if (callbacks.onMemberChange) {
            callbacks.onMemberChange(payload);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: TABLES.EXPENSE_SHARES },
        (payload) => {
          debugLog('Real-time - Share Change', payload);
          if (callbacks.onShareChange) {
            callbacks.onShareChange(payload);
          }
        }
      )
      .subscribe();

    this.activeSubscriptions.set(channelName, channel);

    // Ritorna funzione per unsubscribe
    return () => {
      debugLog('Unsubscribing from Group Changes', { channelName });
      channel.unsubscribe();
      this.activeSubscriptions.delete(channelName);
    };
  }

  // 🛑 Chiudi tutte le sottoscrizioni
  unsubscribeAll() {
    debugLog('Unsubscribing All', { count: this.activeSubscriptions.size });
    this.activeSubscriptions.forEach((channel) => {
      channel.unsubscribe();
    });
    this.activeSubscriptions.clear();
  }

  // 🧪 Test di connettività per il servizio
  async testService() {
    debugLog('Testing Groups Service', 'Starting tests...');

    const tests = {
      authentication: false,
      groupsTable: false,
      membersTable: false,
      expensesTable: false,
    };

    try {
      // Test autenticazione
      const {
        data: { user },
      } = await supabase.auth.getUser();
      tests.authentication = !!user;

      // Test accesso tabelle
      const { error: groupsError } = await supabase
        .from(TABLES.GROUPS)
        .select('count(*)')
        .limit(1);
      tests.groupsTable = !groupsError;

      const { error: membersError } = await supabase
        .from(TABLES.GROUP_MEMBERS)
        .select('count(*)')
        .limit(1);
      tests.membersTable = !membersError;

      const { error: expensesError } = await supabase
        .from(TABLES.EXPENSES)
        .select('count(*)')
        .limit(1);
      tests.expensesTable = !expensesError;
    } catch (error) {
      debugLog('Service Test Error', null, error);
    }

    debugLog('Service Test Results', tests);
    return tests;
  }
}

// Esporta istanza singleton
export const groupsService = new GroupsService();
export default groupsService;
