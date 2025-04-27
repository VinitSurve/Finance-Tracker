import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import { useCurrency } from '../context/CurrencyContext';
import { usePointsSystem } from '../hooks/usePointsSystem';
import { supabase } from '../services/supabaseClient';
import { getCustomReasonsByType } from '../services/reasonService';
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
  
  const [showTip, setShowTip] = useState(false);
  const [aiTip, setAiTip] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [animateAmount, setAnimateAmount] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);
  const [customReasons, setCustomReasons] = useState([]);
  const [isCustomReasonModalOpen, setIsCustomReasonModalOpen] = useState(false);
  
  const categories = ['Salary', 'Gift', 'Cashback', 'Freelance', 'Investment Return', 'Others'];
  
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
    if (formData.amount && parseFloat(formData.amount) > 1000) {
      const tips = [
        "Consider saving 20% of this income for future goals! 🚀",
        "Great job on the income! How about investing 15% of it? 📈",
        `Setting aside ${formatAmount(parseFloat(formData.amount) * 0.1)} could help your emergency fund grow! 🛡️`,
        "Remember: paying yourself first is key to building wealth. 💰",
        "Split this into 50% needs, 30% wants, and 20% savings for better financial health! ✨"
      ];
      setAiTip(tips[Math.floor(Math.random() * tips.length)]);
      setShowTip(true);
    } else {
      setShowTip(false);
    }
  }, [formData.amount]);

  useEffect(() => {
    const loadCustomReasons = async () => {
      try {
        const reasonsData = await getCustomReasonsByType('income');
        setCustomReasons(reasonsData);
      } catch (error) {
        console.error('Error loading custom reasons:', error);
      }
    };

    loadCustomReasons();
  }, []);

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
      
      // Update the account balance
      const newBalance = (selectedAccount.balance || 0) + incomeAmount;
      
      const { error: updateError } = await supabase
        .from('user_balances')
        .update({ amount: newBalance })
        .eq('id', formData.accountId);
      
      if (updateError) {
        console.error('Error updating balance:', updateError);
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
    setCustomReasons([newReason, ...customReasons]);
    setFormData(prev => ({ ...prev, customReason: newReason.reason_text }));
  };

  const filteredReasons = formData.category 
    ? customReasons.filter(reason => !reason.category || reason.category === formData.category) 
    : customReasons;
  
  return (
    <div className={`add-income-container ${darkMode ? 'dark' : 'light'}-mode`}>
      <section className="form-header">
        <motion.div
          className="header-content"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1>Add Income</h1>
          <p>Record your latest earnings</p>
        </motion.div>
      </section>
      
      <motion.form 
        className="income-form"
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
                💰
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
          <label htmlFor="category">Source Category</label>
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
            placeholder="E.g., Salary bonus for April"
            disabled={isSubmitting}
            className="notes-input"
          />
        </div>
        
        {showTip && (
          <motion.div 
            className="ai-tip"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="tip-icon">💡</div>
            <div className="tip-text">
              <strong>Smart Tip:</strong> {aiTip}
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
            {isSubmitting ? 'Saving...' : 'Save Income'}
          </motion.button>
        </div>
      </motion.form>

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