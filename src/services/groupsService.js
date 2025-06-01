import {
  supabase,
  handleSupabaseError,
  debugLog,
  TABLES,
  ROLES,
  generateInviteCode,
} from '../config/supabase';

class SimplifiedGroupsService {
  // 👥 Crea nuovo gruppo - SEMPLIFICATO
  async createGroup(name, description = '') {
    debugLog('Creating Group (Simplified)', { name });

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error('Utente non autenticato');
      }

      const inviteCode = generateInviteCode();
      
      // Crea gruppo
      const { data: newGroup, error: groupError } = await supabase
        .from(TABLES.GROUPS)
        .insert([{
          name: name.trim(),
          description: description.trim(),
          created_by: user.id,
          invite_code: inviteCode,
        }])
        .select('*')
        .single();

      if (groupError) throw groupError;

      // Aggiungi creatore come admin
      const { error: memberError } = await supabase
        .from(TABLES.GROUP_MEMBERS)
        .insert([{
          group_id: newGroup.id,
          user_id: user.id,
          role: ROLES.ADMIN,
        }]);

      if (memberError) throw memberError;

      return {
        success: true,
        group: newGroup,
        message: 'Gruppo creato con successo!',
      };
    } catch (error) {
      return {
        success: false,
        error: handleSupabaseError(error),
      };
    }
  }

  // 📋 Ottieni gruppi utente - QUERY SEMPLIFICATA
  async getUserGroups() {
    debugLog('Getting User Groups (Simplified)');

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error('Utente non autenticato');
      }

      // Query diretta con join semplificato
      const { data: groupData, error } = await supabase
        .from('user_groups_view')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        // Fallback su query manuale se la view non esiste
        return this.getUserGroupsManual(user.id);
      }

      return {
        success: true,
        groups: groupData || [],
      };
    } catch (error) {
      return {
        success: false,
        error: handleSupabaseError(error),
      };
    }
  }

  // Fallback manuale se la view non esiste
  async getUserGroupsManual(userId) {
    try {
      // 1. Ottieni membri
      const { data: memberGroups, error: memberError } = await supabase
        .from(TABLES.GROUP_MEMBERS)
        .select('group_id, role')
        .eq('user_id', userId);

      if (memberError) throw memberError;

      if (!memberGroups || memberGroups.length === 0) {
        return { success: true, groups: [] };
      }

      const groupIds = memberGroups.map(mg => mg.group_id);

      // 2. Ottieni gruppi
      const { data: groups, error: groupsError } = await supabase
        .from(TABLES.GROUPS)
        .select('*')
        .in('id', groupIds);

      if (groupsError) throw groupsError;

      // 3. Aggiungi statistiche semplici
      const groupsWithStats = await Promise.all(
        groups.map(async (group) => {
          // Conta membri
          const { count: memberCount } = await supabase
            .from(TABLES.GROUP_MEMBERS)
            .select('*', { count: 'exact', head: true })
            .eq('group_id', group.id);

          // Conta spese
          const { count: expenseCount } = await supabase
            .from(TABLES.EXPENSES)
            .select('*', { count: 'exact', head: true })
            .eq('group_id', group.id);

          // Somma totale spese
          const { data: expenses } = await supabase
            .from(TABLES.EXPENSES)
            .select('total_amount')
            .eq('group_id', group.id);

          const totalAmount = expenses?.reduce((sum, exp) => 
            sum + parseFloat(exp.total_amount), 0) || 0;

          const userRole = memberGroups.find(mg => mg.group_id === group.id)?.role || 'member';

          return {
            ...group,
            memberCount: memberCount || 0,
            expenseCount: expenseCount || 0,
            totalAmount,
            userRole,
          };
        })
      );

      return {
        success: true,
        groups: groupsWithStats,
      };
    } catch (error) {
      return {
        success: false,
        error: handleSupabaseError(error),
      };
    }
  }

  // 🔍 Ottieni dettagli gruppo - SEMPLIFICATO
  async getGroupDetails(groupId) {
    debugLog('Getting Group Details (Simplified)', { groupId });

    try {
      const { data: group, error: groupError } = await supabase
        .from(TABLES.GROUPS)
        .select('*')
        .eq('id', groupId)
        .single();

      if (groupError) throw groupError;

      const { data: members, error: membersError } = await supabase
        .from(TABLES.GROUP_MEMBERS)
        .select('user_id, role, joined_at')
        .eq('group_id', groupId);

      if (membersError) {
        console.warn('Could not load members:', membersError);
      }

      return {
        success: true,
        group: {
          ...group,
          group_members: members || [],
        },
      };
    } catch (error) {
      return {
        success: false,
        error: handleSupabaseError(error),
      };
    }
  }

  // 🎯 Unisciti a gruppo - MIGLIORATO
  async joinGroupByInviteCode(inviteCode) {
    debugLog('Joining Group (Simplified)', { inviteCode });

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error('Utente non autenticato');
      }

      // Trova gruppo
      const { data: group, error: groupError } = await supabase
        .from(TABLES.GROUPS)
        .select('*')
        .eq('invite_code', inviteCode.toUpperCase())
        .single();

      if (groupError) {
        if (groupError.code === 'PGRST116') {
          throw new Error('Codice invito non valido o scaduto');
        }
        throw groupError;
      }

      // Verifica se già membro
      const { data: existingMember } = await supabase
        .from(TABLES.GROUP_MEMBERS)
        .select('*')
        .eq('group_id', group.id)
        .eq('user_id', user.id)
        .single();

      if (existingMember) {
        return {
          success: false,
          error: 'Sei già membro di questo gruppo!',
        };
      }

      // Aggiungi membro
      const { error: memberError } = await supabase
        .from(TABLES.GROUP_MEMBERS)
        .insert([{
          group_id: group.id,
          user_id: user.id,
          role: ROLES.MEMBER,
        }]);

      if (memberError) throw memberError;

      return {
        success: true,
        group: group,
        message: `Ti sei unito al gruppo "${group.name}"! 🎉`,
      };
    } catch (error) {
      return {
        success: false,
        error: handleSupabaseError(error),
      };
    }
  }

  // 💰 Crea spesa - ULTRA SEMPLIFICATO
  async createExpense(groupId, expenseData) {
    debugLog('Creating Expense (Simplified)', { groupId, expenseData });

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error('Utente non autenticato');
      }

      // Verifica membership
      const { data: member } = await supabase
        .from(TABLES.GROUP_MEMBERS)
        .select('*')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .single();

      if (!member) {
        throw new Error('Non sei membro di questo gruppo');
      }

      // Crea spesa
      const { data: expense, error: expenseError } = await supabase
        .from(TABLES.EXPENSES)
        .insert([{
          group_id: groupId,
          created_by: user.id,
          title: expenseData.title.trim(),
          description: expenseData.description?.trim() || '',
          total_amount: parseFloat(expenseData.totalAmount),
          location: expenseData.location?.trim() || '',
          expense_date: new Date().toISOString().split('T')[0],
        }])
        .select('*')
        .single();

      if (expenseError) throw expenseError;

      // Crea consumi solo se presenti
      if (expenseData.shares && Object.keys(expenseData.shares).length > 0) {
        const shares = Object.entries(expenseData.shares)
          .filter(([_, amount]) => parseFloat(amount) > 0)
          .map(([userId, amount]) => ({
            expense_id: expense.id,
            user_id: userId,
            amount_consumed: parseFloat(amount),
          }));

        if (shares.length > 0) {
          const { error: sharesError } = await supabase
            .from(TABLES.EXPENSE_SHARES)
            .insert(shares);

          if (sharesError) {
            console.warn('Shares error (non-critical):', sharesError);
          }
        }
      }

      return {
        success: true,
        expense: expense,
        message: 'Spesa aggiunta! 💰',
      };
    } catch (error) {
      return {
        success: false,
        error: handleSupabaseError(error),
      };
    }
  }

  // 📋 Ottieni spese gruppo - SEMPLIFICATO
  async getGroupExpenses(groupId) {
    debugLog('Getting Group Expenses (Simplified)', { groupId });

    try {
      const { data: expenses, error: expensesError } = await supabase
        .from(TABLES.EXPENSES)
        .select(`
          *,
          expense_shares (
            user_id,
            amount_consumed
          )
        `)
        .eq('group_id', groupId)
        .order('created_at', { ascending: false })
        .limit(20); // Limita per performance

      if (expensesError) throw expensesError;

      return {
        success: true,
        expenses: expenses || [],
      };
    } catch (error) {
      // Fallback senza join se non funziona
      try {
        const { data: expenses, error } = await supabase
          .from(TABLES.EXPENSES)
          .select('*')
          .eq('group_id', groupId)
          .order('created_at', { ascending: false })
          .limit(20);

        if (error) throw error;

        // Carica shares separatamente
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

        return {
          success: true,
          expenses: expensesWithShares,
        };
      } catch (fallbackError) {
        return {
          success: false,
          error: handleSupabaseError(fallbackError),
        };
      }
    }
  }

  // 🧮 Calcola bilanci - SEMPLIFICATO
  async calculateGroupBalances(groupId) {
    debugLog('Calculating Balances (Simplified)', { groupId });

    try {
      // Prova con view se esiste
      const { data: balances, error } = await supabase
        .from('user_group_balances')
        .select('*')
        .eq('group_id', groupId);

      if (error) {
        // Fallback su calcolo manuale
        return this.calculateBalancesManual(groupId);
      }

      const settlements = this.calculateOptimalSettlements(balances || []);

      return {
        success: true,
        balances: balances || [],
        settlements: settlements,
      };
    } catch (error) {
      return {
        success: false,
        error: handleSupabaseError(error),
      };
    }
  }

  // Calcolo manuale se la view non esiste
  async calculateBalancesManual(groupId) {
    try {
      // Ottieni membri
      const { data: members } = await supabase
        .from(TABLES.GROUP_MEMBERS)
        .select('user_id')
        .eq('group_id', groupId);

      if (!members) return { success: true, balances: [], settlements: [] };

      const balances = await Promise.all(
        members.map(async (member) => {
          // Calcola totale pagato
          const { data: paidExpenses } = await supabase
            .from(TABLES.EXPENSES)
            .select('total_amount')
            .eq('group_id', groupId)
            .eq('created_by', member.user_id);

          const totalPaid = paidExpenses?.reduce((sum, exp) => 
            sum + parseFloat(exp.total_amount), 0) || 0;

          // Calcola totale consumato
          const { data: consumedShares } = await supabase
            .from(TABLES.EXPENSE_SHARES)
            .select('amount_consumed, expenses!inner(group_id)')
            .eq('user_id', member.user_id)
            .eq('expenses.group_id', groupId);

          const totalConsumed = consumedShares?.reduce((sum, share) => 
            sum + parseFloat(share.amount_consumed), 0) || 0;

          const balance = totalPaid - totalConsumed;

          return {
            user_id: member.user_id,
            group_id: groupId,
            total_paid: totalPaid.toString(),
            total_consumed: totalConsumed.toString(),
            balance: balance.toString(),
            full_name: 'Utente', // Placeholder
            email: 'user@example.com', // Placeholder
          };
        })
      );

      const settlements = this.calculateOptimalSettlements(balances);

      return {
        success: true,
        balances: balances,
        settlements: settlements,
      };
    } catch (error) {
      return {
        success: false,
        error: handleSupabaseError(error),
      };
    }
  }

  // 🔄 Calcola regolamenti - ALGORITMO SEMPLIFICATO
  calculateOptimalSettlements(balances) {
    if (!balances || balances.length === 0) return [];

    const creditors = balances
      .filter(b => parseFloat(b.balance) > 0.01)
      .map(b => ({ ...b, balance: parseFloat(b.balance) }))
      .sort((a, b) => b.balance - a.balance);

    const debtors = balances
      .filter(b => parseFloat(b.balance) < -0.01)
      .map(b => ({ ...b, balance: Math.abs(parseFloat(b.balance)) }))
      .sort((a, b) => b.balance - a.balance);

    const settlements = [];
    let i = 0, j = 0;

    while (i < creditors.length && j < debtors.length) {
      const creditor = creditors[i];
      const debtor = debtors[j];

      const transferAmount = Math.min(creditor.balance, debtor.balance);

      if (transferAmount > 0.01) {
        settlements.push({
          from: debtor.full_name || 'Utente',
          fromUserId: debtor.user_id,
          to: creditor.full_name || 'Utente',
          toUserId: creditor.user_id,
          amount: transferAmount,
        });

        creditor.balance -= transferAmount;
        debtor.balance -= transferAmount;
      }

      if (creditor.balance <= 0.01) i++;
      if (debtor.balance <= 0.01) j++;
    }

    return settlements;
  }

  // 🧪 Test semplificato
  async testService() {
    debugLog('Testing Simplified Service');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const authenticated = !!user;

      // Test query semplici
      const { error: groupsError } = await supabase
        .from(TABLES.GROUPS)
        .select('count(*)')
        .limit(1);

      const { error: membersError } = await supabase
        .from(TABLES.GROUP_MEMBERS)
        .select('count(*)')
        .limit(1);

      return {
        authenticated,
        groupsTable: !groupsError,
        membersTable: !membersError,
        overall: authenticated && !groupsError && !membersError,
      };
    } catch (error) {
      console.error('Service test error:', error);
      return { overall: false };
    }
  }
}

// Esporta istanza singleton
export const groupsService = new SimplifiedGroupsService();
export default groupsService;
