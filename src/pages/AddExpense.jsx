import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import { useCurrency } from '../context/CurrencyContext';
import { supabase } from '../services/supabaseClient';
import { usePointsSystem } from '../hooks/usePointsSystem';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';
import CustomReasonManager from '../components/CustomReasonManager';
import '../styles/pages/AddExpense.css';

const AddExpense = () => {
  const { darkMode } = useTheme();
  const { formatAmount, currencySymbol } = useCurrency();
  const { addPoints } = usePointsSystem();
  const navigate = useNavigate();

  // Form state
  const [formData, setFormData] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    category: '',
    description: '',
    accountId: '',
    customReason: ''
  });

  // Other state variables
  const [budgets, setBudgets] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOverBudget, setIsOverBudget] = useState(false);
  const [overspendCategory, setOverspendCategory] = useState('');
  const [spentAmount, setSpentAmount] = useState({});
  const [animateAmount, setAnimateAmount] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);
  const [customReasons, setCustomReasons] = useState([]);
  const [isCustomReasonModalOpen, setIsCustomReasonModalOpen] = useState(false);
  const [formSubmitAttempted, setFormSubmitAttempted] = useState(false);
  
  // Budget insights
  const [budgetInsights, setBudgetInsights] = useState({
    monthlyTotal: 0,
    averageExpense: 0,
    categoriesOverBudget: [],
    biggestExpenseCategory: ''
  });

  const categories = [
    'Food', 'Transport', 'Shopping', 'Entertainment',
    'Bills', 'Investment', 'Others'
  ];

  // Smart tips for expenses
  const [smartTips, setSmartTips] = useState([
    "Try the 50/30/20 rule - 50% needs, 30% wants, 20% savings 💰",
    "Track recurring expenses to identify subscription waste 📊",
    "Consider bulk buying essentials to save money long-term 🛒",
    "Check your budget before major purchases to stay on track ✅",
    "Look for cashback opportunities on your regular expenses 💸"
  ]);

  // Load accounts data
  useEffect(() => {
    loadAccounts();
    loadBudgetData();
    loadExpenseInsights();
  }, []);

  // Load custom reasons
  useEffect(() => {
    const loadCustomReasons = async () => {
      try {
        console.log("Fetching expense reasons...");
        const { data, error } = await supabase
          .from('custom_reasons')
          .select('*')
          .eq('reason_type', 'expense')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        console.log("Received expense reasons from DB:", data);
        
        if (data && Array.isArray(data)) {
          setCustomReasons(data);
        } else {
          console.warn("No expense reasons found");
          setCustomReasons([]);
        }
      } catch (error) {
        console.error('Error loading expense reasons:', error);
        setCustomReasons([]);
      }
    };

    loadCustomReasons();
  }, []);

  // Check if over budget when amount or category changes
  useEffect(() => {
    if (formData.category && formData.amount) {
      checkBudgetStatus();
    } else {
      setIsOverBudget(false);
      setOverspendCategory('');
    }
  }, [formData.category, formData.amount, budgets, spentAmount]);

  // Load accounts from database
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

      if (error) throw error;

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

  // Load budget data
  const loadBudgetData = async () => {
    try {
      const date = new Date();
      const monthYear = `${date.toLocaleString('default', { month: 'long' })} ${date.getFullYear()}`;

      const { data: budgetData, error: budgetError } = await supabase
        .from('budgets')
        .select('category, amount')
        .eq('month_year', monthYear);

      if (budgetError) throw budgetError;

      const budgetObj = {};
      (budgetData || []).forEach(budget => {
        budgetObj[budget.category] = parseFloat(budget.amount);
      });
      setBudgets(budgetObj);

      const startDate = new Date(date.getFullYear(), date.getMonth(), 1).toISOString();
      const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString();

      const { data: expenseData, error: expenseError } = await supabase
        .from('transactions')
        .select('category, amount')
        .eq('type', 'expense')
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      if (expenseError) throw expenseError;

      const spentByCategory = {};
      (expenseData || []).forEach(expense => {
        const cat = expense.category || 'Others';
        spentByCategory[cat] = (spentByCategory[cat] || 0) + parseFloat(expense.amount);
      });

      setSpentAmount(spentByCategory);
    } catch (error) {
      console.error('Error loading budget data:', error);
    }
  };

  // Load expense insights
  const loadExpenseInsights = async () => {
    try {
      const date = new Date();
      const startDate = new Date(date.getFullYear(), date.getMonth(), 1).toISOString();
      const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString();

      // Get all expenses for current month
      const { data: expenseData, error: expenseError } = await supabase
        .from('transactions')
        .select('category, amount')
        .eq('type', 'expense')
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      if (expenseError) throw expenseError;

      // Get all expenses for historical data
      const { data: allExpenseData, error: allExpenseError } = await supabase
        .from('transactions')
        .select('amount, category')
        .eq('type', 'expense');

      if (allExpenseError) throw allExpenseError;

      // Calculate monthly total
      const monthlyTotal = expenseData.reduce((sum, expense) => sum + parseFloat(expense.amount || 0), 0);

      // Calculate average expense
      const totalAmount = allExpenseData.reduce((sum, expense) => sum + parseFloat(expense.amount || 0), 0);
      const averageExpense = allExpenseData.length > 0 ? totalAmount / allExpenseData.length : 0;

      // Calculate categories over budget
      const categoriesOverBudget = Object.keys(spentAmount)
        .filter(category => budgets[category] && spentAmount[category] > budgets[category] * 0.9)
        .map(category => ({ 
          name: category, 
          spent: spentAmount[category], 
          budget: budgets[category],
          percentage: (spentAmount[category] / budgets[category]) * 100
        }));

      // Find biggest expense category
      let biggestCategory = '';
      let biggestAmount = 0;

      Object.keys(spentAmount).forEach(category => {
        if (spentAmount[category] > biggestAmount) {
          biggestAmount = spentAmount[category];
          biggestCategory = category;
        }
      });

      setBudgetInsights({
        monthlyTotal,
        averageExpense,
        categoriesOverBudget,
        biggestExpenseCategory: biggestCategory
      });

      // Update smart tips based on insights
      updateSmartTips(categoriesOverBudget, biggestCategory);

    } catch (error) {
      console.error('Error loading expense insights:', error);
    }
  };

  // Update smart tips based on user's data
  const updateSmartTips = (overBudgetCategories, biggestCategory) => {
    const newTips = [...smartTips];
    
    if (overBudgetCategories.length > 0) {
      const category = overBudgetCategories[0].name;
      newTips.unshift(`Warning: You're over budget in ${category}! Consider cutting back. ⚠️`);
    }
    
    if (biggestCategory) {
      newTips.push(`Your highest expense is ${biggestCategory}. Look for ways to reduce this category. 🔍`);
    }
    
    setSmartTips(newTips.slice(0, 5)); // Keep only 5 tips
  };

  // Check if over budget
  const checkBudgetStatus = () => {
    const amount = parseFloat(formData.amount);
    const budgetAmount = budgets[formData.category] || 0;

    if (budgetAmount <= 0) return;

    const currentSpent = spentAmount[formData.category] || 0;
    const newTotal = currentSpent + amount;

    if (newTotal >= budgetAmount * 0.9) {
      setIsOverBudget(true);
      setOverspendCategory(formData.category);
    } else {
      setIsOverBudget(false);
      setOverspendCategory('');
    }
  };

  // Handle input changes
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

  // Handle new custom reason
  const handleReasonAdded = (newReason) => {
    console.log("New expense reason added:", newReason);
    const formattedReason = {
      ...newReason,
      reason_type: 'expense'
    };
    
    setCustomReasons([formattedReason, ...customReasons]);
    setFormData({ ...formData, customReason: formattedReason.reason_text });
  };

  // Handle form submission
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

    try {
      setIsSubmitting(true);

      const selectedAccount = accounts.find(acc => acc.id === formData.accountId);
      const expenseAmount = parseFloat(parseFloat(formData.amount).toFixed(2));

      if (isNaN(expenseAmount) || expenseAmount <= 0) {
        toast.error("Please enter a valid positive amount");
        setIsSubmitting(false);
        return;
      }

      if (selectedAccount.balance < expenseAmount) {
        toast.error(`Insufficient balance in ${selectedAccount.name}`);
        setIsSubmitting(false);
        return;
      }

      const transactionData = {
        amount: expenseAmount,
        category: formData.category,
        type: 'expense',
        note: formData.description || null,
        reason: formData.customReason || null,
        balance_type_id: selectedAccount.balance_type_id,
        created_at: formData.date ? new Date(formData.date).toISOString() : new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('transactions')
        .insert([transactionData])
        .select();

      if (error) throw error;

      const newBalance = selectedAccount.balance - expenseAmount;

      const { error: updateError } = await supabase
        .from('user_balances')
        .update({ amount: newBalance })
        .eq('id', formData.accountId);

      if (updateError) throw updateError;

      if (isOverBudget) {
        await addPoints(-2, `Overspent on ${formData.category} budget`);
        new Audio('/sounds/warning.mp3').play().catch(e => console.log('Sound play failed:', e));
        toast.error(`Warning: You're over 90% of your ${formData.category} budget! -2 points`);
      } else {
        new Audio('/sounds/click.mp3').play().catch(e => console.log('Sound play failed:', e));
        toast.success(`Expense of ${formatAmount(expenseAmount)} added successfully!`);
      }

      navigate('/dashboard');
    } catch (error) {
      console.error('Error adding expense:', error);
      toast.error("Failed to add expense. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter reasons based on selected category
  const filteredReasons = formData.category
    ? customReasons.filter(reason => !reason.category || reason.category === formData.category)
    : customReasons;

  // Get category-specific expense tips
  const getCategoryTips = () => {
    switch (formData.category) {
      case 'Food':
        return "Try meal prepping to reduce food expenses and eating out less frequently.";
      case 'Transport':
        return "Consider carpooling or public transport to save on fuel and parking costs.";
      case 'Shopping':
        return "Make a shopping list and stick to it to avoid impulse purchases.";
      case 'Entertainment':
        return "Look for free or discounted entertainment options in your community.";
      case 'Bills':
        return "Review your subscriptions regularly and cancel unused services.";
      default:
        return "Track your expenses to identify patterns and opportunities to save.";
    }
  };

  return (
    <div className={`add-expense-page ${darkMode ? 'dark' : 'light'}-mode`}>
      <div className="expense-container">
        <motion.div 
          className="expense-header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1>Add Expense</h1>
          <p>Track your spending to keep your finances in check</p>
        </motion.div>
        
        <div className="expense-content">
          {/* Sidebar with Stats and Tips */}
          <motion.div 
            className="expense-sidebar"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {/* Expense Stats Panel */}
            <div className="expense-stats-panel">
              <div className="expense-stat-item">
                <div className="expense-stat-icon">📊</div>
                <div className="expense-stat-details">
                  <div className="expense-stat-label">This Month's Expenses</div>
                  <div className="expense-stat-value">{formatAmount(budgetInsights.monthlyTotal)}</div>
                </div>
              </div>
              
              <div className="expense-stat-item">
                <div className="expense-stat-icon">📉</div>
                <div className="expense-stat-details">
                  <div className="expense-stat-label">Average Transaction</div>
                  <div className="expense-stat-value">{formatAmount(budgetInsights.averageExpense)}</div>
                </div>
              </div>
              
              {budgetInsights.biggestExpenseCategory && (
                <div className="expense-stat-item">
                  <div className="expense-stat-icon">🔝</div>
                  <div className="expense-stat-details">
                    <div className="expense-stat-label">Top Expense Category</div>
                    <div className="expense-stat-value">{budgetInsights.biggestExpenseCategory}</div>
                  </div>
                </div>
              )}
              
              {budgetInsights.categoriesOverBudget.length > 0 && (
                <div className="expense-stat-item warning-stat">
                  <div className="expense-stat-icon warning-icon">⚠️</div>
                  <div className="expense-stat-details">
                    <div className="expense-stat-label">Budget Warning</div>
                    <div className="expense-stat-value">{budgetInsights.categoriesOverBudget.length} categories over budget</div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Smart Tips Panel */}
            <div className="smart-tips-panel">
              <div className="smart-tips-header">
                <div className="smart-tips-icon">💡</div>
                <div className="smart-tips-title">Smart Saving Tips</div>
              </div>
              
              {smartTips.map((tip, index) => (
                <div className="smart-tip-item" key={index}>
                  <div className="smart-tip-text">{tip}</div>
                </div>
              ))}
              
              {formData.category && (
                <div className="category-tip-item">
                  <div className="category-tip-label">{formData.category} Tip:</div>
                  <div className="category-tip-text">{getCategoryTips()}</div>
                </div>
              )}
            </div>
          </motion.div>
          
          {/* Main Form Content */}
          <motion.div
            className="expense-main"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <form className="expense-form-panel" onSubmit={handleSubmit}>
              {/* Expense Amount Section */}
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
                      value={formData.amount}
                      onChange={handleInputChange}
                      placeholder="0.00"
                      disabled={isSubmitting}
                      className="standard-size-input"
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
                </div>
                
                <div className="form-group">
                  <label htmlFor="category">Expense Category</label>
                  <select
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                    className="category-select"
                  >
                    <option value="">Select category</option>
                    {categories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>

                  {formData.category && budgets[formData.category] && (
                    <div className="budget-indicator">
                      <div className="budget-stats">
                        <span>Current Budget: {formatAmount(budgets[formData.category])}</span>
                        <span>Spent: {formatAmount((spentAmount[formData.category] || 0))}</span>
                        <span>Remaining: {formatAmount(budgets[formData.category] - (spentAmount[formData.category] || 0))}</span>
                      </div>
                      <div className="budget-progress">
                        <div
                          className="budget-progress-bar"
                          style={{
                            width: `${Math.min(100, ((spentAmount[formData.category] || 0) / budgets[formData.category]) * 100)}%`,
                            backgroundColor: isOverBudget ? 'var(--color-error)' : 'var(--color-success)'
                          }}
                        ></div>
                      </div>
                      <div className="budget-progress-text">
                        {Math.round((spentAmount[formData.category] || 0) / budgets[formData.category] * 100)}% of budget used
                      </div>
                    </div>
                  )}
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
                  >
                    <option value="">Select a reason (optional)</option>
                    {filteredReasons.map(reason => (
                      <option key={reason.id} value={reason.reason_text}>
                        {reason.reason_text}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              {/* Account and Date Section */}
              <div className="form-section">
                <h3>Payment Details</h3>
                
                <div className="form-group">
                  <label htmlFor="accountId">Select Account</label>
                  {isLoadingAccounts ? (
                    <div className="loading-accounts">
                      <div className="loading-spinner"></div>
                      <span>Loading accounts...</span>
                    </div>
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
                    <div className="accounts-list">
                      {accounts.map(account => (
                        <div 
                          key={account.id} 
                          className={`account-card ${formData.accountId === account.id ? 'selected' : ''}`}
                          onClick={() => setFormData({...formData, accountId: account.id})}
                        >
                          <div className="account-icon">{account.icon}</div>
                          <div className="account-details">
                            <div className="account-name">{account.name}</div>
                            <div className="account-balance">{formatAmount(account.balance)}</div>
                          </div>
                          {formData.accountId === account.id && (
                            <div className="account-selected-indicator">✓</div>
                          )}
                        </div>
                      ))}
                    </div>
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
                    className="date-input"
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
                    placeholder="Add details about this expense..."
                    disabled={isSubmitting}
                    className="notes-textarea"
                  ></textarea>
                </div>
              </div>
              
              {/* Budget Warning */}
              {isOverBudget && (
                <motion.div
                  className="budget-warning"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <div className="warning-icon">⚠️</div>
                  <div className="warning-content">
                    <div className="warning-title">Budget Alert!</div>
                    <div className="warning-text">
                      This expense will put you over 90% of your {overspendCategory} budget. 
                      Consider if this is necessary or if it can wait.
                    </div>
                  </div>
                </motion.div>
              )}
              
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
                  {isSubmitting ? (
                    <><span className="button-spinner"></span> Saving...</>
                  ) : (
                    'Add Expense'
                  )}
                </motion.button>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
      
      {/* Modal for custom reasons */}
      <Modal 
        isOpen={isCustomReasonModalOpen}
        onClose={() => setIsCustomReasonModalOpen(false)}
      >
        <CustomReasonManager 
          reasonType="expense"
          category={formData.category || undefined}
          onClose={() => setIsCustomReasonModalOpen(false)}
          onReasonAdded={handleReasonAdded}
        />
      </Modal>
    </div>
  );
};

export default AddExpense;