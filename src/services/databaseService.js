import { supabase } from './supabaseClient';
import toast from 'react-hot-toast';

/**
 * Check the database structure and schema to ensure all required tables exist
 * @returns {Promise<Object>} Status of database schema validation
 */
export const validateDatabaseSchema = async () => {
  const requiredTables = [
    'user_balances',
    'transactions',
    'balance_types',
    'budgets',
    'savings_points'
  ];
  
  const tableStatus = {};
  let allTablesExist = true;

  try {
    // Check each required table
    for (const table of requiredTables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('count(*)', { count: 'exact', head: true });
        
        if (error) {
          console.error(`Error checking table ${table}:`, error);
          tableStatus[table] = { exists: false, error: error.message };
          allTablesExist = false;
        } else {
          const count = data?.count || 0;
          tableStatus[table] = { exists: true, count };
        }
      } catch (tableError) {
        console.error(`Error accessing table ${table}:`, tableError);
        tableStatus[table] = { exists: false, error: tableError.message };
        allTablesExist = false;
      }
    }

    return {
      valid: allTablesExist,
      tableStatus,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error("Database schema validation failed:", error);
    return {
      valid: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Initialize and get balances from the database
 * @returns {Promise<Array>} Array of balance objects
 */
export const getBalances = async () => {
  try {
    // First check if table exists
    const { data: metaData, error: metaError } = await supabase
      .rpc('check_table_exists', { tablename: 'user_balances' });
    
    if (metaError || !metaData) {
      console.error("Error checking balance table:", metaError);
      return [];
    }
    
    // Get balance data
    const { data, error } = await supabase
      .from('user_balances')
      .select(`
        id,
        amount,
        balance_type_id,
        balance_types (
          id,
          name,
          icon
        )
      `);
    
    if (error) {
      console.error("Error fetching balances:", error);
      throw error;
    }
    
    // Transform data for frontend use
    const formattedBalances = data.map(item => ({
      id: item.id,
      name: item.balance_types?.name || 'Account',
      icon: item.balance_types?.icon || '💰',
      balance: parseFloat(item.amount || 0),
      color: getRandomColor(item.balance_types?.name)
    }));
    
    return formattedBalances;
  } catch (error) {
    console.error("Error in getBalances:", error);
    return [];
  }
};

/**
 * Create a new balance
 * @param {Object} balanceData Balance data object
 * @returns {Promise<Object>} Created balance object
 */
export const createBalance = async (balanceData) => {
  try {
    if (!balanceData.name) throw new Error("Balance name is required");
    if (balanceData.balance === undefined) throw new Error("Balance amount is required");
    
    // 1. Check if balance type exists, create if not
    let balanceTypeId;
    const { data: existingType, error: typeError } = await supabase
      .from('balance_types')
      .select('id')
      .eq('name', balanceData.name)
      .maybeSingle();
    
    if (typeError) {
      console.error("Error checking balance type:", typeError);
    }
    
    if (!existingType) {
      // Create new balance type
      const { data: newType, error: createTypeError } = await supabase
        .from('balance_types')
        .insert([{
          name: balanceData.name,
          icon: balanceData.icon || '💰',
          is_default: false
        }])
        .select('id')
        .single();
      
      if (createTypeError) {
        console.error("Error creating balance type:", createTypeError);
        throw new Error(`Couldn't create balance type: ${createTypeError.message}`);
      }
      
      balanceTypeId = newType.id;
    } else {
      balanceTypeId = existingType.id;
    }
    
    // 2. Create the balance
    const { data, error } = await supabase
      .from('user_balances')
      .insert([{
        balance_type_id: balanceTypeId,
        amount: parseFloat(balanceData.balance)
      }])
      .select();
    
    if (error) {
      console.error("Error creating balance:", error);
      throw new Error(`Database error: ${error.message}`);
    }
    
    // 3. Return the created balance
    return {
      id: data[0].id,
      name: balanceData.name,
      icon: balanceData.icon || '💰',
      balance: parseFloat(balanceData.balance),
      color: balanceData.color || getRandomColor(balanceData.name)
    };
  } catch (error) {
    console.error("Error in createBalance:", error);
    throw error;
  }
};

/**
 * Update an existing balance
 * @param {string} id Balance ID
 * @param {Object} balanceData Updated balance data
 * @returns {Promise<Object>} Updated balance object
 */
export const updateBalance = async (id, balanceData) => {
  try {
    if (!id) throw new Error("Balance ID is required");
    
    // Update the balance amount
    const { data, error } = await supabase
      .from('user_balances')
      .update({
        amount: parseFloat(balanceData.balance || 0)
      })
      .eq('id', id)
      .select();
    
    if (error) {
      console.error("Error updating balance:", error);
      throw new Error(`Database error: ${error.message}`);
    }
    
    return {
      id: data[0].id,
      ...balanceData
    };
  } catch (error) {
    console.error("Error in updateBalance:", error);
    throw error;
  }
};

/**
 * Delete a balance
 * @param {string} id Balance ID
 * @returns {Promise<boolean>} Success status
 */
export const deleteBalance = async (id) => {
  try {
    if (!id) throw new Error("Balance ID is required");
    
    const { error } = await supabase
      .from('user_balances')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error("Error deleting balance:", error);
      throw new Error(`Database error: ${error.message}`);
    }
    
    return true;
  } catch (error) {
    console.error("Error in deleteBalance:", error);
    throw error;
  }
};

/**
 * Get or create budget for a specific category and month
 * @param {Object} budgetData Budget data object
 * @returns {Promise<Object>} Budget object
 */
export const saveOrUpdateBudget = async (budgetData) => {
  try {
    const { category, amount, month_year } = budgetData;
    
    if (!category || !amount || !month_year) {
      throw new Error("Category, amount, and month/year are required");
    }
    
    // Check if budget already exists for this category and month
    const { data: existingBudget, error: checkError } = await supabase
      .from('budgets')
      .select('*')
      .eq('category', category)
      .eq('month_year', month_year)
      .maybeSingle();
    
    if (checkError) {
      console.error("Error checking existing budget:", checkError);
    }
    
    let result;
    
    if (existingBudget) {
      // Update existing budget
      const { data, error } = await supabase
        .from('budgets')
        .update({ amount: parseFloat(amount) })
        .eq('id', existingBudget.id)
        .select();
      
      if (error) throw error;
      result = data[0];
    } else {
      // Create new budget
      const { data, error } = await supabase
        .from('budgets')
        .insert([{
          category,
          amount: parseFloat(amount),
          month_year
        }])
        .select();
      
      if (error) throw error;
      result = data[0];
    }
    
    return result;
  } catch (error) {
    console.error("Error saving budget:", error);
    throw error;
  }
};

/**
 * Get budgets for a specific month/year
 * @param {string} month_year Month and year string (e.g., "April 2023")
 * @returns {Promise<Array>} Array of budget objects
 */
export const getBudgetsForMonth = async (month_year) => {
  try {
    if (!month_year) {
      const now = new Date();
      month_year = `${now.toLocaleString('default', { month: 'long' })} ${now.getFullYear()}`;
    }
    
    const { data, error } = await supabase
      .from('budgets')
      .select('*')
      .eq('month_year', month_year);
    
    if (error) {
      console.error("Error fetching budgets:", error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error("Error in getBudgetsForMonth:", error);
    return [];
  }
};

/**
 * Update savings points based on financial activity
 * @param {number} points Points to add/subtract
 * @param {string} reason Reason for the points change
 * @returns {Promise<number>} New total points
 */
export const updateSavingsPoints = async (points, reason = '') => {
  try {
    const month_year = getCurrentMonthYear();
    
    // Get current points for this month
    const { data: currentData, error: fetchError } = await supabase
      .from('savings_points')
      .select('points')
      .eq('month_year', month_year)
      .maybeSingle();
    
    let currentPoints = 0;
    if (fetchError) {
      console.error("Error fetching current points:", fetchError);
      // Continue with 0 points if there's an error
    } else {
      currentPoints = currentData?.points || 0;
    }
    
    const newTotalPoints = currentPoints + points;
    
    // Update or insert points
    const { error: upsertError } = await supabase
      .from('savings_points')
      .upsert([{
        points: newTotalPoints,
        month_year,
        reason: reason || (points >= 0 ? 'Points earned' : 'Points deducted')
      }]);
    
    if (upsertError) {
      console.error("Error updating points:", upsertError);
      throw upsertError;
    }
    
    return newTotalPoints;
  } catch (error) {
    console.error("Error in updateSavingsPoints:", error);
    throw error;
  }
};

/**
 * Get current points total for current month
 * @returns {Promise<number>} Current points
 */
export const getCurrentPoints = async () => {
  try {
    const month_year = getCurrentMonthYear();
    
    const { data, error } = await supabase
      .from('savings_points')
      .select('points')
      .eq('month_year', month_year)
      .maybeSingle();
    
    if (error) {
      console.error("Error fetching points:", error);
      return 0;
    }
    
    return data?.points || 0;
  } catch (error) {
    console.error("Error in getCurrentPoints:", error);
    return 0;
  }
};

/**
 * Calculate points based on savings amount
 * @param {number} savingsAmount Amount saved
 * @returns {number} Points earned
 */
export const calculatePointsFromSavings = (savingsAmount) => {
  // 1 point for every ₹50 saved
  return Math.floor(savingsAmount / 50);
};

/**
 * Update user's points when they save money
 * @param {number} savingsAmount Amount saved
 * @returns {Promise<number>} New total points
 */
export const addPointsForSaving = async (savingsAmount) => {
  if (!savingsAmount || savingsAmount <= 0) return 0;
  
  const pointsEarned = calculatePointsFromSavings(savingsAmount);
  if (pointsEarned <= 0) return 0;
  
  try {
    return await updateSavingsPoints(
      pointsEarned, 
      `Earned for saving ₹${savingsAmount}`
    );
  } catch (error) {
    console.error('Error adding savings points:', error);
    return 0;
  }
};

// Helper function to get current month and year
function getCurrentMonthYear() {
  const date = new Date();
  return `${date.toLocaleString('default', { month: 'long' })} ${date.getFullYear()}`;
}

// Helper function to generate a color based on string
function getRandomColor(str) {
  if (!str) return '#6366f1';
  
  // Simple string hash for consistent color
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Generate color - using a palette of nice colors
  const colors = [
    '#6366f1', // Indigo
    '#3b82f6', // Blue
    '#10b981', // Emerald
    '#f59e0b', // Amber
    '#8b5cf6', // Violet
    '#ec4899', // Pink
    '#14b8a6', // Teal
    '#f43f5e'  // Rose
  ];
  
  return colors[Math.abs(hash) % colors.length];
}
