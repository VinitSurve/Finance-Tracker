import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import { useCurrency } from '../context/CurrencyContext';
import { usePointsSystem } from '../hooks/usePointsSystem';
import { supabase } from '../services/supabaseClient';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';
import CustomReasonManager from '../components/CustomReasonManager';
import '../styles/pages/AddIncome.css';

const AddIncome = () => {
  const { darkMode } = useTheme();
  const { formatAmount, currencySymbol } = useCurrency();
  const { addPoints } = usePointsSystem();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    category: '',
    description: '',
    accountId: '',
    customReason: ''
  });
  
  const [aiTips, setAiTips] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [animateAmount, setAnimateAmount] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);
  const [customReasons, setCustomReasons] = useState([]);
  const [isCustomReasonModalOpen, setIsCustomReasonModalOpen] = useState(false);
  const [incomeStats, setIncomeStats] = useState({
    monthlyTotal: 0,
    averageIncome: 0,
    recentIncome: 0,
    incomeCount: 0
  });
  const [formSubmitAttempted, setFormSubmitAttempted] = useState(false);
  
  const categories = ['Salary', 'Gift', 'Cashback', 'Freelance', 'Investment Return', 'Others'];

  // Load accounts data
  useEffect(() => {
    const loadAccounts = async () => {
      try {
        setIsLoadingAccounts(true);
        
        const { data, error } = await supabase
          .from('user_balances')
          .select(`
            id,
            amount,
            balance_type_id,
            balance_type:balance_type_id (
              id,
              name,
              icon
            )
          `);
        
        if (error) {
          throw error;
        }
        
        const formattedAccounts = data.map(item => ({
          id: item.id,
          balance_type_id: item.balance_type_id,
          name: item.balance_type?.name || 'Account',
          icon: item.balance_type?.icon || '💰',
          balance: parseFloat(item.amount || 0)
        }));
        
        setAccounts(formattedAccounts);
        
        if (formattedAccounts.length > 0) {
          setFormData(prev => ({ ...prev, accountId: formattedAccounts[0].id }));
        }
      } catch (error) {
        console.error('Failed to load accounts:', error);
        toast.error('Failed to load your accounts');
      } finally {
        setIsLoadingAccounts(false);
      }
    };
    
    loadAccounts();
    loadIncomeStats();
    generateAiTips();
  }, []);

  // Load custom reasons with correct field name (reason_type instead of type)
  useEffect(() => {
    const loadCustomReasons = async () => {
      try {
        console.log("Fetching custom income reasons...");
        // Use reason_type instead of type
        const { data, error } = await supabase
          .from('custom_reasons')
          .select('*')
          .eq('reason_type', 'income') // Using reason_type instead of type
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        console.log("Received income reasons from DB:", data);
        
        if (data && Array.isArray(data)) {
          setCustomReasons(data);
        } else {
          console.warn("No income reasons found or invalid data structure");
          setCustomReasons([]);
        }
      } catch (error) {
        console.error('Error loading income reasons:', error);
        setCustomReasons([]);
      }
    };

    loadCustomReasons();
  }, []);

  // Load income statistics
  const loadIncomeStats = async () => {
    try {
      // Get current month's data
      const currentDate = new Date();
      const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString();
      const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString();
      
      // Fetch monthly income total
      const { data: monthlyData, error: monthlyError } = await supabase
        .from('transactions')
        .select('amount')
        .eq('type', 'income')
        .gte('created_at', firstDayOfMonth)
        .lte('created_at', lastDayOfMonth);
      
      if (monthlyError) throw monthlyError;
      
      // Calculate monthly total
      const monthlyTotal = monthlyData.reduce((sum, transaction) => sum + parseFloat(transaction.amount || 0), 0);
      
      // Fetch all income transactions for average calculation
      const { data: allIncomeData, error: allIncomeError } = await supabase
        .from('transactions')
        .select('amount, created_at')
        .eq('type', 'income')
        .order('created_at', { ascending: false });
      
      if (allIncomeError) throw allIncomeError;
      
      // Calculate average income
      const totalIncome = allIncomeData.reduce((sum, transaction) => sum + parseFloat(transaction.amount || 0), 0);
      const averageIncome = allIncomeData.length > 0 ? totalIncome / allIncomeData.length : 0;
      
      // Get most recent income amount
      const recentIncome = allIncomeData.length > 0 ? parseFloat(allIncomeData[0].amount || 0) : 0;
      
      setIncomeStats({
        monthlyTotal,
        averageIncome,
        recentIncome,
        incomeCount: allIncomeData.length
      });
      
    } catch (error) {
      console.error('Error loading income statistics:', error);
    }
  };

  // Generate AI tips based on data
  const generateAiTips = () => {
    const tips = [
      "Consider saving 20% of your income for future goals! 🚀",
      "Track your income sources to identify your most profitable activities.",
      "Set up automatic transfers to savings when you receive income.",
      "Remember: paying yourself first is key to building wealth. 💰",
      "Compare your income month-over-month to track your financial growth."
    ];
    setAiTips(tips);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'amount') {
      const regex = /^[0-9]*\.?[0-9]*$/;
      if (value === '' || regex.test(value)) {
        setFormData({ ...formData, [name]: value });
        setAnimateAmount(true);
        setTimeout(() => setAnimateAmount(false), 300);
      }
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setFormSubmitAttempted(true);
    
    if (!formData.amount) {
      toast.error("Please enter an amount");
      return;
    }
    
    if (!formData.category) {
      toast.error("Please select a category");
      return;
    }
    
    if (!formData.accountId) {
      toast.error("Please select an account");
      return;
    }
    
    if (!formData.customReason) {
      toast.error("Please select a reason");
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Ensure amount is a proper number
      const incomeAmount = parseFloat(parseFloat(formData.amount).toFixed(2));
      
      // Validate the amount is positive
      if (isNaN(incomeAmount) || incomeAmount <= 0) {
        toast.error("Please enter a valid positive amount");
        setIsSubmitting(false);
        return;
      }
      
      // Get the selected account
      const selectedAccount = accounts.find(acc => acc.id === formData.accountId);
      
      // Create the transaction record with the correct balance_type_id
      const transactionData = {
        amount: incomeAmount,
        category: formData.category,
        type: 'income',
        note: formData.description || null,
        reason: formData.customReason || null,
        balance_type_id: selectedAccount.balance_type_id,
        created_at: formData.date ? new Date(formData.date).toISOString() : new Date().toISOString()
      };
      
      const { data, error } = await supabase
        .from('transactions')
        .insert([transactionData])
        .select();
      
      if (error) {
        throw error;
      }
      
      // Update the account balance
      const newBalance = (selectedAccount.balance || 0) + incomeAmount;
      
      const { error: updateError } = await supabase
        .from('user_balances')
        .update({ amount: newBalance })
        .eq('id', formData.accountId);
      
      if (updateError) {
        throw updateError;
      }
      
      await addPoints(2, 'Income recorded');
      
      new Audio('/sounds/cash-register.mp3').play().catch(e => console.log('Sound play failed:', e));
      
      toast.success(`Income of ${formatAmount(incomeAmount)} added successfully! ✨`);
      
      navigate('/dashboard');
    } catch (error) {
      console.error('Error adding income:', error);
      toast.error("Failed to add income. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReasonAdded = (newReason) => {
    console.log("New income reason added:", newReason);
    // Make sure we're correctly using reason_type instead of type
    const formattedReason = {
      id: newReason.id || Date.now().toString(),
      reason_text: newReason.reason_text,
      reason_type: 'income',  // Use reason_type instead of type
      category: newReason.category || formData.category || ''
    };
    
    // Update state with the new reason
    setCustomReasons(prevReasons => {
      const updated = [formattedReason, ...prevReasons];
      console.log("Updated income reasons:", updated);
      return updated;
    });
    
    // Set the selected reason
    setFormData(prev => ({
      ...prev,
      customReason: formattedReason.reason_text
    }));
  };

  return (
    <div className={`add-income-page ${darkMode ? 'dark' : 'light'}-mode`}>
      <div className="add-income-container">
        <motion.div 
          className="add-income-header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1>Add Income</h1>
          <p>Record your latest earnings and grow your finances</p>
        </motion.div>
        
        <div className="add-income-content">
          {/* Sidebar with Stats and Tips */}
          <motion.div 
            className="add-income-sidebar"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {/* Income Stats Panel */}
            <div className="income-stats-panel">
              <div className="income-stat-item">
                <div className="income-stat-icon">📊</div>
                <div className="income-stat-details">
                  <div className="income-stat-label">This Month's Income</div>
                  <div className="income-stat-value">{formatAmount(incomeStats.monthlyTotal)}</div>
                </div>
              </div>
              
              <div className="income-stat-item">
                <div className="income-stat-icon">📈</div>
                <div className="income-stat-details">
                  <div className="income-stat-label">Average Income</div>
                  <div className="income-stat-value">{formatAmount(incomeStats.averageIncome)}</div>
                </div>
              </div>
              
              <div className="income-stat-item">
                <div className="income-stat-icon">🔄</div>
                <div className="income-stat-details">
                  <div className="income-stat-label">Latest Income</div>
                  <div className="income-stat-value">{formatAmount(incomeStats.recentIncome)}</div>
                </div>
              </div>
              
              <div className="income-stat-item">
                <div className="income-stat-icon">🧮</div>
                <div className="income-stat-details">
                  <div className="income-stat-label">Total Entries</div>
                  <div className="income-stat-value">{incomeStats.incomeCount}</div>
                </div>
              </div>
            </div>
            
            {/* AI Tips Panel */}
            <div className="ai-tips-panel">
              <div className="ai-tips-header">
                <div className="ai-tips-icon">💡</div>
                <div className="ai-tips-title">Smart Tips</div>
              </div>
              
              {aiTips.map((tip, index) => (
                <div className="ai-tip-item" key={index}>
                  <div className="ai-tip-text">{tip}</div>
                </div>
              ))}
            </div>
          </motion.div>
          
          {/* Main Form Content */}
          <motion.div
            className="add-income-main"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <form className="add-income-form-panel" onSubmit={handleSubmit}>
              {/* Income Amount Section */}
              <div className="form-section">
                <h3>Income Details</h3>
                
                <div className="form-group amount-group">
                  <label htmlFor="amount">Amount</label>
                  <div className="amount-input">
                    <span className="currency-symbol">{currencySymbol}</span>
                    <motion.input
                      animate={animateAmount ? { scale: [1, 1.03, 1] } : {}}
                      type="text"
                      id="amount"
                      name="amount"
                      value={formData.amount}
                      onChange={handleInputChange}
                      placeholder="0.00"
                      disabled={isSubmitting}
                    />
                    {animateAmount && (
                      <motion.span
                        className="money-emoji"
                        initial={{ opacity: 0, y: 10, scale: 0.8 }}
                        animate={{ opacity: [0, 1, 0], y: [-10, -20], scale: 1 }}
                        transition={{ duration: 0.7 }}
                      >
                        💰
                      </motion.span>
                    )}
                  </div>
                </div>
                
                <div className="form-group">
                  <label htmlFor="category">Source Category</label>
                  <select
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                  >
                    <option value="">Select category</option>
                    {categories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group custom-reason-group">
                  <div className="reason-label-container">
                    <label htmlFor="customReason">Reason</label>
                    <button
                      type="button"
                      className="add-custom-reason-btn"
                      onClick={() => setIsCustomReasonModalOpen(true)}
                    >
                      + Add Custom Reason
                    </button>
                  </div>
                  <select
                    id="customReason"
                    name="customReason"
                    value={formData.customReason}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                    className={formSubmitAttempted && !formData.customReason ? "error-border" : ""}
                    required
                  >
                    <option value="">Select a reason</option>
                    
                    {/* Explicitly map all custom reasons without any filters */}
                    {customReasons && customReasons.map(reason => (
                      <option 
                        key={`reason-${reason.id}-${reason.reason_text}`}
                        value={reason.reason_text}
                      >
                        {reason.reason_text}
                      </option>
                    ))}
                  </select>
                  
                  {formSubmitAttempted && !formData.customReason && (
                    <div style={{ color: 'red', fontSize: '0.8rem', marginTop: '0.3rem' }}>
                      Please select a reason or add a custom one
                    </div>
                  )}
                </div>
              </div>
              
              {/* Account and Date Section */}
              <div className="form-section">
                <h3>Account Information</h3>
                
                <div className="form-group">
                  <label htmlFor="accountId">Select Account</label>
                  {isLoadingAccounts ? (
                    <div className="loading-accounts">Loading accounts...</div>
                  ) : accounts.length === 0 ? (
                    <div className="no-accounts-message">
                      <p>No accounts found. Please add an account first.</p>
                      <button 
                        type="button"
                        className="add-account-btn"
                        onClick={() => navigate('/balances')}
                      >
                        Add Account
                      </button>
                    </div>
                  ) : (
                    <select
                      id="accountId"
                      name="accountId"
                      value={formData.accountId}
                      onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                      disabled={isSubmitting}
                    >
                      <option value="">Select account</option>
                      {accounts.map(account => (
                        <option key={account.id} value={account.id}>
                          {account.icon} {account.name} ({formatAmount(account.balance)})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                
                <div className="form-group">
                  <label htmlFor="date">Transaction Date</label>
                  <input
                    type="date"
                    id="date"
                    name="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="description">Notes (Optional)</label>
                  <textarea
                    id="description"
                    name="description"
                    rows="3"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Add any additional details about this income"
                    disabled={isSubmitting}
                  />
                </div>
              </div>
              
              {/* Form Actions */}
              <div className="form-actions">
                <button 
                  type="button" 
                  className="cancel-button"
                  onClick={() => navigate('/dashboard')}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <motion.button 
                  type="submit" 
                  className="submit-button"
                  disabled={isSubmitting || accounts.length === 0}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  {isSubmitting ? 'Saving...' : 'Add Income'}
                </motion.button>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
      
      <Modal 
        isOpen={isCustomReasonModalOpen}
        onClose={() => setIsCustomReasonModalOpen(false)}
      >
        <CustomReasonManager 
          reasonType="income"
          category={formData.category || undefined}
          onClose={() => setIsCustomReasonModalOpen(false)}
          onReasonAdded={handleReasonAdded}
        />
      </Modal>
    </div>
  );
};

export default AddIncome;