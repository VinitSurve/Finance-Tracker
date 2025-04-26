import { useState, useEffect } from 'react';
import { getCurrentPoints, updateSavingsPoints } from '../services/databaseService';

export function usePointsSystem() {
  const [points, setPoints] = useState(0);
  const [level, setLevel] = useState({ name: '🌱 Saving Beginner', color: '#8b5cf6' });
  const [isLoading, setIsLoading] = useState(true);
  
  // Load points from the database
  useEffect(() => {
    const loadPoints = async () => {
      try {
        setIsLoading(true);
        const currentPoints = await getCurrentPoints();
        setPoints(currentPoints);
        updateLevel(currentPoints);
      } catch (error) {
        console.error('Error loading points:', error);
        setPoints(0);
      } finally {
        setIsLoading(false);
      }
    };

    loadPoints();
  }, []);

  // Update user level based on points
  const updateLevel = (pointsValue) => {
    if (pointsValue >= 100) {
      setLevel({ name: '🧠 Finance Genius', color: '#10b981' });
    } else if (pointsValue >= 50) {
      setLevel({ name: '⭐ Smart Saver', color: '#3b82f6' });
    } else if (pointsValue >= 20) {
      setLevel({ name: '👍 Budget Keeper', color: '#f59e0b' });
    } else if (pointsValue >= 0) {
      setLevel({ name: '🌱 Saving Beginner', color: '#8b5cf6' });
    } else {
      setLevel({ name: '⚠️ Needs Improvement', color: '#ef4444' });
    }
  };

  // Add points for savings (1 point per 50 rupees saved)
  const addPointsForSavings = async (savingsAmount) => {
    if (!savingsAmount || savingsAmount <= 0) return points;
    
    // Calculate points based on savings amount: 1 point for every ₹50 saved
    const pointsEarned = Math.floor(savingsAmount / 50);
    
    if (pointsEarned <= 0) return points;
    
    try {
      const newTotalPoints = await updateSavingsPoints(
        pointsEarned,
        `Earned for saving ₹${savingsAmount}`
      );
      
      setPoints(newTotalPoints);
      updateLevel(newTotalPoints);
      
      // Play success sound for points earned
      new Audio('/sounds/save-points.mp3').play().catch(e => {});
      
      return newTotalPoints;
    } catch (error) {
      console.error('Error adding points for savings:', error);
      return points;
    }
  };

  // Add or subtract points for other actions
  const addPoints = async (amount, reason = '') => {
    if (!amount) return points;

    try {
      const newTotalPoints = await updateSavingsPoints(amount, reason);
      
      setPoints(newTotalPoints);
      updateLevel(newTotalPoints);
      
      // Play sound based on points change
      if (amount > 0) {
        new Audio('/sounds/save-points.mp3').play().catch(e => {});
      } else if (amount < 0) {
        new Audio('/sounds/spend-points.mp3').play().catch(e => {});
      }
      
      return newTotalPoints;
    } catch (error) {
      console.error('Error updating points:', error);
      return points;
    }
  };

  return {
    points,
    level,
    isLoading,
    addPoints,
    addPointsForSavings
  };
}
