import { supabase, debugLog, handleSupabaseError } from '../config/supabase';

export const consumptionsService = {
  // 📝 Aggiungi un consumo personale
  async addConsumption(groupId, description, amount, category = 'general') {
    try {
      debugLog('Adding consumption', {
        groupId,
        description,
        amount,
        category,
      });

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Utente non autenticato' };
      }

      const { data, error } = await supabase
        .from('consumptions')
        .insert({
          group_id: groupId,
          user_id: user.id,
          description,
          amount,
          category,
        })
        .select()
        .single();

      if (error) {
        debugLog('Error adding consumption', null, error);
        return { success: false, error: handleSupabaseError(error) };
      }

      debugLog('Consumption added successfully', { consumptionId: data.id });
      return { success: true, consumption: data };
    } catch (error) {
      debugLog('Unexpected error adding consumption', null, error);
      return { success: false, error: error.message };
    }
  },

  // 📊 Ottieni tutti i consumi non saldati di un gruppo
  async getGroupConsumptions(groupId, includeSettled = false) {
    try {
      debugLog('Getting group consumptions', { groupId, includeSettled });

      let query = supabase
        .from('consumptions')
        .select(
          `
          *,
          profiles!consumptions_user_id_fkey(
            full_name,
            email
          )
        `
        )
        .eq('group_id', groupId)
        .order('created_at', { ascending: false });

      if (!includeSettled) {
        query = query.eq('is_settled', false);
      }

      const { data, error } = await query;

      if (error) {
        debugLog('Error getting consumptions', null, error);
        // Se c'è un errore di join, proviamo senza il join
        const { data: consumptionsOnly, error: secondError } = await supabase
          .from('consumptions')
          .select('*')
          .eq('group_id', groupId)
          .eq('is_settled', includeSettled ? undefined : false)
          .order('created_at', { ascending: false });

        if (secondError) {
          return { success: false, error: handleSupabaseError(secondError) };
        }

        return { success: true, consumptions: consumptionsOnly || [] };
      }

      debugLog('Consumptions loaded', { count: data?.length || 0 });
      return { success: true, consumptions: data || [] };
    } catch (error) {
      debugLog('Unexpected error getting consumptions', null, error);
      return { success: false, error: error.message };
    }
  },

  // 📈 Ottieni il sommario dei consumi per utente
  async getConsumptionSummary(groupId) {
    try {
      debugLog('Getting consumption summary', { groupId });

      const { data, error } = await supabase.rpc('get_consumption_summary', {
        p_group_id: groupId,
      });

      if (error) {
        debugLog('Error getting summary', null, error);
        // Fallback manuale se la funzione non esiste
        const { data: consumptions } = await this.getGroupConsumptions(groupId);

        if (consumptions?.consumptions) {
          const summary = {};
          consumptions.consumptions.forEach((c) => {
            if (!summary[c.user_id]) {
              summary[c.user_id] = {
                user_id: c.user_id,
                full_name: c.profiles?.full_name || 'Utente',
                items_count: 0,
                total_amount: 0,
              };
            }
            summary[c.user_id].items_count++;
            summary[c.user_id].total_amount += parseFloat(c.amount);
          });

          return {
            success: true,
            summary: Object.values(summary),
          };
        }

        return { success: false, error: 'Impossibile calcolare il sommario' };
      }

      debugLog('Summary loaded', { users: data?.length || 0 });
      return { success: true, summary: data || [] };
    } catch (error) {
      debugLog('Unexpected error getting summary', null, error);
      return { success: false, error: error.message };
    }
  },

  // ✏️ Modifica un consumo
  async updateConsumption(consumptionId, updates) {
    try {
      debugLog('Updating consumption', { consumptionId, updates });

      const { data, error } = await supabase
        .from('consumptions')
        .update(updates)
        .eq('id', consumptionId)
        .eq('is_settled', false) // Solo consumi non saldati
        .select()
        .single();

      if (error) {
        debugLog('Error updating consumption', null, error);
        return { success: false, error: handleSupabaseError(error) };
      }

      debugLog('Consumption updated successfully');
      return { success: true, consumption: data };
    } catch (error) {
      debugLog('Unexpected error updating consumption', null, error);
      return { success: false, error: error.message };
    }
  },

  // 🗑️ Elimina un consumo
  async deleteConsumption(consumptionId) {
    try {
      debugLog('Deleting consumption', { consumptionId });

      const { error } = await supabase
        .from('consumptions')
        .delete()
        .eq('id', consumptionId)
        .eq('is_settled', false); // Solo consumi non saldati

      if (error) {
        debugLog('Error deleting consumption', null, error);
        return { success: false, error: handleSupabaseError(error) };
      }

      debugLog('Consumption deleted successfully');
      return { success: true };
    } catch (error) {
      debugLog('Unexpected error deleting consumption', null, error);
      return { success: false, error: error.message };
    }
  },

  // 💰 Salda il conto (quando qualcuno paga)
  async settleConsumptions(
    groupId,
    paidBy,
    totalAmount,
    description = 'Pagamento conto'
  ) {
    try {
      debugLog('Settling consumptions', { groupId, paidBy, totalAmount });

      const { data, error } = await supabase.rpc('create_settlement', {
        p_group_id: groupId,
        p_paid_by: paidBy,
        p_total_amount: totalAmount,
        p_description: description,
      });

      if (error) {
        debugLog('Error settling consumptions', null, error);

        // Fallback: crea manualmente se la funzione non esiste
        if (error.message.includes('function') || error.code === '42883') {
          return this.manualSettle(groupId, paidBy, totalAmount, description);
        }

        return { success: false, error: handleSupabaseError(error) };
      }

      debugLog('Consumptions settled successfully', { expenseId: data });
      return { success: true, expenseId: data };
    } catch (error) {
      debugLog('Unexpected error settling consumptions', null, error);
      return { success: false, error: error.message };
    }
  },

  // 🔧 Fallback manuale per il settlement
  async manualSettle(groupId, paidBy, totalAmount, description) {
    try {
      debugLog('Manual settlement', { groupId, paidBy, totalAmount });

      // 1. Ottieni tutti i consumi non saldati
      const { data: consumptions, error: consumptionsError } = await supabase
        .from('consumptions')
        .select('*')
        .eq('group_id', groupId)
        .eq('is_settled', false);

      if (consumptionsError || !consumptions?.length) {
        return {
          success: false,
          error: 'Nessun consumo da saldare',
        };
      }

      // 2. Calcola i totali per utente
      const userTotals = {};
      consumptions.forEach((c) => {
        if (!userTotals[c.user_id]) {
          userTotals[c.user_id] = 0;
        }
        userTotals[c.user_id] += parseFloat(c.amount);
      });

      // 3. Crea la spesa principale
      const { data: expense, error: expenseError } = await supabase
        .from('expenses')
        .insert({
          group_id: groupId,
          title: 'Saldo conto',
          description: description,
          total_amount: totalAmount,
          created_by: paidBy,
          expense_type: 'settlement',
        })
        .select()
        .single();

      if (expenseError) {
        return { success: false, error: handleSupabaseError(expenseError) };
      }

      // 4. Crea gli shares
      const shares = Object.entries(userTotals).map(([userId, amount]) => ({
        expense_id: expense.id,
        user_id: userId,
        amount_consumed: amount,
      }));

      const { error: sharesError } = await supabase
        .from('expense_shares')
        .insert(shares);

      if (sharesError) {
        // Rollback: elimina la spesa
        await supabase.from('expenses').delete().eq('id', expense.id);
        return { success: false, error: handleSupabaseError(sharesError) };
      }

      // 5. Marca i consumi come saldati
      const { error: updateError } = await supabase
        .from('consumptions')
        .update({
          is_settled: true,
          settled_in_expense: expense.id,
        })
        .eq('group_id', groupId)
        .eq('is_settled', false);

      if (updateError) {
        debugLog('Error updating consumptions status', null, updateError);
      }

      return { success: true, expenseId: expense.id };
    } catch (error) {
      debugLog('Unexpected error in manual settle', null, error);
      return { success: false, error: error.message };
    }
  },

  // 🔄 Sottoscrivi ai cambiamenti real-time
  subscribeToConsumptions(groupId, callback) {
    debugLog('Setting up consumption subscription', { groupId });

    const channel = supabase
      .channel(`consumptions_${groupId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'consumptions',
          filter: `group_id=eq.${groupId}`,
        },
        (payload) => {
          debugLog('Consumption change detected', payload);
          if (callback) {
            callback(payload);
          }
        }
      )
      .subscribe();

    // Return unsubscribe function
    return () => {
      debugLog('Unsubscribing from consumptions', { groupId });
      supabase.removeChannel(channel);
    };
  },

  // 📊 Ottieni statistiche sui consumi
  async getConsumptionStats(groupId) {
    try {
      const { data: pending } = await supabase
        .from('group_pending_consumptions')
        .select('*')
        .eq('group_id', groupId)
        .single();

      return {
        success: true,
        stats: pending || {
          users_count: 0,
          items_count: 0,
          total_amount: 0,
          last_consumption: null,
        },
      };
    } catch (error) {
      return {
        success: true,
        stats: {
          users_count: 0,
          items_count: 0,
          total_amount: 0,
          last_consumption: null,
        },
      };
    }
  },
};
