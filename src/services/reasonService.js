import { supabase } from './supabaseClient';

// Get custom reasons - adjusted to work with the actual database schema
export const getCustomReasonsByType = async (reasonType) => {
  try {
    // We need to use reason_type, not type
    const { data, error } = await supabase
      .from('custom_reasons')
      .select('*')
      .eq('reason_type', reasonType)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error(`Error fetching reasons:`, error);
    return [];
  }
};

// Function to get reasons by type and category - for more specific filtering
export const getCustomReasonsByTypeAndCategory = async (reasonType, category) => {
  try {
    // We need to use reason_type, not type
    const { data, error } = await supabase
      .from('custom_reasons')
      .select('*')
      .eq('reason_type', reasonType)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    // Filter by category if provided
    if (category && category !== 'all') {
      return (data || []).filter(reason => 
        !reason.category || reason.category === category
      );
    }
    
    return data || [];
  } catch (error) {
    console.error(`Error fetching reasons:`, error);
    return [];
  }
};

// Add a custom reason - fixed to use reason_type instead of type
export const addCustomReason = async (reasonData) => {
  try {
    // Use reason_type instead of type
    const dataToInsert = {
      reason_text: reasonData.reason_text,
      reason_type: reasonData.type || 'income', // Default to income if type is not provided
      category: reasonData.category || null,
      created_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('custom_reasons')
      .insert([dataToInsert])
      .select();
      
    if (error) throw error;
    
    return data[0];
  } catch (error) {
    console.error('Error adding custom reason:', error);
    throw error;
  }
};

// Delete a custom reason
export const deleteCustomReason = async (reasonId) => {
  try {
    const { error } = await supabase
      .from('custom_reasons')
      .delete()
      .eq('id', reasonId);
      
    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error('Error deleting custom reason:', error);
    throw error;
  }
};
