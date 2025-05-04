import '../styles/global/global.css';
import { createClient } from '@supabase/supabase-js';

// Get environment variables for Supabase connection
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Create the Supabase client with error handling
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Test the connection using existing tables instead of creating a new one
export const testConnection = async () => {
  try {
    // Check if we can connect by querying existing tables
    // First try the transactions table which should definitely exist
    const { error: transactionsError } = await supabase
      .from('transactions')
      .select('count')
      .limit(1);
    
    if (!transactionsError) {
      console.log('Database connection successful (transactions table)');
      return true;
    }
    
    // If transactions table fails, try user_balances
    const { error: balancesError } = await supabase
      .from('user_balances')
      .select('count')
      .limit(1);
      
    if (!balancesError) {
      console.log('Database connection successful (user_balances table)');
      return true;
    }
    
    // If both fail, check if we can at least get the server time
    const { error: systemError } = await supabase.rpc('get_server_time');
    
    if (!systemError) {
      console.log('Database connection successful (system functions)');
      return true;
    }
    
    // All checks failed
    console.error('Database connection test failed: Unable to query any tables or functions');
    return false;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
};

// Initialize the connection test
testConnection().then((success) => {
  if (!success && (supabaseUrl === '' || supabaseKey === '')) {
    console.warn('Supabase URL or key is missing. Please check your environment variables.');
  } else if (!success) {
    console.error('Could not connect to Supabase. Please check your credentials and network connection.');
  }
});
