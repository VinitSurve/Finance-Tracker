import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import { useCurrency } from '../context/CurrencyContext';
import Modal from './Modal';
import { supabase } from '../services/supabaseClient';
import toast from 'react-hot-toast';
import '../styles/components/TransferMoney.css';

const TransferMoney = ({ accounts = [], onTransferComplete }) => {
  const { darkMode } = useTheme();
  const { formatAmount } = useCurrency();
  
  // State management
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Form state
  const [transferData, setTransferData] = useState({
    fromId: '',
    toId: '',
    amount: '',
    note: '',
    date: new Date().toISOString().split('T')[0]
  });

  // Filtered accounts for "to" dropdown (exclude selected "from" account)
  const toAccounts = accounts.filter(acc => acc.id !== transferData.fromId);
  
  // Reset form when modal opens
  useEffect(() => {
    if (isModalOpen && accounts.length > 0) {
      setTransferData({
        fromId: accounts[0]?.id || '',
        toId: accounts.length > 1 ? accounts[1]?.id || '' : '',
        amount: '',
        note: '',
        date: new Date().toISOString().split('T')[0]
      });
      setError(null);
    }
  }, [isModalOpen, accounts]);
  
  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setTransferData(prev => ({
      ...prev,
      [name]: name === 'amount' ? value.replace(/[^0-9.]/g, '') : value
    }));
    
    // Clear error when user fixes the issue
    if (error) setError(null);
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form data
    if (!transferData.fromId) {
      setError("Please select a source account");
      return;
    }
    
    if (!transferData.toId) {
      setError("Please select a destination account");
      return;
    }
    
    if (!transferData.amount || parseFloat(transferData.amount) <= 0) {
      setError("Please enter a valid amount greater than zero");
      return;
    }
    
    // Get account objects for logging and validation
    const fromAccount = accounts.find(acc => acc.id === transferData.fromId);
    const toAccount = accounts.find(acc => acc.id === transferData.toId);
    
    // Check if source account has enough balance
    if (parseFloat(transferData.amount) > parseFloat(fromAccount?.amount || 0)) {
      setError(`Insufficient funds in ${fromAccount?.balance_type?.name || 'source account'}`);
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      // 1. Decrease amount from source account
      const { error: fromError } = await supabase
        .from('user_balances')
        .update({ 
          amount: parseFloat(fromAccount.amount) - parseFloat(transferData.amount) 
        })
        .eq('id', transferData.fromId);
        
      if (fromError) throw fromError;
      
      // 2. Increase amount in destination account
      const { error: toError } = await supabase
        .from('user_balances')
        .update({ 
          amount: parseFloat(toAccount.amount) + parseFloat(transferData.amount)
        })
        .eq('id', transferData.toId);
        
      if (toError) throw toError;
      
      // 3. Create transfer record in the transfers table
      const { error: transferError } = await supabase
        .from('transfers')
        .insert([{
          from_balance_id: transferData.fromId,
          to_balance_id: transferData.toId,
          amount: parseFloat(transferData.amount),
          note: transferData.note || null,
          transfer_date: transferData.date
        }]);
        
      if (transferError) {
        console.error('Error saving transfer record:', transferError);
        // Continue even if transfer record fails (non-critical)
      }
      
      // Success! Close modal and refresh data
      toast.success(`Successfully transferred ${formatAmount(transferData.amount)} from ${fromAccount.balance_type?.name || 'source'} to ${toAccount.balance_type?.name || 'destination'}`);
      setIsModalOpen(false);
      
      // Call callback to refresh parent component data
      if (onTransferComplete) {
        onTransferComplete();
      }
      
    } catch (err) {
      console.error('Error processing transfer:', err);
      setError(err.message || 'Failed to process transfer');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Maximum amount the user can transfer
  const maxAmount = parseFloat(accounts.find(acc => acc.id === transferData.fromId)?.amount || 0);
  
  // Set maximum amount
  const handleSetMaxAmount = () => {
    setTransferData(prev => ({
      ...prev,
      amount: maxAmount.toString()
    }));
  };
  
  // Animation variants for premium feel
  const buttonVariants = {
    hover: { 
      scale: 1.03,
      boxShadow: "0px 8px 20px rgba(34, 197, 94, 0.4)"
    },
    tap: { scale: 0.97 },
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 }
  };

  return (
    <div className="settings-panel transfer-money-panel">
      <div className="transfer-money-header">
        <div className="header-icon">💸</div>
        <h2>Transfer Funds</h2>
      </div>
      
      <motion.button
        className="transfer-money-button"
        onClick={() => setIsModalOpen(true)}
        variants={buttonVariants}
        whileHover="hover"
        whileTap="tap"
        initial="initial"
        animate="animate"
        disabled={accounts.length < 2}
        transition={{ duration: 0.5 }}
      >
        <div className="transfer-button-content">
          <div className="transfer-icon-wrapper">
            <span className="transfer-button-icon">💸</span>
          </div>
          <div className="transfer-button-text-container">
            <span className="transfer-button-title">Transfer Money</span>
            <span className="transfer-button-subtitle">Move funds between accounts</span>
          </div>
        </div>
        <div className="transfer-button-arrow">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </div>
      </motion.button>

      {accounts.length < 2 && (
        <div className="transfer-info-message">
          <span className="info-icon">ℹ️</span>
          <span>Add at least two accounts to enable transfers</span>
        </div>
      )}
      
      <AnimatePresence>
        {isModalOpen && (
          <Modal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            title={<div className="transfer-modal-title">
              <span className="transfer-modal-icon">💸</span>
              <div className="transfer-modal-title-text">
                <h2>Transfer Between Accounts</h2>
                <p>Quick and easy transfers between your accounts</p>
              </div>
            </div>}
            className="transfer-modal"
          >
            <form className="transfer-form" onSubmit={handleSubmit}>
              {error && (
                <motion.div 
                  className="transfer-error"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <span className="error-icon">⚠️</span>
                  <span className="error-text">{error}</span>
                </motion.div>
              )}
              
              <div className="transfer-content">
                <div className="transfer-column from-column">
                  <h3 className="transfer-column-title">From</h3>
                  
                  <div className="transfer-field">
                    <label htmlFor="fromId">Source Account</label>
                    <div className="select-wrapper">
                      <select
                        id="fromId"
                        name="fromId"
                        value={transferData.fromId}
                        onChange={handleInputChange}
                        required
                        disabled={isLoading}
                        className={transferData.fromId ? "has-value" : ""}
                      >
                        <option value="">Select source account</option>
                        {accounts.map(account => (
                          <option key={account.id} value={account.id}>
                            {account.balance_type?.icon || '💰'} {account.balance_type?.name || 'Account'} ({formatAmount(account.amount)})
                          </option>
                        ))}
                      </select>
                    </div>
                    {transferData.fromId && (
                      <div className="account-preview source">
                        <div className="account-preview-icon">
                          {accounts.find(acc => acc.id === transferData.fromId)?.balance_type?.icon || '💰'}
                        </div>
                        <div className="account-preview-details">
                          <div className="account-preview-name">
                            {accounts.find(acc => acc.id === transferData.fromId)?.balance_type?.name || 'Account'}
                          </div>
                          <div className="account-preview-balance">
                            Available: {formatAmount(accounts.find(acc => acc.id === transferData.fromId)?.amount || 0)}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="transfer-direction">
                  <motion.div 
                    className="transfer-arrow"
                    animate={{ 
                      x: [0, 10, 0],
                    }}
                    transition={{ 
                      repeat: Infinity,
                      repeatType: "loop",
                      duration: 2,
                      ease: "easeInOut"
                    }}
                  >
                    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                      <polyline points="12 5 19 12 12 19"></polyline>
                    </svg>
                  </motion.div>
                </div>
                
                <div className="transfer-column to-column">
                  <h3 className="transfer-column-title">To</h3>
                  
                  <div className="transfer-field">
                    <label htmlFor="toId">Destination Account</label>
                    <div className="select-wrapper">
                      <select
                        id="toId"
                        name="toId"
                        value={transferData.toId}
                        onChange={handleInputChange}
                        required
                        disabled={isLoading || !transferData.fromId}
                        className={transferData.toId ? "has-value" : ""}
                      >
                        <option value="">Select destination</option>
                        {toAccounts.map(account => (
                          <option key={account.id} value={account.id}>
                            {account.balance_type?.icon || '💰'} {account.balance_type?.name || 'Account'} ({formatAmount(account.amount)})
                          </option>
                        ))}
                      </select>
                    </div>
                    {transferData.toId && (
                      <div className="account-preview destination">
                        <div className="account-preview-icon">
                          {accounts.find(acc => acc.id === transferData.toId)?.balance_type?.icon || '💰'}
                        </div>
                        <div className="account-preview-details">
                          <div className="account-preview-name">
                            {accounts.find(acc => acc.id === transferData.toId)?.balance_type?.name || 'Account'}
                          </div>
                          <div className="account-preview-balance">
                            Current: {formatAmount(accounts.find(acc => acc.id === transferData.toId)?.amount || 0)}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="transfer-details-section">
                <h3 className="transfer-section-title">Transfer Details</h3>
                
                <div className="transfer-fields-grid">
                  <div className="transfer-field amount-field">
                    <label htmlFor="amount">Amount</label>
                    <div className="amount-input-container">
                      <span className="currency-symbol">₹</span>
                      <input
                        type="text"
                        id="amount"
                        name="amount"
                        value={transferData.amount}
                        onChange={handleInputChange}
                        placeholder="0.00"
                        required
                        disabled={isLoading}
                        className={parseFloat(transferData.amount || 0) > 0 ? "has-value" : ""}
                      />
                      <button 
                        type="button" 
                        className="max-button"
                        onClick={handleSetMaxAmount}
                        disabled={isLoading || !transferData.fromId}
                      >
                        MAX
                      </button>
                    </div>
                    {transferData.fromId && parseFloat(transferData.amount || 0) > maxAmount && (
                      <div className="amount-warning">
                        <span className="warning-icon">⚠️</span>
                        <span>Amount exceeds available balance ({formatAmount(maxAmount)})</span>
                      </div>
                    )}
                    
                    {parseFloat(transferData.amount || 0) > 0 && transferData.fromId && transferData.toId && (
                      <div className="transfer-preview">
                        <div className="transfer-preview-text">
                          <span className="preview-highlight">{formatAmount(transferData.amount)}</span> will be transferred from <span className="preview-highlight">{accounts.find(acc => acc.id === transferData.fromId)?.balance_type?.name}</span> to <span className="preview-highlight">{accounts.find(acc => acc.id === transferData.toId)?.balance_type?.name}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="transfer-field">
                    <label htmlFor="date">Date</label>
                    <input
                      type="date"
                      id="date"
                      name="date"
                      value={transferData.date}
                      onChange={handleInputChange}
                      required
                      disabled={isLoading}
                    />
                  </div>
                  
                  <div className="transfer-field note-field">
                    <label htmlFor="note">
                      Note <span className="optional-label">(Optional)</span>
                    </label>
                    <textarea
                      id="note"
                      name="note"
                      value={transferData.note}
                      onChange={handleInputChange}
                      placeholder="What's this transfer for?"
                      disabled={isLoading}
                      rows="3"
                    ></textarea>
                  </div>
                </div>
              </div>
              
              <div className="transfer-actions">
                <button 
                  type="button" 
                  className="cancel-transfer-button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <motion.button 
                  type="submit" 
                  className="confirm-transfer-button"
                  disabled={
                    isLoading || 
                    !transferData.fromId || 
                    !transferData.toId || 
                    !transferData.amount || 
                    parseFloat(transferData.amount) <= 0 ||
                    parseFloat(transferData.amount) > maxAmount
                  }
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isLoading ? (
                    <div className="loading-indicator">
                      <div className="loading-spinner"></div>
                      <span>Processing...</span>
                    </div>
                  ) : (
                    <>
                      <span className="button-icon">🔄</span>
                      Transfer Money
                    </>
                  )}
                </motion.button>
              </div>
            </form>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TransferMoney;
