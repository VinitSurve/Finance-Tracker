import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import { useCurrency } from '../context/CurrencyContext';
import { supabase } from '../services/supabaseClient';
import { usePointsSystem } from '../hooks/usePointsSystem';
import { getCustomReasonsByType } from '../services/reasonService';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';
import CustomReasonManager from '../components/CustomReasonManager';
import '../styles/pages/AddExpense.css';

const AddExpense = () => {
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

  const categories = [
    'Food', 'Transport', 'Shopping', 'Entertainment',
    'Bills', 'Investment', 'Others'
  ];

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
          balance_type_id: item.balance_type_id, // Store the balance_type_id
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
  }, []);

  useEffect(() => {
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

    loadBudgetData();
  }, []);

  useEffect(() => {
    const loadCustomReasons = async () => {
      try {
        const reasonsData = await getCustomReasonsByType('expense');
        setCustomReasons(reasonsData);
      } catch (error) {
        console.error('Error loading custom reasons:', error);
      }
    };

    loadCustomReasons();
  }, []);

  useEffect(() => {
    if (formData.category && formData.amount) {
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
    } else {
      setIsOverBudget(false);
      setOverspendCategory('');
    }
  }, [formData.category, formData.amount, budgets, spentAmount]);

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

  const handleReasonAdded = (newReason) => {
    setCustomReasons([newReason, ...customReasons]);
    setFormData({ ...formData, customReason: newReason.reason_text });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

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
        balance_type_id: selectedAccount.balance_type_id, // Use the correct foreign key
        created_at: formData.date ? new Date(formData.date).toISOString() : new Date().toISOString()
      };

      console.log('Transaction data being sent:', transactionData);

      const { data, error } = await supabase
        .from('transactions')
        .insert([transactionData])
        .select();

      if (error) {
        console.error('Error details:', error);
        throw error;
      }

      const newBalance = selectedAccount.balance - expenseAmount;

      const { error: updateError } = await supabase
        .from('user_balances')
        .update({ amount: newBalance })
        .eq('id', formData.accountId);

      if (updateError) {
        console.error('Error updating balance:', updateError);
        throw updateError;
      }

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

  const filteredReasons = formData.category
    ? customReasons.filter(reason => !reason.category || reason.category === formData.category)
    : customReasons;

  return (
    <div className={`add-expense-container ${darkMode ? 'dark' : 'light'}-mode`}>
      <section className="form-header">
        <motion.div
          className="header-content"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1>Add Expense</h1>
          <p>Record your latest spending</p>
        </motion.div>
      </section>

      <motion.form
        className="expense-form"
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
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
                💸
              </motion.span>
            )}
          </div>
        </div>

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
              className="account-select"
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
              <div className="budget-progress">
                <div
                  className="budget-progress-bar"
                  style={{
                    width: `${Math.min(100, ((spentAmount[formData.category] || 0) / budgets[formData.category]) * 100)}%`,
                    backgroundColor: isOverBudget ? '#ef4444' : '#10b981'
                  }}
                ></div>
              </div>
              <div className="budget-text">
                {formatAmount((spentAmount[formData.category] || 0))} of {formatAmount(budgets[formData.category])} budget
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
          >
            <option value="">Select a reason (optional)</option>
            {filteredReasons.map(reason => (
              <option key={reason.id} value={reason.reason_text}>
                {reason.reason_text}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="date">Date</label>
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
          <input
            type="text"
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="E.g., Dinner with friends"
            disabled={isSubmitting}
            className="notes-input"
          />
        </div>

        {isOverBudget && (
          <motion.div
            className="budget-warning"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="warning-icon">⚠️</div>
            <div className="warning-text">
              <strong>Warning:</strong> This expense will put you over 90% of your {overspendCategory} budget!
            </div>
          </motion.div>
        )}

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
            {isSubmitting ? 'Saving...' : 'Save Expense'}
          </motion.button>
        </div>
      </motion.form>

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