import { createClient } from '@supabase/supabase-js';

// Supabase connection credentials
const supabaseUrl = 'https://rviekbiwgbziflrbaduq.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2aWVrYml3Z2J6aWZscmJhZHVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE2Nzc1OTA0MDAsImV4cCI6MTk5MzE2NjQwMH0.Z94dGIhV0prGyi4mNwbRwdO2OJ4YzBkxZTXzxO3IC1A';

// Create the supabase client with proper configuration
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test the connection and log the result
export const testConnection = async () => {
  try {
    const { data, error } = await supabase.from('user_balances').select('count(*)');
    if (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
    console.log('Database connection successful');
    return true;
  } catch (err) {
    console.error('Database connection error:', err);
    return false;
  }
};

// Call the test connection function to validate on load
testConnection();
