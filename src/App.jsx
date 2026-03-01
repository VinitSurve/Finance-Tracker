import { lazy, Suspense, useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './context/ThemeContext';
import { CurrencyProvider } from './context/CurrencyContext';
import { AuthProvider } from './context/AuthContext'; 
import FloatingNav from './components/FloatingNav';
import AIAssistant from './components/AIAssistant';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import LoadingScreen from './components/LoadingScreen';
import Notifications from './components/Notifications';
import { supabase } from './services/supabaseClient';
import './styles/variables.css'; 
import './styles/global/global.css'; 
import './styles/App.css';

// Lazy load pages for better performance
const Dashboard = lazy(() => import('./pages/Dashboard'));
const SetupBalances = lazy(() => import('./pages/SetupBalances'));
const AddIncome = lazy(() => import('./pages/AddIncome'));
const AddExpense = lazy(() => import('./pages/AddExpense'));
const Transactions = lazy(() => import('./pages/Transactions'));
const Settings = lazy(() => import('./pages/Settings'));
const NotFound = lazy(() => import('./pages/NotFound'));
const PointsPage = lazy(() => import('./pages/PointsPage'));
const BudgetManagement = lazy(() => import('./pages/BudgetManagement'));
const Login = lazy(() => import('./pages/Login'));

// Protected Route wrapper
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

function App() {
  // State for offline detection
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Effect to check online status
  useEffect(() => {
    // Update network status
    const handleStatusChange = () => {
      setIsOnline(navigator.onLine);
    };

    // Listen to the online status
    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);

    return () => {
      // Cleanup
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
    };
  }, []);

  // Effect to load user data
  useEffect(() => {
    async function getUserData() {
      try {
        setLoading(true);
        
        // Get current user session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          setUserData(session.user);
        }
      } catch (error) {
        console.error('Error getting user data:', error);
      } finally {
        setLoading(false);
      }
    }
    
    getUserData();
    
    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUserData(session.user);
      } else {
        setUserData(null);
      }
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <ThemeProvider>
      <CurrencyProvider>
        <AuthProvider>
          {!isOnline && (
            <div className="offline-indicator">
              You are currently offline. Some features may be limited.
            </div>
          )}
          <Suspense fallback={<LoadingScreen />}>
            <Routes>
              {/* Public route */}
              <Route path="/login" element={<Login />} />
              
              {/* Protected routes */}
              <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/balances" element={<ProtectedRoute><SetupBalances /></ProtectedRoute>} />
              <Route path="/transactions" element={<ProtectedRoute><Transactions /></ProtectedRoute>} />
              <Route path="/add-income" element={<ProtectedRoute><AddIncome /></ProtectedRoute>} />
              <Route path="/add-expense" element={<ProtectedRoute><AddExpense /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/points" element={<ProtectedRoute><PointsPage /></ProtectedRoute>} />
              <Route path="/budgets" element={<ProtectedRoute><BudgetManagement /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <Notifications />
            <AIAssistant userData={userData} />
            <FloatingNav />
          </Suspense>
          <Toaster position="top-right" />
        </AuthProvider>
      </CurrencyProvider>
    </ThemeProvider>
  );
}

export default App;
