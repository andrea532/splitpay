import {
  supabase,
  handleSupabaseError,
  debugLog,
  TABLES,
} from '../config/supabase';

class AuthService {
  constructor() {
    this.currentUser = null;
    this.authListeners = [];
  }

  // 🔐 Registrazione nuovo utente con debug
  async signUp(email, password, fullName) {
    debugLog('Auth - Sign Up', { email, fullName });

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password: password,
        options: {
          data: {
            full_name: fullName.trim(),
          },
        },
      });

      if (error) {
        debugLog('Auth - Sign Up Error', null, error);
        throw error;
      }

      debugLog('Auth - Sign Up Success', {
        userId: data.user?.id,
        email: data.user?.email,
        needsConfirmation: !data.session,
      });

      return {
        success: true,
        user: data.user,
        session: data.session,
        message: data.session
          ? 'Registrazione completata con successo!'
          : 'Registrazione completata! Verifica la tua email se richiesto.',
      };
    } catch (error) {
      return {
        success: false,
        error: handleSupabaseError(error),
        details: error.message,
      };
    }
  }

  // 🔑 Login utente con debug
  async signIn(email, password) {
    debugLog('Auth - Sign In', { email });

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password,
      });

      if (error) {
        debugLog('Auth - Sign In Error', null, error);
        throw error;
      }

      debugLog('Auth - Sign In Success', {
        userId: data.user?.id,
        email: data.user?.email,
        hasSession: !!data.session,
      });

      // Aggiorna profilo utente se necessario
      await this.updateUserProfile(data.user);

      this.currentUser = data.user;

      return {
        success: true,
        user: data.user,
        session: data.session,
        message: 'Login effettuato con successo!',
      };
    } catch (error) {
      return {
        success: false,
        error: handleSupabaseError(error),
        details: error.message,
      };
    }
  }

  // 🚪 Logout utente con debug
  async signOut() {
    debugLog('Auth - Sign Out', 'Logging out user...');

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        debugLog('Auth - Sign Out Error', null, error);
        throw error;
      }

      this.currentUser = null;
      this.notifyAuthListeners(null);

      debugLog('Auth - Sign Out Success');

      return {
        success: true,
        message: 'Logout effettuato con successo',
      };
    } catch (error) {
      return {
        success: false,
        error: handleSupabaseError(error),
      };
    }
  }

  // 👤 Ottieni utente corrente
  getCurrentUser() {
    debugLog('Auth - Get Current User');
    return supabase.auth.getUser();
  }

  // 📱 Ottieni sessione corrente
  getCurrentSession() {
    debugLog('Auth - Get Current Session');
    return supabase.auth.getSession();
  }

  // 🔄 Aggiorna profilo utente - Gestione manuale senza trigger
  async updateUserProfile(user) {
    if (!user) {
      debugLog('Auth - Update Profile', 'No user provided');
      return;
    }

    debugLog('Auth - Update Profile', { userId: user.id, email: user.email });

    try {
      // Controlla se il profilo esiste
      const { data: existingProfile } = await supabase
        .from(TABLES.PROFILES)
        .select('id')
        .eq('id', user.id)
        .single();

      if (!existingProfile) {
        // Crea il profilo manualmente
        debugLog('Auth - Creating Profile Manually', {
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name,
        });

        const { error: insertError } = await supabase
          .from(TABLES.PROFILES)
          .insert([
            {
              id: user.id,
              email: user.email,
              full_name:
                user.user_metadata?.full_name || user.email.split('@')[0],
            },
          ]);

        if (insertError) {
          debugLog('Auth - Profile Creation Error', null, insertError);
          console.warn('Errore creazione profilo (non critico):', insertError);
        } else {
          debugLog('Auth - Profile Created Successfully');
        }
      } else {
        debugLog('Auth - Profile Already Exists');
      }
    } catch (error) {
      debugLog('Auth - Update Profile Error', null, error);
      console.warn('Errore gestione profilo (non critico):', error);
    }
  }

  // 👤 Ottieni profilo utente completo con debug
  async getUserProfile(userId = null) {
    debugLog('Auth - Get User Profile', { userId });

    try {
      const targetUserId =
        userId || (await this.getCurrentUser()).data.user?.id;

      if (!targetUserId) {
        throw new Error('Utente non autenticato');
      }

      debugLog('Auth - Fetching Profile for User', { targetUserId });

      const { data, error } = await supabase
        .from(TABLES.PROFILES)
        .select('*')
        .eq('id', targetUserId)
        .single();

      if (error) {
        debugLog('Auth - Get Profile Error', null, error);
        throw error;
      }

      debugLog('Auth - Profile Retrieved', data);

      return {
        success: true,
        profile: data,
      };
    } catch (error) {
      return {
        success: false,
        error: handleSupabaseError(error),
      };
    }
  }

  // ✏️ Aggiorna nome utente con debug
  async updateProfile(updates) {
    debugLog('Auth - Update Profile Data', updates);

    try {
      const {
        data: { user },
      } = await this.getCurrentUser();

      if (!user) {
        throw new Error('Utente non autenticato');
      }

      debugLog('Auth - Updating Profile for User', {
        userId: user.id,
        updates,
      });

      // Aggiorna tabella profiles
      const { error: profileError } = await supabase
        .from(TABLES.PROFILES)
        .update(updates)
        .eq('id', user.id);

      if (profileError) {
        debugLog('Auth - Profile Update Error', null, profileError);
        throw profileError;
      }

      // Aggiorna anche auth metadata se necessario
      if (updates.full_name) {
        debugLog('Auth - Updating Auth Metadata', {
          full_name: updates.full_name,
        });

        const { error: authError } = await supabase.auth.updateUser({
          data: { full_name: updates.full_name },
        });

        if (authError) {
          debugLog('Auth - Auth Metadata Update Warning', null, authError);
          console.warn('Errore aggiornamento auth metadata:', authError);
        } else {
          debugLog('Auth - Auth Metadata Updated Successfully');
        }
      }

      debugLog('Auth - Profile Update Success');

      return {
        success: true,
        message: 'Profilo aggiornato con successo',
      };
    } catch (error) {
      return {
        success: false,
        error: handleSupabaseError(error),
      };
    }
  }

  // 🔑 Reset password con debug
  async resetPassword(email) {
    debugLog('Auth - Reset Password', { email });

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        {
          redirectTo: window.location.origin + '/reset-password',
        }
      );

      if (error) {
        debugLog('Auth - Reset Password Error', null, error);
        throw error;
      }

      debugLog('Auth - Reset Password Success');

      return {
        success: true,
        message: 'Email di reset inviata! Controlla la tua casella di posta.',
      };
    } catch (error) {
      return {
        success: false,
        error: handleSupabaseError(error),
      };
    }
  }

  // 👥 Cerca utenti per email (per inviti) con debug
  async searchUserByEmail(email) {
    debugLog('Auth - Search User by Email', { email });

    try {
      const { data, error } = await supabase
        .from(TABLES.PROFILES)
        .select('id, email, full_name')
        .eq('email', email.trim().toLowerCase())
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = not found
        debugLog('Auth - Search User Error', null, error);
        throw error;
      }

      debugLog('Auth - Search User Result', { found: !!data, user: data });

      return {
        success: true,
        user: data || null,
      };
    } catch (error) {
      return {
        success: false,
        error: handleSupabaseError(error),
      };
    }
  }

  // 🔄 Listener per cambiamenti autenticazione con debug
  onAuthStateChange(callback) {
    debugLog('Auth - Setting Up Auth State Listener');

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      debugLog('Auth - State Change Event', {
        event,
        hasSession: !!session,
        userId: session?.user?.id,
      });

      if (event === 'SIGNED_IN' && session?.user) {
        this.currentUser = session.user;
        await this.updateUserProfile(session.user);
        debugLog('Auth - User Signed In', { userId: session.user.id });
      } else if (event === 'SIGNED_OUT') {
        this.currentUser = null;
        debugLog('Auth - User Signed Out');
      }

      callback(event, session);
      this.notifyAuthListeners(session?.user || null);
    });

    return subscription;
  }

  // 📢 Gestione listeners personalizzati
  addAuthListener(callback) {
    debugLog('Auth - Adding Auth Listener');
    this.authListeners.push(callback);

    // Rimuovi listener
    return () => {
      debugLog('Auth - Removing Auth Listener');
      this.authListeners = this.authListeners.filter(
        (listener) => listener !== callback
      );
    };
  }

  notifyAuthListeners(user) {
    debugLog('Auth - Notifying Auth Listeners', {
      listenersCount: this.authListeners.length,
      hasUser: !!user,
    });

    this.authListeners.forEach((callback) => {
      try {
        callback(user);
      } catch (error) {
        debugLog('Auth - Listener Error', null, error);
        console.error('Errore in auth listener:', error);
      }
    });
  }

  // 🔍 Verifica se l'utente è autenticato
  isAuthenticated() {
    const authenticated = this.currentUser !== null;
    debugLog('Auth - Is Authenticated', {
      authenticated,
      userId: this.currentUser?.id,
    });
    return authenticated;
  }

  // 📊 Ottieni statistiche utente con debug
  async getUserStats() {
    debugLog('Auth - Get User Stats');

    try {
      const {
        data: { user },
      } = await this.getCurrentUser();

      if (!user) {
        throw new Error('Utente non autenticato');
      }

      debugLog('Auth - Calculating Stats for User', { userId: user.id });

      // Conta gruppi di cui fa parte
      const { count: groupsCount, error: groupsError } = await supabase
        .from(TABLES.GROUP_MEMBERS)
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (groupsError) {
        debugLog('Auth - Groups Count Error', null, groupsError);
      }

      // Conta spese create
      const { count: expensesCount, error: expensesError } = await supabase
        .from(TABLES.EXPENSES)
        .select('*', { count: 'exact', head: true })
        .eq('created_by', user.id);

      if (expensesError) {
        debugLog('Auth - Expenses Count Error', null, expensesError);
      }

      const stats = {
        groupsCount: groupsCount || 0,
        expensesCount: expensesCount || 0,
      };

      debugLog('Auth - User Stats Calculated', stats);

      return {
        success: true,
        stats: stats,
      };
    } catch (error) {
      return {
        success: false,
        error: handleSupabaseError(error),
      };
    }
  }

  // 🧪 Test del servizio di autenticazione
  async testAuthService() {
    debugLog('Auth - Testing Auth Service');

    const tests = {
      connection: false,
      profilesTable: false,
      currentUser: false,
    };

    try {
      // Test connessione base
      const {
        data: { user },
      } = await this.getCurrentUser();
      tests.currentUser = !!user;

      // Test accesso tabella profiles
      const { error: profilesError } = await supabase
        .from(TABLES.PROFILES)
        .select('count(*)')
        .limit(1);

      tests.profilesTable = !profilesError;
      tests.connection = true;
    } catch (error) {
      debugLog('Auth - Service Test Error', null, error);
    }

    debugLog('Auth - Service Test Results', tests);
    return tests;
  }
}

// Esporta istanza singleton
export const authService = new AuthService();
export default authService;
