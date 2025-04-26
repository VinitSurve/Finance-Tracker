import { supabase } from './supabaseClient';

/**
 * Add a new transaction
 * @param {Object} transaction - The transaction object
 * @param {string} transaction.transaction_type - The type (income, expense, transfer)
 * @param {number} transaction.amount - The transaction amount
 * @param {string} transaction.category_id - The category UUID
 * @param {string} transaction.reason_id - The reason UUID (optional)
 */
export const addTransaction = async (transaction) => {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .insert([transaction])
      .select();
    
    if (error) throw error;
    return data?.[0];
  } catch (error) {
    console.error('Error adding transaction:', error);
    throw error;
  }
};

/**
 * Get transactions with pagination
 * @param {Object} filters - Filter options
 * @param {number} page - Page number (starting from 0)
 * @param {number} pageSize - Number of items per page
 */
export const getTransactions = async (filters = {}, page = 0, pageSize = 10) => {
  try {
    let query = supabase
      .from('transactions')
      .select(`
        *,
        category:category_id (id, category_name),
        reason:reason_id (id, reason_text)
      `)
      .order('created_at', { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1);
    
    // Apply filters if provided
    if (filters.transaction_type) {
      query = query.eq('transaction_type', filters.transaction_type);
    }
    
    if (filters.category_id) {
      query = query.eq('category_id', filters.category_id);
    }
    
    if (filters.reason_id) {
      query = query.eq('reason_id', filters.reason_id);
    }
    
    if (filters.startDate && filters.endDate) {
      query = query.gte('created_at', filters.startDate).lte('created_at', filters.endDate);
    }
    
    const { data, error, count } = await query;
    
    if (error) throw error;
    return { data: data || [], count };
  } catch (error) {
    console.error('Error fetching transactions:', error);
    throw error;
  }
};

/**
 * Get transaction by ID
 * @param {string} id - The transaction UUID
 */
export const getTransactionById = async (id) => {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        category:category_id (id, category_name),
        reason:reason_id (id, reason_text)
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching transaction:', error);
    throw error;
  }
};

/**
 * Update an existing transaction
 * @param {string} id - The transaction UUID
 * @param {Object} updates - The fields to update
 */
export const updateTransaction = async (id, updates) => {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .update(updates)
      .eq('id', id)
      .select();
    
    if (error) throw error;
    return data?.[0];
  } catch (error) {
    console.error('Error updating transaction:', error);
    throw error;
  }
};

/**
 * Delete a transaction
 * @param {string} id - The transaction UUID
 */
export const deleteTransaction = async (id) => {
  try {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting transaction:', error);
    throw error;
  }
};

/**
 * Get transaction statistics
 * @param {string} period - The period to calculate stats for (day, week, month, year)
 */
export const getTransactionStats = async (period = 'month') => {
  try {
    // Calculate start date based on period
    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case 'day':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setMonth(now.getMonth() - 1);
    }
    
    // Get income transactions
    const { data: incomeData, error: incomeError } = await supabase
      .from('transactions')
      .select('amount')
      .eq('transaction_type', 'income')
      .gte('created_at', startDate.toISOString());
    
    if (incomeError) throw incomeError;
    
    // Get expense transactions
    const { data: expenseData, error: expenseError } = await supabase
      .from('transactions')
      .select('amount')
      .eq('transaction_type', 'expense')
      .gte('created_at', startDate.toISOString());
    
    if (expenseError) throw expenseError;
    
    // Calculate totals
    const totalIncome = incomeData?.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0) || 0;
    const totalExpenses = expenseData?.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0) || 0;
    
    return {
      income: totalIncome,
      expenses: totalExpenses,
      balance: totalIncome - totalExpenses,
      period
    };
  } catch (error) {
    console.error('Error calculating transaction stats:', error);
    throw error;
  }
};
