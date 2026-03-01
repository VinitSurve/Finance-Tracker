import '../styles/global/global.css';
import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables!');
  console.error('Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in .env file');
}

// Create Supabase client with real authentication
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

// Check database connection and log result
const checkDatabaseConnection = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      console.log('✅ User authenticated:', session.user.email);
      
      // Test database connection
      const { error } = await supabase
        .from('user_balances')
        .select('count')
        .limit(1);
      
      if (error) {
        console.error('❌ Database connection failed:', error);
      } else {
        console.log('✅ Database connection successful');
      }
    } else {
      console.log('ℹ️ No active session - user needs to log in');
    }
  } catch (error) {
    console.error('❌ Database connection check error:', error);
  }
};

// Run the connection check
checkDatabaseConnection();

export default supabase;
