import { supabase } from './supabaseClient';

/**
 * Fetch all custom reasons by type
 * @param {string} reasonType - The type of reason
 */
export const getReasonsByType = async (reasonType) => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error(`Error fetching ${reasonType} reasons:`, error);
    return [];
  }
};

/**
 * Fetch custom reasons for a specific category and type
 * @param {string} reasonType - The type of reason
 * @param {string} categoryId - The UUID of the category
 */
export const getReasonsByCategoryAndType = async (reasonType, categoryId) => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('id', categoryId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error(`Error fetching ${reasonType} reasons for category:`, error);
    return [];
  }
};

/**
 * Add a new custom reason
 * @param {Object} reason - The reason object to add
 */
export const addCustomReason = async (reason) => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .insert([{ 
        category_name: reason.reason_text
      }])
      .select();
    
    if (error) throw error;
    return data?.[0];
  } catch (error) {
    console.error('Error adding custom reason:', error);
    throw error;
  }
};

/**
 * Update an existing custom reason
 * @param {string} id - The UUID of the reason
 * @param {Object} updates - The fields to update
 */
export const updateCustomReason = async (id, updates) => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .update({ category_name: updates.reason_text })
      .eq('id', id)
      .select();
    
    if (error) throw error;
    return data?.[0];
  } catch (error) {
    console.error('Error updating custom reason:', error);
    throw error;
  }
};

/**
 * Delete a custom reason
 * @param {string} id - The UUID of the reason to delete
 */
export const deleteCustomReason = async (id) => {
  try {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting custom reason:', error);
    throw error;
  }
};

// Add aliases for the existing functions to maintain compatibility
export const getCustomReasonsByType = getReasonsByType;
export const getCustomReasonsByTypeAndCategory = getReasonsByCategoryAndType;
