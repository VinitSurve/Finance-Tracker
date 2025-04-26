import { lazy, Suspense, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './context/ThemeContext';
import { CurrencyProvider } from './context/CurrencyContext';
import FloatingNav from './components/FloatingNav';
import AIAssistant from './components/AIAssistant';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import LoadingScreen from './components/LoadingScreen';
import Notifications from './components/Notifications';
import { supabase } from './services/supabaseClient'; // Fixed import path

// Lazy load pages for better performance
const Dashboard = lazy(() => import('./pages/Dashboard'));
const SetupBalances = lazy(() => import('./pages/SetupBalances'));
const AddIncome = lazy(() => import('./pages/AddIncome'));
const AddExpense = lazy(() => import('./pages/AddExpense'));
const Transactions = lazy(() => import('./pages/Transactions'));
const Settings = lazy(() => import('./pages/Settings'));
const NotFound = lazy(() => import('./pages/NotFound'));
const BudgetManagement = lazy(() => import('./pages/BudgetManagement'));

function App() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [userData, setUserData] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Load user financial data from database with enhanced analytics
    const loadUserData = async () => {
      try {
        setDataLoading(true);
        
        // Get the date range for this month
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
        
        // Get last month's date range for comparison
        const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
        const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString();
        
        // Parallel requests for better performance
        const [
          currentMonthIncomeResponse, 
          currentMonthExpenseResponse,
          lastMonthIncomeResponse,
          lastMonthExpenseResponse,
          balancesResponse
        ] = await Promise.all([
          // Current month income
          supabase
            .from('transactions')
            .select('amount, created_at, category')
            .eq('type', 'income')
            .gte('created_at', firstDayOfMonth)
            .lte('created_at', lastDayOfMonth),
          
          // Current month expenses
          supabase
            .from('transactions')
            .select('amount, created_at, category')
            .eq('type', 'expense')
            .gte('created_at', firstDayOfMonth)
            .lte('created_at', lastDayOfMonth),
          
          // Last month income
          supabase
            .from('transactions')
            .select('amount')
            .eq('type', 'income')
            .gte('created_at', firstDayLastMonth)
            .lte('created_at', lastDayLastMonth),
          
          // Last month expenses
          supabase
            .from('transactions')
            .select('amount')
            .eq('type', 'expense')
            .gte('created_at', firstDayLastMonth)
            .lte('created_at', lastDayLastMonth),
            
          // Account balances
          supabase
            .from('user_balances')
            .select('amount')
        ]);
        
        // Handle any errors from the queries
        const errors = [
          currentMonthIncomeResponse.error,
          currentMonthExpenseResponse.error,
          lastMonthIncomeResponse.error,
          lastMonthExpenseResponse.error,
          balancesResponse.error
        ].filter(Boolean);
        
        if (errors.length > 0) {
          console.error('Error fetching financial data:', errors);
          throw new Error('Failed to load some financial data');
        }
        
        // Current month data
        const incomeData = currentMonthIncomeResponse.data || [];
        const expenseData = currentMonthExpenseResponse.data || [];
        
        // Last month data
        const lastMonthIncome = lastMonthIncomeResponse.data?.reduce(
          (sum, item) => sum + parseFloat(item.amount || 0), 0
        ) || 0;
        
        const lastMonthExpense = lastMonthExpenseResponse.data?.reduce(
          (sum, item) => sum + parseFloat(item.amount || 0), 0
        ) || 0;
        
        // Calculate totals
        const totalIncome = incomeData.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
        const totalExpenses = expenseData.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
        const totalSavings = totalIncome - totalExpenses;
        const totalBalances = balancesResponse.data?.reduce(
          (sum, item) => sum + parseFloat(item.amount || 0), 0
        ) || 0;
        
        // Calculate trends (percentage change from last month)
        const incomeTrend = lastMonthIncome === 0 ? 100 : 
          ((totalIncome - lastMonthIncome) / lastMonthIncome) * 100;
          
        const expenseTrend = lastMonthExpense === 0 ? 100 :
          ((totalExpenses - lastMonthExpense) / lastMonthExpense) * 100;
          
        const savingsTrend = lastMonthIncome - lastMonthExpense === 0 ? 100 :
          ((totalSavings - (lastMonthIncome - lastMonthExpense)) / (lastMonthIncome - lastMonthExpense)) * 100;
        
        // Group expenses by category with percentages
        const categories = {};
        let topExpenseCategory = { name: 'None', amount: 0 };
        
        expenseData.forEach(item => {
          const category = item.category || 'Other';
          const amount = parseFloat(item.amount || 0);
          
          if (!categories[category]) {
            categories[category] = { amount: 0, percentage: 0 };
          }
          
          categories[category].amount += amount;
          
          // Track top expense category
          if (categories[category].amount > topExpenseCategory.amount) {
            topExpenseCategory = { name: category, amount: categories[category].amount };
          }
        });
        
        // Calculate percentages of total expenses
        Object.keys(categories).forEach(category => {
          categories[category].percentage = totalExpenses === 0 ? 0 :
            (categories[category].amount / totalExpenses) * 100;
        });
        
        // Daily spending data for charts
        const dailyExpenses = {};
        const dailyIncome = {};
        
        // Create empty entries for all days in the month
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        for (let i = 1; i <= daysInMonth; i++) {
          const dayKey = i.toString().padStart(2, '0');
          dailyExpenses[dayKey] = 0;
          dailyIncome[dayKey] = 0;
        }
        
        // Fill in actual data
        expenseData.forEach(item => {
          const date = new Date(item.created_at);
          const day = date.getDate().toString().padStart(2, '0');
          dailyExpenses[day] = (dailyExpenses[day] || 0) + parseFloat(item.amount || 0);
        });
        
        incomeData.forEach(item => {
          const date = new Date(item.created_at);
          const day = date.getDate().toString().padStart(2, '0');
          dailyIncome[day] = (dailyIncome[day] || 0) + parseFloat(item.amount || 0);
        });
        
        // Convert to array format for charts
        const dailyData = Object.keys(dailyExpenses).map(day => ({
          day: parseInt(day),
          expenses: dailyExpenses[day],
          income: dailyIncome[day]
        }));
        
        // Financial insights
        const insights = [];
        
        if (totalExpenses > totalIncome) {
          insights.push({
            type: 'warning',
            message: 'Your expenses exceed your income this month. Consider reviewing your budget.',
            icon: '⚠️'
          });
        }
        
        if (topExpenseCategory.name !== 'None') {
          insights.push({
            type: 'info',
            message: `Your highest spending category is ${topExpenseCategory.name} at ${Math.round(categories[topExpenseCategory.name].percentage)}% of expenses.`,
            icon: '📊'
          });
        }
        
        if (incomeTrend > 10) {
          insights.push({
            type: 'success',
            message: `Your income has increased by ${Math.round(incomeTrend)}% compared to last month. Great job!`,
            icon: '🎉'
          });
        }
        
        if (expenseTrend < -10) {
          insights.push({
            type: 'success',
            message: `You've reduced expenses by ${Math.round(Math.abs(expenseTrend))}% compared to last month. Keep it up!`,
            icon: '👏'
          });
        }

        // Create the enriched user data object
        const userFinanceData = {
          income: totalIncome,
          expenses: totalExpenses,
          savings: totalSavings,
          categories,
          balances: totalBalances,
          trends: {
            income: incomeTrend,
            expenses: expenseTrend,
            savings: savingsTrend
          },
          dailyData,
          insights,
          lastUpdated: new Date().toISOString(),
          topExpenseCategory: topExpenseCategory.name
        };
        
        setUserData(userFinanceData);
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setDataLoading(false);
      }
    };
    
    loadUserData();
    
    // Set up periodic refresh - every 5 minutes instead of every minute to reduce database load
    const refreshInterval = setInterval(loadUserData, 300000); // Refresh every 5 minutes
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(refreshInterval);
    };
  }, []);

  return (
    <ThemeProvider>
      <CurrencyProvider>
        <Router>
          {!isOnline && (
            <div className="offline-indicator">
              You are currently offline. Some features may be limited.
            </div>
          )}
          <Suspense fallback={<LoadingScreen />}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/balances" element={<SetupBalances />} />
              <Route path="/income/add" element={<AddIncome />} />
              <Route path="/expense/add" element={<AddExpense />} />
              <Route path="/transactions" element={<Transactions />} />
              <Route path="/budgets" element={<BudgetManagement />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <Notifications />
            <AIAssistant userData={userData} />
            <FloatingNav />
          </Suspense>
          <Toaster position="top-right" />
        </Router>
      </CurrencyProvider>
    </ThemeProvider>
  );
}

export default App;
