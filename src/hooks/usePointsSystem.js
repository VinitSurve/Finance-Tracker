import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';

/**
 * Hook for managing the points/rewards system
 * @returns {Object} Points system methods and state
 */
const usePointsSystem = () => {
  const [points, setPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get current month-year string
  const getCurrentMonthYear = () => {
    const date = new Date();
    return `${date.getMonth() + 1}-${date.getFullYear()}`;
  };

  // Load user's points for the current month
  const loadPoints = async () => {
    try {
      setLoading(true);
      const monthYear = getCurrentMonthYear();
      
      // Get current user
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        throw new Error("User not authenticated");
      }
      
      // Get points for current month
      const { data, error } = await supabase
        .from('savings_points')
        .select('points')
        .eq('month_year', monthYear)
        .eq('user_id', userData.user.id)
        .single();
        
      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned" which is fine - user just has 0 points
        throw error;
      }
      
      setPoints(data?.points || 0);
    } catch (err) {
      console.error("Error loading points:", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  // Add points for an action
  const addPoints = async (pointsToAdd, reason) => {
    try {
      setLoading(true);
      const monthYear = getCurrentMonthYear();
      
      // Get current user
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        throw new Error("User not authenticated");
      }
      
      // Get current points for this month
      const { data: existingData, error: fetchError } = await supabase
        .from('savings_points')
        .select('id, points')
        .eq('month_year', monthYear)
        .eq('user_id', userData.user.id)
        .single();
        
      // Calculate new points total
      const currentPoints = existingData?.points || 0;
      const newPoints = currentPoints + pointsToAdd;
      
      let result;
      
      if (existingData) {
        // Update existing points
        result = await supabase
          .from('savings_points')
          .update({ points: newPoints })
          .eq('id', existingData.id)
          .select();
      } else {
        // Create new points entry
        result = await supabase
          .from('savings_points')
          .insert([{
            points: pointsToAdd,
            month_year: monthYear,
            user_id: userData.user.id,
            created_at: new Date().toISOString()
          }])
          .select();
      }
      
      if (result.error) {
        throw result.error;
      }
      
      setPoints(newPoints);
      return newPoints;
    } catch (err) {
      console.error("Error adding points:", err);
      setError(err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Points for specific actions
  const pointsActions = {
    ADD_TRANSACTION: 5,
    COMPLETE_BUDGET: 20,
    STAY_UNDER_BUDGET: 30,
    TRACK_DAILY: 10,
    SET_FINANCIAL_GOAL: 15
  };

  // Award points for a specific action
  const awardPoints = async (action) => {
    const pointsForAction = pointsActions[action] || 0;
    if (pointsForAction > 0) {
      return await addPoints(pointsForAction, action);
    }
    return points;
  };

  // Check if user completed a budget for the month
  const checkBudgetCompletion = async () => {
    try {
      const monthYear = getCurrentMonthYear();
      
      // Get current user
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        return false;
      }
      
      // Check if user has budgets for this month
      const { data, error } = await supabase
        .from('budgets')
        .select('id')
        .eq('month_year', monthYear)
        .eq('user_id', userData.user.id);
        
      if (error) {
        throw error;
      }
      
      // If we have at least one budget, consider it complete
      if (data && data.length > 0) {
        await awardPoints('COMPLETE_BUDGET');
        return true;
      }
      
      return false;
    } catch (err) {
      console.error("Error checking budget completion:", err);
      return false;
    }
  };

  // Reset points if needed on initial load
  useEffect(() => {
    loadPoints();
  }, []);

  return {
    points,
    loading,
    error,
    addPoints,
    awardPoints,
    checkBudgetCompletion,
    pointsActions,
    loadPoints
  };
};

// Add named export to fix the import error
export { usePointsSystem };

// Keep the default export too
export default usePointsSystem;
