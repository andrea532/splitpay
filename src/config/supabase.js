import { createClient } from '@supabase/supabase-js';

// 🔑 SOSTITUISCI QUESTI VALORI CON I TUOI DA SUPABASE DASHBOARD
const supabaseUrl = 'https://qgykqstpuwcagcgacyyi.supabase.co'; // Project URL
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFneWtxc3RwdXdjYWdjZ2FjeXlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg1OTg1OTMsImV4cCI6MjA2NDE3NDU5M30.i6SWEdotKTAlYQRcbbtgq5usizA2JDk8vWQzG_cqOzQ'; // anon public key

// 🛠️ DEBUG MODE - Metti a true per vedere i log dettagliati
const DEBUG_MODE = true;

// Crea client Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: window.localStorage, // Usa localStorage del browser
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// 🔍 Funzione di debug per loggare errori dettagliati
export const debugLog = (operation, data, error = null) => {
  if (DEBUG_MODE) {
    console.log(`🔍 [DEBUG] ${operation}:`, { data, error });
  }

  if (error) {
    console.error(`❌ [ERROR] ${operation}:`, error);
  }
};

// 🧪 Funzione per testare la connessione a Supabase
export const testSupabaseConnection = async () => {
  try {
    debugLog('Testing Supabase Connection', 'Checking connection...');

    // Test basic connection
    const { data, error } = await supabase
      .from('profiles')
      .select('count(*)')
      .limit(1);

    if (error) {
      throw error;
    }

    debugLog('Supabase Connection Test', 'SUCCESS - Database is accessible');
    return { success: true, message: 'Connessione Supabase funzionante!' };
  } catch (error) {
    debugLog('Supabase Connection Test', null, error);
    return {
      success: false,
      error: 'Errore di connessione a Supabase',
      details: error.message,
    };
  }
};

// 🔐 Funzione per testare l'autenticazione
export const testAuthentication = async () => {
  try {
    debugLog('Testing Authentication', 'Checking current user...');

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      throw error;
    }

    debugLog('Authentication Test', {
      authenticated: !!user,
      userId: user?.id,
      email: user?.email,
    });

    return {
      success: true,
      authenticated: !!user,
      user: user,
      message: user ? 'Utente autenticato' : 'Nessun utente autenticato',
    };
  } catch (error) {
    debugLog('Authentication Test', null, error);
    return {
      success: false,
      error: 'Errore nel test di autenticazione',
      details: error.message,
    };
  }
};

// Utilità per gestire errori Supabase con debug migliorato
export const handleSupabaseError = (error) => {
  debugLog('Handling Supabase Error', null, error);

  if (error?.message) {
    // Traduci i messaggi di errore comuni
    const errorTranslations = {
      'Invalid login credentials': 'Email o password non corretti',
      'User already registered': 'Utente già registrato con questa email',
      'Password should be at least 6 characters':
        'La password deve essere di almeno 6 caratteri',
      'Unable to validate email address': 'Indirizzo email non valido',
      'Email not confirmed':
        'Email non confermata. Controlla la tua casella di posta',
      'User not found': 'Utente non trovato',
      'Network request failed':
        'Errore di connessione. Controlla la tua connessione internet',
      'JWT expired': 'Sessione scaduta. Effettua nuovamente il login',
      'new row violates row-level security policy':
        'Permessi insufficienti per questa operazione',
      'permission denied for table':
        'Permessi insufficienti per accedere ai dati',
      'relation "public.groups" does not exist':
        'Tabelle del database non configurate. Esegui lo script di setup.',
      'relation "public.profiles" does not exist':
        'Tabelle del database non configurate. Esegui lo script di setup.',
    };

    const translatedError = errorTranslations[error.message] || error.message;

    // Log dell'errore completo per debug
    debugLog('Error Translation', {
      original: error.message,
      translated: translatedError,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });

    return translatedError;
  }

  return 'Si è verificato un errore. Riprova più tardi.';
};

// 🧪 Funzione per verificare il setup del database
export const verifyDatabaseSetup = async () => {
  debugLog('Verifying Database Setup', 'Checking tables...');

  const tables = [
    'profiles',
    'groups',
    'group_members',
    'expenses',
    'expense_shares',
  ];
  const results = {};

  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('count(*)')
        .limit(1);

      if (error) {
        results[table] = { exists: false, error: error.message };
      } else {
        results[table] = { exists: true };
      }
    } catch (err) {
      results[table] = { exists: false, error: err.message };
    }
  }

  debugLog('Database Setup Verification', results);

  const allTablesExist = Object.values(results).every((r) => r.exists);

  return {
    success: allTablesExist,
    tables: results,
    message: allTablesExist
      ? 'Database configurato correttamente!'
      : 'Alcune tabelle mancano. Esegui lo script SQL di setup.',
  };
};

// Utility per formattare date
export const formatDate = (date) => {
  if (!date) return '';

  try {
    return new Date(date).toLocaleDateString('it-IT', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return date;
  }
};

// Utility per generare codici invito
export const generateInviteCode = () => {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
};

// Utility per validare email
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Utility per validare password
export const isValidPassword = (password) => {
  return password && password.length >= 6;
};

// Costanti per le tabelle del database
export const TABLES = {
  PROFILES: 'profiles',
  GROUPS: 'groups',
  GROUP_MEMBERS: 'group_members',
  EXPENSES: 'expenses',
  EXPENSE_SHARES: 'expense_shares',
};

// Costanti per i ruoli
export const ROLES = {
  ADMIN: 'admin',
  MEMBER: 'member',
};

// Configurazione real-time channels
export const REALTIME_CHANNELS = {
  GROUPS: 'groups_changes',
  EXPENSES: 'expenses_changes',
  MEMBERS: 'members_changes',
};

// 🛠️ Funzione di diagnostica completa
export const runDiagnostics = async () => {
  console.log('🔍 Avvio diagnostica SmartSplit...\n');

  const results = {
    connection: await testSupabaseConnection(),
    authentication: await testAuthentication(),
    database: await verifyDatabaseSetup(),
  };

  console.log('📊 Risultati Diagnostica:');
  console.log('🔌 Connessione:', results.connection.success ? '✅' : '❌');
  console.log(
    '🔐 Autenticazione:',
    results.authentication.authenticated ? '✅' : '⚠️'
  );
  console.log('🗄️ Database:', results.database.success ? '✅' : '❌');

  if (!results.connection.success) {
    console.log('❌ Problema di connessione:', results.connection.error);
  }

  if (!results.database.success) {
    console.log('❌ Problema database:', results.database.message);
    console.log(
      '💡 Soluzione: Esegui lo script database-setup.sql nel tuo progetto Supabase'
    );
  }

  return results;
};
