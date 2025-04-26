import React, { createContext, useContext, useState, useEffect } from 'react';

// Create theme context
const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [darkMode, setDarkMode] = useState(false);

  // Luxury Finance color palette
  const colors = {
    light: {
      primary: '#111827', // Deep Navy
      accent: '#F59E0B', // Golden Amber
      background: '#F5F5F5', // Light Silver
      secondaryBg: '#FFFFFF', // White
      cardBg: '#FFFFFF', // White
      textPrimary: '#0F172A', // Rich Navy
      textSecondary: '#6B7280', // Muted Slate
      border: '#D1D5DB', // Cool Gray
      success: '#10B981', // Emerald 500
      error: '#EF4444', // Bright Red
      warning: '#F59E0B', // Amber 500
      // Page specific colors
      dashboardGradient: 'linear-gradient(135deg, #111827 0%, #334155 100%)',
      incomePageBg: '#ECFDF5', // Light emerald tint
      expensePageBg: '#FEF2F2', // Soft rose tint
      budgetPageBg: '#FFF7ED', // Lightest gold tint
    },
    dark: {
      primary: '#F9FAFB', // Off White
      accent: '#FBBF24', // Soft Gold
      background: '#0A0A0A', // True Black
      secondaryBg: '#1C1C1E', // Dark Charcoal
      cardBg: '#1F2937', // Slate-800
      textPrimary: '#E5E7EB', // Light Slate
      textSecondary: '#9CA3AF', // Muted Gray
      border: '#374151', // Slate-700
      success: '#34D399', // Emerald 400
      error: '#F87171', // Soft Red
      warning: '#FBBF24', // Amber 400
      // Page specific colors
      dashboardGradient: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
      incomePageBg: '#064E3B', // Dark green tint
      expensePageBg: '#7F1D1D', // Deep maroon tint
      budgetPageBg: '#450A0A', // Dark maroon gold
    }
  };

  useEffect(() => {
    // Load theme preference from localStorage
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setDarkMode(savedTheme === 'dark');
    } else {
      // Use system preference as default
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setDarkMode(prefersDark);
    }
    
    // Apply theme to document root
    applyThemeToDocument();
  }, [darkMode]);

  const toggleTheme = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('theme', newMode ? 'dark' : 'light');
  };
  
  // Apply theme colors to CSS variables for global access
  const applyThemeToDocument = () => {
    const themeColors = darkMode ? colors.dark : colors.light;
    const root = document.documentElement;
    
    Object.entries(themeColors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });
    
    // Set body background
    document.body.style.backgroundColor = themeColors.background;
    document.body.style.color = themeColors.textPrimary;
  };

  return (
    <ThemeContext.Provider value={{ 
      darkMode, 
      toggleTheme, 
      colors: darkMode ? colors.dark : colors.light 
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);