import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useCurrency } from '../context/CurrencyContext';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../services/supabaseClient';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';
import CustomReasonManager from '../components/CustomReasonManager';
import '../styles/global/global.css';
import '../styles/pages/AddExpense.css';

// Simple icon components
const BackArrowIcon = () => <span className="text-lg">←</span>;
const CalendarIcon = () => <span className="text-lg">📅</span>;
const NotesIcon = () => <span className="text-lg">📝</span>;

const AddExpense = () => {
  const navigate = useNavigate();
  const { formatAmount, currencySymbol } = useCurrency();
  const { darkMode } = useTheme();

  // State variables
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [isReasonModalOpen, setIsReasonModalOpen] = useState(false);
  const [customReasons, setCustomReasons] = useState([]);
  const [animateAmount, setAnimateAmount] = useState(false);
  const [formSubmitAttempted, setFormSubmitAttempted] = useState(false);

  // Additional states for stats
  const [monthlyExpense, setMonthlyExpense] = useState(0);
  const [averageExpense, setAverageExpense] = useState(0);
  const [topExpenseCategory, setTopExpenseCategory] = useState('');
  const [lastExpenseDate, setLastExpenseDate] = useState('');

  // Hard-coded user ID since this is a single-user application
  const userId = '1'; // Replace with your actual user ID from your database

  // Add loading state for accounts
  const [accountsLoading, setAccountsLoading] = useState(true);

  // Predefined expense categories with icons
  const expenseCategories = [
    { id: 'food', name: 'Food & Dining', icon: '🍔', color: '#FF5722' },
    { id: 'transport', name: 'Transport', icon: '🚗', color: '#2196F3' },
    { id: 'housing', name: 'Housing', icon: '🏠', color: '#9C27B0' },
    { id: 'entertainment', name: 'Entertainment', icon: '🎬', color: '#E91E63' },
    { id: 'shopping', name: 'Shopping', icon: '🛍️', color: '#FF9800' },
    { id: 'healthcare', name: 'Healthcare', icon: '🏥', color: '#4CAF50' },
    { id: 'travel', name: 'Travel', icon: '✈️', color: '#03A9F4' },
    { id: 'bills', name: 'Bills', icon: '📱', color: '#F44336' },
    { id: 'education', name: 'Education', icon: '📚', color: '#3F51B5' }
  ];

  // Smart spending tips
  const smartTips = [
    "Use the 50/30/20 rule: 50% needs, 30% wants, 20% savings 💰",
    "Track regular expenses to identify saving opportunities 📊",
    "Wait 24 hours before making non-essential purchases 🕒",
    "Compare prices before making significant purchases ✅",
    "Consider using cash for discretionary spending to be more mindful 💵"
  ];

  // Get category-specific tips
  const getCategoryTip = () => {
    switch(category) {
      case 'food':
        return "Plan meals ahead and make a shopping list to avoid impulse purchases.";
      case 'transport':
        return "Consider carpooling or public transport to reduce daily commute costs.";
      case 'housing':
        return "Perform regular maintenance to prevent costly emergency repairs.";
      case 'entertainment':
        return "Look for free or low-cost entertainment options in your community.";
      case 'shopping':
        return "Create a 30-day wishlist for non-essential items to reduce impulse buying.";
      case 'healthcare':
        return "Consider preventive care to avoid more expensive treatments later.";
      case 'travel':
        return "Book flights and accommodations well in advance for better deals.";
      case 'bills':
        return "Review subscriptions regularly and cancel those you rarely use.";
      case 'education':
        return "Look for scholarships, grants, and free educational resources online.";
      default:
        return "Always ask yourself if this expense aligns with your financial goals.";
    }
  };

  // Fetch user's expense statistics
  useEffect(() => {
    const fetchExpenseStats = async () => {
      try {
        // Get current month's expenses - using proper column name 'created_at' instead of 'date'
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const { data: monthExpenses, error: monthError } = await supabase
          .from('transactions')
          .select('amount, category, created_at')
          .eq('type', 'expense')  
          .gte('created_at', firstDayOfMonth.toISOString())
          .lte('created_at', lastDayOfMonth.toISOString());

        if (monthError) {
          console.error('Error fetching monthly expenses:', monthError.message);
          throw monthError;
        }

        // Calculate total and average - handle case where data might be null
        if (monthExpenses && Array.isArray(monthExpenses)) {
          const total = monthExpenses.reduce((sum, expense) => {
            const expenseAmount = Math.abs(parseFloat(expense.amount || 0));
            return sum + expenseAmount;
          }, 0);

          setMonthlyExpense(total);
          setAverageExpense(monthExpenses.length > 0 ? total / monthExpenses.length : 0);
        }

        // Get all expenses for finding top category and last expense date
        const { data: allExpenses, error: allError } = await supabase
          .from('transactions')
          .select('amount, category, created_at')
          .eq('type', 'expense')
          .order('created_at', { ascending: false });

        if (allError) {
          console.error('Error fetching all expenses:', allError.message);
          throw allError;
        }

        if (allExpenses && allExpenses.length > 0) {
          const categoryTotals = {};

          allExpenses.forEach(expense => {
            if (!expense.category) return;

            const category = expense.category;
            const amount = Math.abs(parseFloat(expense.amount || 0));

            if (!categoryTotals[category]) {
              categoryTotals[category] = 0;
            }

            categoryTotals[category] += amount;
          });

          let topCategory = 'None';
          let maxAmount = 0;

          Object.entries(categoryTotals).forEach(([category, total]) => {
            if (total > maxAmount) {
              maxAmount = total;
              topCategory = category;
            }
          });

          setTopExpenseCategory(topCategory);

          if (allExpenses[0]) {
            const lastExpenseDate = new Date(allExpenses[0].created_at);
            const diffTime = Math.abs(now - lastExpenseDate);
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

            const lastExpenseText = diffDays === 0 ? 'Today' : 
                                  diffDays === 1 ? 'Yesterday' : 
                                  `${diffDays} days ago`;

            setLastExpenseDate(lastExpenseText);
          }
        } else {
          setMonthlyExpense(0);
          setAverageExpense(0);
          setTopExpenseCategory('None');
          setLastExpenseDate('No expenses yet');
        }

      } catch (error) {
        console.error('Error fetching expense statistics:', error);
        toast.error('Error loading expense statistics');

        setMonthlyExpense(0);
        setAverageExpense(0);
        setTopExpenseCategory('None');
        setLastExpenseDate('No data available');
      }
    };

    fetchExpenseStats();

    const fetchCustomReasons = async () => {
      try {
        const { data, error } = await supabase
          .from('custom_reasons')
          .select('*')
          .eq('reason_type', 'expense')
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (data && Array.isArray(data)) {
          setCustomReasons(data);
        }
      } catch (error) {
        console.error('Error loading expense reasons:', error);
        toast.error('Failed to load expense reasons');
      }
    };

    fetchCustomReasons();
  }, []);

  // Fetch real accounts from database
  useEffect(() => {
    const fetchAccounts = async () => {
      setAccountsLoading(true);

      try {
        console.log("Fetching accounts for single user application");

        // Modified query using correct columns
        const { data, error } = await supabase
          .from('user_balances')
          .select(`
            id,
            amount,
            balance_type_id,
            balance_types:balance_type_id (id, name, icon)
          `);

        if (error) {
          console.error("Error fetching accounts:", error);
          throw error;
        }

        if (data && Array.isArray(data) && data.length > 0) {
          // Transform data for UI using available columns
          const formattedAccounts = data.map(account => ({
            id: account.id,
            name: account.balance_types?.name || 'Unnamed Account',
            balance: parseFloat(account.amount) || 0,
            icon: account.balance_types?.icon || '💰',
            balance_type_id: account.balance_type_id
          }));

          console.log('Formatted accounts:', formattedAccounts);
          setAccounts(formattedAccounts);

          if (formattedAccounts.length > 0 && !selectedAccount) {
            setSelectedAccount(formattedAccounts[0].id);
          }
        } else {
          console.log("No accounts found");
        }
      } catch (error) {
        console.error('Failed to load accounts:', error);
        toast.error(`Failed to load accounts: ${error.message}`);
      } finally {
        setAccountsLoading(false);
      }
    };

    fetchAccounts();
  }, []);

  const handleOpenReasonModal = () => {
    setIsReasonModalOpen(true);
  };

  const handleCloseReasonModal = () => {
    setIsReasonModalOpen(false);
  };

  const handleSelectCategory = (categoryId) => {
    setCategory(categoryId);
    setErrors({...errors, category: null});

    setCustomReason('');
  };

  const handleAccountSelect = (accountId) => {
    setSelectedAccount(accountId);
    if (errors.account) {
      setErrors({...errors, account: null});
    }
  };

  const handleAmountChange = (e) => {
    const value = e.target.value;
    const regex = /^[0-9]*\.?[0-9]*$/;

    if (value === '' || regex.test(value)) {
      setAmount(value);
      setAnimateAmount(true);
      setTimeout(() => setAnimateAmount(false), 300);

      if (errors.amount) {
        setErrors({...errors, amount: null});
      }
    }
  };

  const handleReasonChange = (e) => {
    setCustomReason(e.target.value);
    if (errors.customReason) {
      setErrors({...errors, customReason: null});
    }
  };

  const handleReasonAdded = (newReason) => {
    const reasonWithCategory = {
      ...newReason,
      category: category || null
    };

    setCustomReasons([reasonWithCategory, ...customReasons]);
    setCustomReason(reasonWithCategory.reason_text);

    if (errors.customReason) {
      setErrors({...errors, customReason: null});
    }

    toast.success(`New reason "${reasonWithCategory.reason_text}" added successfully!`);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!amount || parseFloat(amount) <= 0) {
      newErrors.amount = 'Please enter a valid amount';
    }

    if (!category) {
      newErrors.category = 'Please select a category';
    }

    if (!customReason) {
      newErrors.customReason = 'Please enter a reason for this expense';
    }

    if (!selectedAccount) {
      newErrors.account = 'Please select an account';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setFormSubmitAttempted(true);

    if (!validateForm()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);

    try {
      const selectedAcct = accounts.find(acc => acc.id === selectedAccount);
      if (!selectedAcct) throw new Error("Selected account not found");

      const categoryName = expenseCategories.find(cat => cat.id === category)?.name || category;

      // Create transaction data that matches the actual table schema
      // Note: Using created_at for timestamp, not setting 'date' field since it doesn't exist
      const expenseData = {
        balance_type_id: selectedAcct.balance_type_id,
        amount: parseFloat(amount) * -1, // Make amount negative for expenses
        category: categoryName,
        type: 'expense',
        note: notes || null,
        reason: customReason,
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('transactions')
        .insert([expenseData])
        .select();

      if (error) throw error;

      const newBalance = parseFloat(selectedAcct.balance) - parseFloat(amount);
      const { error: updateError } = await supabase
        .from('user_balances')
        .update({ amount: newBalance })
        .eq('id', selectedAccount);

      if (updateError) throw updateError;

      toast.success('Expense added successfully!');
      navigate('/dashboard', { state: { message: 'Expense added successfully!' } });
    } catch (error) {
      toast.error('Failed to add expense: ' + error.message);
      console.error('Error adding expense:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredReasons = category
    ? customReasons.filter(reason => !reason.category || reason.category === category)
    : customReasons;

  return (
    <div className={`add-expense-page ${darkMode ? 'dark' : 'light'}-mode`}>
      <div className="add-expense-container">
        <motion.div 
          className="add-expense-header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1>Add Expense</h1>
          <p>Track your spending to manage your financial journey</p>
        </motion.div>
        
        <div className="add-expense-content">
          <motion.div 
            className="add-expense-sidebar"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="expense-stats-panel">
              <div className="expense-stat-item">
                <div className="expense-stat-icon">📉</div>
                <div className="expense-stat-details">
                  <div className="expense-stat-label">This Month's Expenses</div>
                  <div className="expense-stat-value">
                    {monthlyExpense ? formatAmount(monthlyExpense) : formatAmount(0)}
                  </div>
                </div>
              </div>
              
              <div className="expense-stat-item">
                <div className="expense-stat-icon">📊</div>
                <div className="expense-stat-details">
                  <div className="expense-stat-label">Average Expense</div>
                  <div className="expense-stat-value">
                    {averageExpense ? formatAmount(averageExpense) : formatAmount(0)}
                  </div>
                </div>
              </div>
              
              <div className="expense-stat-item">
                <div className="expense-stat-icon">🔝</div>
                <div className="expense-stat-details">
                  <div className="expense-stat-label">Top Expense Category</div>
                  <div className="expense-stat-value">
                    {topExpenseCategory || 'None'}
                  </div>
                </div>
              </div>
              
              <div className="expense-stat-item">
                <div className="expense-stat-icon">⏱️</div>
                <div className="expense-stat-details">
                  <div className="expense-stat-label">Last Expense</div>
                  <div className="expense-stat-value">
                    {lastExpenseDate || 'No data'}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="ai-tips-panel">
              <div className="ai-tips-header">
                <div className="ai-tips-icon">💡</div>
                <div className="ai-tips-title">Smart Spending Tips</div>
              </div>
              
              {smartTips.map((tip, index) => (
                <div className="ai-tip-item" key={index}>
                  <div className="ai-tip-text">{tip}</div>
                </div>
              ))}
              
              {category && (
                <motion.div 
                  className="ai-tip-item"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <div className="ai-tip-text">
                    <strong>{expenseCategories.find(c => c.id === category)?.name} tip:</strong> {getCategoryTip()}
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
          
          <motion.div
            className="add-expense-main"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <form className="add-expense-form-panel" onSubmit={handleSubmit}>
              <div className="form-section">
                <h3>Expense Details</h3>
                
                <div className="form-group amount-group">
                  <label htmlFor="amount">Amount</label>
                  <div className="amount-input">
                    <span className="currency-symbol">{currencySymbol}</span>
                    <motion.input
                      animate={animateAmount ? { scale: [1, 1.03, 1] } : {}}
                      type="text"
                      id="amount"
                      name="amount"
                      value={amount}
                      onChange={handleAmountChange}
                      placeholder="0.00"
                      disabled={isSubmitting}
                      className={formSubmitAttempted && errors.amount ? "error-border" : ""}
                    />
                    {animateAmount && (
                      <motion.span
                        className="money-emoji"
                        initial={{ opacity: 0, y: 10, scale: 0.8 }}
                        animate={{ opacity: [0, 1, 0], y: [-10, -20], scale: 1 }}
                        transition={{ duration: 0.7 }}
                      >
                        💸
                      </motion.span>
                    )}
                  </div>
                  {formSubmitAttempted && errors.amount && (
                    <div className="field-error-message">{errors.amount}</div>
                  )}
                </div>
                
                <div className="form-group">
                  <label>Expense Category</label>
                  <div className={`category-grid ${formSubmitAttempted && errors.category ? "error-container" : ""}`}>
                    {expenseCategories.map((cat) => (
                      <motion.div
                        key={cat.id}
                        whileHover={{ y: -4, boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleSelectCategory(cat.id)}
                        className={`category-item ${category === cat.id ? 'selected' : ''}`}
                        style={{
                          borderColor: category === cat.id ? cat.color : 
                                     formSubmitAttempted && errors.category ? 'var(--color-error)' : 'var(--color-border)',
                          backgroundColor: category === cat.id ? `${cat.color}10` : 'var(--color-secondaryBg)'
                        }}
                      >
                        <div 
                          className="category-icon"
                          style={{ backgroundColor: `${cat.color}20` }}
                        >
                          <span>{cat.icon}</span>
                        </div>
                        <div className="category-name">{cat.name}</div>
                        {category === cat.id && <div className="category-check" style={{ backgroundColor: cat.color }}>✓</div>}
                      </motion.div>
                    ))}
                  </div>
                  {formSubmitAttempted && errors.category && (
                    <div className="field-error-message">{errors.category}</div>
                  )}
                </div>
                
                <div className="form-group custom-reason-group">
                  <div className="reason-label-container">
                    <label htmlFor="customReason">Reason</label>
                    <motion.button
                      type="button"
                      className="add-custom-reason-btn"
                      onClick={handleOpenReasonModal}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      disabled={!category}
                    >
                      + Add Custom Reason
                    </motion.button>
                  </div>
                  <div className="reason-select-container">
                    <select
                      id="customReason"
                      name="customReason"
                      value={customReason}
                      onChange={handleReasonChange}
                      disabled={isSubmitting || !category}
                      className={`reason-select ${formSubmitAttempted && errors.customReason ? "error-border" : ""}`}
                    >
                      <option value="">Select a reason</option>
                      {filteredReasons.map((reason) => (
                        <option key={reason.id} value={reason.reason_text}>
                          {reason.reason_text}
                        </option>
                      ))}
                    </select>
                  </div>
                  {formSubmitAttempted && errors.customReason && (
                    <div className="field-error-message">{errors.customReason}</div>
                  )}
                  {category && filteredReasons.length === 0 && (
                    <motion.div 
                      className="no-reasons-message"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                    >
                      <span className="no-reasons-icon">📝</span>
                      <span>No reasons found for {expenseCategories.find(c => c.id === category)?.name}. Add a custom reason.</span>
                    </motion.div>
                  )}
                  {!category && (
                    <motion.div 
                      className="no-reasons-message"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                    >
                      <span className="no-reasons-icon">ℹ️</span>
                      <span>Please select a category first to see relevant reasons.</span>
                    </motion.div>
                  )}
                </div>
              </div>
              
              <div className="form-section">
                <h3>Payment Details</h3>
                
                <div className="form-group">
                  <label>Select Account</label>
                  {accountsLoading ? (
                    <div className="accounts-loading">
                      <p>Loading your accounts...</p>
                      <div className="spinner"></div>
                    </div>
                  ) : accounts && accounts.length > 0 ? (
                    <div className={`accounts-grid ${formSubmitAttempted && errors.account ? "error-container" : ""}`}>
                      {accounts.map((account) => (
                        <motion.div 
                          key={account.id}
                          whileHover={{ y: -4, boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleAccountSelect(account.id)}
                          className={`account-card ${selectedAccount === account.id ? 'selected' : ''}`}
                          style={{
                            borderColor: selectedAccount === account.id ? 'var(--color-error)' : 
                                       formSubmitAttempted && errors.account ? 'var(--color-error)' : 'var(--color-border)'
                          }}
                        >
                          <div className="account-icon">
                            {account.icon || '💰'}
                          </div>
                          <div className="account-details">
                            <div className="account-name">{account.name}</div>
                            <div className="account-balance">{formatAmount(account.balance)}</div>
                          </div>
                          {selectedAccount === account.id && (
                            <motion.div 
                              className="account-check"
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: "spring", stiffness: 500, damping: 15 }}
                            >
                              ✓
                            </motion.div>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="no-accounts-message">
                      <p>No accounts found. Please add an account first.</p>
                      <button 
                        type="button"
                        className="add-account-btn"
                        onClick={() => navigate('/balances')}
                      >
                        + Add Account
                      </button>
                    </div>
                  )}
                  {formSubmitAttempted && errors.account && (
                    <div className="field-error-message">{errors.account}</div>
                  )}
                </div>
                
                <div className="form-group date-group">
                  <label htmlFor="date">Transaction Date</label>
                  <div className="date-input-container">
                    <span className="date-icon">📅</span>
                    <input
                      type="date"
                      id="date"
                      name="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="date-input"
                      max={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label htmlFor="notes">Notes (Optional)</label>
                  <textarea
                    id="notes"
                    name="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any additional notes here..."
                    className="notes-textarea"
                    rows="3"
                  />
                </div>
              </div>
              
              <div className="form-actions">
                <button 
                  type="button" 
                  className="cancel-button"
                  onClick={() => navigate(-1)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <motion.button 
                  type="submit" 
                  className="submit-button expense-submit"
                  disabled={isSubmitting}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  {isSubmitting ? (
                    <>
                      <span className="button-spinner"></span>
                      <span>Adding...</span>
                    </>
                  ) : (
                    <>
                      <span>Add Expense</span>
                      <span className="submit-icon">💸</span>
                    </>
                  )}
                </motion.button>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
      
      <Modal 
        isOpen={isReasonModalOpen}
        onClose={handleCloseReasonModal}
      >
        <CustomReasonManager 
          reasonType="expense"
          category={category}
          categoryName={expenseCategories.find(c => c.id === category)?.name}
          userId={userId}
          onClose={handleCloseReasonModal}
          onReasonAdded={handleReasonAdded}
        />
      </Modal>
    </div>
  );
};

export default AddExpense;