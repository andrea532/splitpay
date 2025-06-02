import { supabase, debugLog, handleSupabaseError } from '../config/supabase';

export const groupsService = {
  // 🔍 Get all user groups
  async getUserGroups() {
    try {
      debugLog('Getting user groups');

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Utente non autenticato' };
      }

      // Get groups where user is a member
      const { data: memberships, error: membershipError } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id);

      if (membershipError) {
        debugLog('Error getting memberships', null, membershipError);
        return { success: false, error: handleSupabaseError(membershipError) };
      }

      if (!memberships || memberships.length === 0) {
        return { success: true, groups: [] };
      }

      const groupIds = memberships.map((m) => m.group_id);

      // Get groups with basic info
      const { data: groups, error } = await supabase
        .from('groups')
        .select('*')
        .in('id', groupIds)
        .order('created_at', { ascending: false });

      if (error) {
        debugLog('Error getting groups', null, error);
        return { success: false, error: handleSupabaseError(error) };
      }

      // Get member counts and expense stats for each group
      const groupsWithStats = await Promise.all(
        groups.map(async (group) => {
          // Get member count
          const { count: memberCount } = await supabase
            .from('group_members')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', group.id);

          // Get expense stats
          const { data: expenses } = await supabase
            .from('expenses')
            .select('id, total_amount')
            .eq('group_id', group.id);

          return {
            ...group,
            memberCount: memberCount || 0,
            expenseCount: expenses?.length || 0,
            totalAmount:
              expenses?.reduce(
                (sum, expense) => sum + parseFloat(expense.total_amount || 0),
                0
              ) || 0,
          };
        })
      );

      debugLog('User groups loaded', { count: groupsWithStats.length });
      return { success: true, groups: groupsWithStats };
    } catch (error) {
      debugLog('Unexpected error getting user groups', null, error);
      return { success: false, error: error.message };
    }
  },

  // 🎯 Get single group with members
  async getGroupWithMembers(groupId) {
    try {
      debugLog('Getting group with members', { groupId });

      // First get the group
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .single();

      if (groupError) {
        debugLog('Error getting group', null, groupError);
        return { success: false, error: handleSupabaseError(groupError) };
      }

      // Then get members with their profiles
      const { data: members, error: membersError } = await supabase
        .from('group_members')
        .select(
          `
          user_id,
          role,
          joined_at
        `
        )
        .eq('group_id', groupId);

      if (membersError) {
        debugLog('Error getting members', null, membersError);
        return { success: false, error: handleSupabaseError(membersError) };
      }

      // Get profiles for all members
      const memberIds = members.map((m) => m.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', memberIds);

      if (profilesError) {
        debugLog('Error getting profiles', null, profilesError);
      }

      // Merge profiles with members
      const membersWithProfiles = members.map((member) => ({
        ...member,
        profiles: profiles?.find((p) => p.id === member.user_id) || null,
      }));

      // Add members to group object
      group.group_members = membersWithProfiles;

      debugLog('Group loaded', { groupName: group.name });
      return { success: true, group };
    } catch (error) {
      debugLog('Unexpected error getting group', null, error);
      return { success: false, error: error.message };
    }
  },

  // ➕ Create new group
  async createGroup(name, description = '') {
    try {
      debugLog('Creating new group', { name, description });

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Utente non autenticato' };
      }

      // Generate invite code
      const inviteCode = Math.random()
        .toString(36)
        .substring(2, 10)
        .toUpperCase();

      // Create the group
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .insert({
          name,
          description,
          created_by: user.id,
          invite_code: inviteCode,
        })
        .select()
        .single();

      if (groupError) {
        debugLog('Error creating group', null, groupError);
        return { success: false, error: handleSupabaseError(groupError) };
      }

      // Add creator as admin member
      const { error: memberError } = await supabase
        .from('group_members')
        .insert({
          group_id: group.id,
          user_id: user.id,
          role: 'admin',
        });

      if (memberError) {
        debugLog('Error adding creator as member', null, memberError);
        // Rollback group creation
        await supabase.from('groups').delete().eq('id', group.id);
        return { success: false, error: handleSupabaseError(memberError) };
      }

      debugLog('Group created successfully', { groupId: group.id });
      return { success: true, group };
    } catch (error) {
      debugLog('Unexpected error creating group', null, error);
      return { success: false, error: error.message };
    }
  },

  // 🔗 Join group by invite code
  async joinGroupByInviteCode(inviteCode) {
    try {
      debugLog('Joining group by invite code', { inviteCode });

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Utente non autenticato' };
      }

      // Find group by invite code
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .select('id, name')
        .eq('invite_code', inviteCode.toUpperCase())
        .single();

      if (groupError || !group) {
        debugLog('Group not found', { inviteCode });
        return { success: false, error: 'Codice invito non valido' };
      }

      // Check if already a member
      const { data: existingMember } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', group.id)
        .eq('user_id', user.id)
        .single();

      if (existingMember) {
        return { success: false, error: 'Sei già membro di questo gruppo' };
      }

      // Add user as member
      const { error: memberError } = await supabase
        .from('group_members')
        .insert({
          group_id: group.id,
          user_id: user.id,
          role: 'member',
        });

      if (memberError) {
        debugLog('Error joining group', null, memberError);
        return { success: false, error: handleSupabaseError(memberError) };
      }

      debugLog('Successfully joined group', { groupId: group.id });
      return { success: true, group };
    } catch (error) {
      debugLog('Unexpected error joining group', null, error);
      return { success: false, error: error.message };
    }
  },

  // 🗑️ Delete group (only admin/creator can delete)
  async deleteGroup(groupId) {
    try {
      debugLog('Deleting group', { groupId });

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Utente non autenticato' };
      }

      // Check if user is the creator
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .select('created_by')
        .eq('id', groupId)
        .single();

      if (groupError || !group) {
        return { success: false, error: 'Gruppo non trovato' };
      }

      if (group.created_by !== user.id) {
        return {
          success: false,
          error: 'Solo il creatore può eliminare il gruppo',
        };
      }

      // Get all expense IDs for this group first
      const { data: expenses, error: expensesQueryError } = await supabase
        .from('expenses')
        .select('id')
        .eq('group_id', groupId);

      if (expensesQueryError) {
        debugLog('Error querying expenses', null, expensesQueryError);
      }

      // Delete expense shares if there are expenses
      if (expenses && expenses.length > 0) {
        const expenseIds = expenses.map((e) => e.id);
        const { error: sharesError } = await supabase
          .from('expense_shares')
          .delete()
          .in('expense_id', expenseIds);

        if (sharesError) {
          debugLog('Error deleting expense shares', null, sharesError);
        }
      }

      // Delete expenses
      const { error: expensesError } = await supabase
        .from('expenses')
        .delete()
        .eq('group_id', groupId);

      if (expensesError) {
        debugLog('Error deleting expenses', null, expensesError);
      }

      // Delete group members
      const { error: membersError } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId);

      if (membersError) {
        debugLog('Error deleting group members', null, membersError);
      }

      // Finally delete the group
      const { error: deleteError } = await supabase
        .from('groups')
        .delete()
        .eq('id', groupId);

      if (deleteError) {
        debugLog('Error deleting group', null, deleteError);
        return { success: false, error: handleSupabaseError(deleteError) };
      }

      debugLog('Group deleted successfully', { groupId });
      return { success: true };
    } catch (error) {
      debugLog('Unexpected error deleting group', null, error);
      return { success: false, error: error.message };
    }
  },

  // 💸 Create expense
  async createExpense(groupId, expenseData) {
    try {
      debugLog('Creating expense', { groupId, expenseData });

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Utente non autenticato' };
      }

      // Destructure expense data
      const { title, description, totalAmount, shares } = expenseData;

      // Validate shares
      const totalShares = Object.values(shares).reduce((sum, amount) => {
        const num = parseFloat(amount);
        return sum + (isNaN(num) ? 0 : num);
      }, 0);

      if (Math.abs(totalShares - parseFloat(totalAmount)) > 0.01) {
        return {
          success: false,
          error: "Il totale dei consumi deve essere uguale all'importo totale",
        };
      }

      // Create the expense
      const { data: expense, error: expenseError } = await supabase
        .from('expenses')
        .insert({
          group_id: groupId,
          title,
          description,
          total_amount: totalAmount,
          created_by: user.id,
          expense_date: new Date().toISOString(),
        })
        .select()
        .single();

      if (expenseError) {
        debugLog('Error creating expense', null, expenseError);
        return { success: false, error: handleSupabaseError(expenseError) };
      }

      // Create expense shares
      const shareInserts = Object.entries(shares)
        .filter(([_, amount]) => parseFloat(amount) > 0)
        .map(([userId, amount]) => ({
          expense_id: expense.id,
          user_id: userId,
          amount_consumed: amount,
        }));

      if (shareInserts.length > 0) {
        const { error: sharesError } = await supabase
          .from('expense_shares')
          .insert(shareInserts);

        if (sharesError) {
          debugLog('Error creating expense shares', null, sharesError);
          // Rollback expense creation
          await supabase.from('expenses').delete().eq('id', expense.id);
          return { success: false, error: handleSupabaseError(sharesError) };
        }
      }

      debugLog('Expense created successfully', { expenseId: expense.id });
      return { success: true, expense };
    } catch (error) {
      debugLog('Unexpected error creating expense', null, error);
      return { success: false, error: error.message };
    }
  },

  // 🗑️ Delete expense
  async deleteExpense(expenseId) {
    try {
      debugLog('Deleting expense', { expenseId });

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Utente non autenticato' };
      }

      // Check if user created the expense
      const { data: expense, error: expenseError } = await supabase
        .from('expenses')
        .select('created_by')
        .eq('id', expenseId)
        .single();

      if (expenseError || !expense) {
        return { success: false, error: 'Spesa non trovata' };
      }

      if (expense.created_by !== user.id) {
        return {
          success: false,
          error: 'Solo chi ha creato la spesa può eliminarla',
        };
      }

      // Delete expense shares first
      const { error: sharesError } = await supabase
        .from('expense_shares')
        .delete()
        .eq('expense_id', expenseId);

      if (sharesError) {
        debugLog('Error deleting expense shares', null, sharesError);
        return { success: false, error: handleSupabaseError(sharesError) };
      }

      // Delete the expense
      const { error: deleteError } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseId);

      if (deleteError) {
        debugLog('Error deleting expense', null, deleteError);
        return { success: false, error: handleSupabaseError(deleteError) };
      }

      debugLog('Expense deleted successfully', { expenseId });
      return { success: true };
    } catch (error) {
      debugLog('Unexpected error deleting expense', null, error);
      return { success: false, error: error.message };
    }
  },

  // 📊 Get group expenses
  async getGroupExpenses(groupId) {
    try {
      debugLog('Getting group expenses', { groupId });

      const { data: expenses, error } = await supabase
        .from('expenses')
        .select(
          `
          *,
          expense_shares(
            user_id,
            amount_consumed
          )
        `
        )
        .eq('group_id', groupId)
        .order('expense_date', { ascending: false });

      if (error) {
        debugLog('Error getting expenses', null, error);
        return { success: false, error: handleSupabaseError(error) };
      }

      debugLog('Expenses loaded', { count: expenses.length });
      return { success: true, expenses };
    } catch (error) {
      debugLog('Unexpected error getting expenses', null, error);
      return { success: false, error: error.message };
    }
  },

  // 💰 Calculate group balances
  async calculateGroupBalances(groupId) {
    try {
      debugLog('Calculating group balances', { groupId });

      // Get group with members
      const groupResult = await this.getGroupWithMembers(groupId);
      if (!groupResult.success) {
        return groupResult;
      }

      // Get all expenses
      const expensesResult = await this.getGroupExpenses(groupId);
      if (!expensesResult.success) {
        return expensesResult;
      }

      const { group } = groupResult;
      const { expenses } = expensesResult;

      // Calculate balances for each member
      const memberBalances = {};

      // Initialize balances for all members
      group.group_members.forEach((member) => {
        memberBalances[member.user_id] = {
          user_id: member.user_id,
          full_name: member.profiles?.full_name || 'Membro',
          total_paid: 0,
          total_consumed: 0,
          balance: 0,
        };
      });

      // Calculate totals
      expenses.forEach((expense) => {
        // Add to total paid for the payer
        if (memberBalances[expense.created_by]) {
          memberBalances[expense.created_by].total_paid += parseFloat(
            expense.total_amount
          );
        }

        // Add to total consumed for each sharer
        expense.expense_shares.forEach((share) => {
          if (memberBalances[share.user_id]) {
            memberBalances[share.user_id].total_consumed += parseFloat(
              share.amount_consumed
            );
          }
        });
      });

      // Calculate final balances
      Object.values(memberBalances).forEach((member) => {
        member.balance = member.total_paid - member.total_consumed;
      });

      // Calculate settlements (chi deve pagare chi)
      const settlements = this.calculateSettlements(
        Object.values(memberBalances)
      );

      debugLog('Balances calculated', {
        members: Object.keys(memberBalances).length,
        settlements: settlements.length,
      });

      return {
        success: true,
        balances: Object.values(memberBalances),
        settlements,
      };
    } catch (error) {
      debugLog('Unexpected error calculating balances', null, error);
      return { success: false, error: error.message };
    }
  },

  // 🧮 Calculate settlements algorithm
  calculateSettlements(balances) {
    const settlements = [];
    const creditors = [];
    const debtors = [];

    // Separate creditors and debtors
    balances.forEach((member) => {
      if (member.balance > 0.01) {
        creditors.push({ ...member, amount: member.balance });
      } else if (member.balance < -0.01) {
        debtors.push({ ...member, amount: Math.abs(member.balance) });
      }
    });

    // Sort by amount (descending)
    creditors.sort((a, b) => b.amount - a.amount);
    debtors.sort((a, b) => b.amount - a.amount);

    // Calculate settlements
    let i = 0,
      j = 0;
    while (i < creditors.length && j < debtors.length) {
      const creditor = creditors[i];
      const debtor = debtors[j];
      const amount = Math.min(creditor.amount, debtor.amount);

      if (amount > 0.01) {
        settlements.push({
          from: debtor.full_name,
          fromUserId: debtor.user_id,
          to: creditor.full_name,
          toUserId: creditor.user_id,
          amount: amount,
        });
      }

      creditor.amount -= amount;
      debtor.amount -= amount;

      if (creditor.amount < 0.01) i++;
      if (debtor.amount < 0.01) j++;
    }

    return settlements;
  },

  // 🔄 Subscribe to real-time changes
  subscribeToGroupChanges(groupId, callbacks) {
    debugLog('Setting up real-time subscription', { groupId });

    const channel = supabase
      .channel(`group_${groupId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'expenses',
          filter: `group_id=eq.${groupId}`,
        },
        (payload) => {
          debugLog('Expense change detected', payload);
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
          table: 'group_members',
          filter: `group_id=eq.${groupId}`,
        },
        (payload) => {
          debugLog('Member change detected', payload);
          if (callbacks.onMemberChange) {
            callbacks.onMemberChange(payload);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'expense_shares',
        },
        (payload) => {
          debugLog('Share change detected', payload);
          if (callbacks.onShareChange) {
            callbacks.onShareChange(payload);
          }
        }
      )
      .subscribe();

    // Return unsubscribe function
    return () => {
      debugLog('Unsubscribing from real-time changes', { groupId });
      supabase.removeChannel(channel);
    };
  },
};
