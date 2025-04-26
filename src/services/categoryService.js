import { supabase } from './supabaseClient';

/**
 * Fetch all categories for the current user
 */
export const getCategories = async () => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching categories:', error);
    throw error;
  }
};

/**
 * Add a new category
 * @param {string} categoryName - The name of the category to add
 */
export const addCategory = async (categoryName) => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .insert([{ category_name: categoryName }])
      .select();
    
    if (error) throw error;
    return data?.[0];
  } catch (error) {
    console.error('Error adding category:', error);
    throw error;
  }
};

/**
 * Update an existing category
 * @param {string} id - The UUID of the category
 * @param {string} categoryName - The new category name
 */
export const updateCategory = async (id, categoryName) => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .update({ category_name: categoryName })
      .eq('id', id)
      .select();
    
    if (error) throw error;
    return data?.[0];
  } catch (error) {
    console.error('Error updating category:', error);
    throw error;
  }
};

/**
 * Delete a category
 * @param {string} id - The UUID of the category to delete
 */
export const deleteCategory = async (id) => {
  try {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting category:', error);
    throw error;
  }
};
