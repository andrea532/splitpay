import { supabase, debugLog, handleSupabaseError } from '../config/supabase';

export const authService = {
  // 🔐 Sign up new user
  async signUp(email, password, fullName) {
    try {
      debugLog('Sign up attempt', { email, fullName });

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        debugLog('Sign up error', null, error);
        return { success: false, error: handleSupabaseError(error) };
      }

      // Create profile in profiles table
      if (data.user) {
        const { error: profileError } = await supabase.from('profiles').insert({
          id: data.user.id,
          email: data.user.email,
          full_name: fullName,
        });

        if (profileError) {
          debugLog('Profile creation error', null, profileError);
          // Non fallire la registrazione se il profilo esiste già
          if (!profileError.message.includes('duplicate')) {
            console.error('Error creating profile:', profileError);
          }
        }
      }

      debugLog('Sign up successful', { userId: data.user?.id });
      return {
        success: true,
        user: data.user,
        message:
          'Registrazione completata! Controlla la tua email per confermare.',
      };
    } catch (error) {
      debugLog('Unexpected sign up error', null, error);
      return { success: false, error: error.message };
    }
  },

  // 🔑 Sign in existing user
  async signIn(email, password) {
    try {
      debugLog('Sign in attempt', { email });

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        debugLog('Sign in error', null, error);
        return { success: false, error: handleSupabaseError(error) };
      }

      debugLog('Sign in successful', { userId: data.user?.id });
      return { success: true, user: data.user };
    } catch (error) {
      debugLog('Unexpected sign in error', null, error);
      return { success: false, error: error.message };
    }
  },

  // 🚪 Sign out user
  async signOut() {
    try {
      debugLog('Sign out attempt');

      const { error } = await supabase.auth.signOut();

      if (error) {
        debugLog('Sign out error', null, error);
        return { success: false, error: handleSupabaseError(error) };
      }

      debugLog('Sign out successful');
      return { success: true };
    } catch (error) {
      debugLog('Unexpected sign out error', null, error);
      return { success: false, error: error.message };
    }
  },

  // 🔄 Reset password
  async resetPassword(email) {
    try {
      debugLog('Password reset attempt', { email });

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        debugLog('Password reset error', null, error);
        return { success: false, error: handleSupabaseError(error) };
      }

      debugLog('Password reset email sent', { email });
      return {
        success: true,
        message:
          'Email di recupero inviata! Controlla la tua casella di posta.',
      };
    } catch (error) {
      debugLog('Unexpected password reset error', null, error);
      return { success: false, error: error.message };
    }
  },

  // 🔄 Update password
  async updatePassword(newPassword) {
    try {
      debugLog('Password update attempt');

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        debugLog('Password update error', null, error);
        return { success: false, error: handleSupabaseError(error) };
      }

      debugLog('Password update successful');
      return { success: true, message: 'Password aggiornata con successo!' };
    } catch (error) {
      debugLog('Unexpected password update error', null, error);
      return { success: false, error: error.message };
    }
  },

  // 👤 Get current user
  async getCurrentUser() {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        debugLog('Get user error', null, error);
        return { success: false, error: handleSupabaseError(error) };
      }

      return { success: true, user };
    } catch (error) {
      debugLog('Unexpected get user error', null, error);
      return { success: false, error: error.message };
    }
  },

  // 🔄 Get current session
  async getCurrentSession() {
    return supabase.auth.getSession();
  },

  // 🔄 Update user profile
  async updateProfile(updates) {
    try {
      debugLog('Profile update attempt', updates);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Utente non autenticato' };
      }

      // Update auth metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: updates,
      });

      if (authError) {
        debugLog('Auth metadata update error', null, authError);
        return { success: false, error: handleSupabaseError(authError) };
      }

      // Update profile table
      const { error: profileError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (profileError) {
        debugLog('Profile table update error', null, profileError);
        return { success: false, error: handleSupabaseError(profileError) };
      }

      debugLog('Profile update successful');
      return { success: true };
    } catch (error) {
      debugLog('Unexpected profile update error', null, error);
      return { success: false, error: error.message };
    }
  },

  // 📊 Get user statistics
  async getUserStats() {
    try {
      debugLog('Getting user stats');

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Utente non autenticato' };
      }

      // Get groups count
      const { count: groupsCount } = await supabase
        .from('group_members')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Get expenses count and total
      const { data: expenses } = await supabase
        .from('expenses')
        .select('total_amount')
        .eq('created_by', user.id);

      const expensesCount = expenses?.length || 0;
      const totalAmount =
        expenses?.reduce(
          (sum, exp) => sum + parseFloat(exp.total_amount || 0),
          0
        ) || 0;

      debugLog('User stats loaded', {
        groupsCount,
        expensesCount,
        totalAmount,
      });
      return {
        success: true,
        stats: {
          groupsCount: groupsCount || 0,
          expensesCount,
          totalAmount,
        },
      };
    } catch (error) {
      debugLog('Unexpected get stats error', null, error);
      return { success: false, error: error.message };
    }
  },

  // 🔔 Set up auth state listener
  onAuthStateChange(callback) {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      debugLog('Auth state changed', { event });
      callback(event, session);
    });

    // Return unsubscribe function
    return data.subscription.unsubscribe;
  },

  // 🔐 Check if user is authenticated
  async isAuthenticated() {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return !!session;
  },

  // 📧 Resend confirmation email
  async resendConfirmationEmail(email) {
    try {
      debugLog('Resending confirmation email', { email });

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });

      if (error) {
        debugLog('Resend confirmation error', null, error);
        return { success: false, error: handleSupabaseError(error) };
      }

      debugLog('Confirmation email resent');
      return {
        success: true,
        message:
          'Email di conferma inviata! Controlla la tua casella di posta.',
      };
    } catch (error) {
      debugLog('Unexpected resend confirmation error', null, error);
      return { success: false, error: error.message };
    }
  },
};
