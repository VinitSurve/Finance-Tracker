import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getReasonsByType, getReasonsByCategoryAndType, addCustomReason } from '../services/reasonService';
import '../styles/components/CustomReasonSelector.css';

const CustomReasonSelector = ({
  value,
  onChange,
  reasonType,
  categoryId,
  label = "Reason",
  placeholder = "Select a reason (optional)",
  allowAddNew = true,
  disabled = false,
}) => {
  const [reasons, setReasons] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newReasonText, setNewReasonText] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchReasons = async () => {
      if (!reasonType) return;
      
      try {
        setIsLoading(true);
        let data;
        
        if (categoryId) {
          data = await getReasonsByCategoryAndType(reasonType, categoryId);
        } else {
          data = await getReasonsByType(reasonType);
        }
        
        setReasons(data || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching reasons:', err);
        setError('Failed to load reasons');
      } finally {
        setIsLoading(false);
      }
    };

    fetchReasons();
  }, [reasonType, categoryId]);

  const handleAddReason = async (e) => {
    e.preventDefault();
    if (!newReasonText.trim()) return;

    try {
      setIsAdding(true);
      const newReason = await addCustomReason({
        reason_type: reasonType,
        reason_text: newReasonText.trim(),
        category_id: categoryId,
      });
      
      setReasons([...reasons, newReason]);
      setNewReasonText('');
      setIsAdding(false);
      setError(null);
      
      // Select the newly added reason
      onChange(newReason.id);
    } catch (err) {
      console.error('Error adding reason:', err);
      setError('Failed to add new reason');
      setIsAdding(false);
    }
  };

  return (
    <div className="reason-selector">
      <label htmlFor="reason-select">
        {label}
        {!categoryId && reasonType !== 'transaction' && <span className="required-hint">(Select a category first)</span>}
      </label>
      
      {isLoading ? (
        <div className="reason-loading">Loading reasons...</div>
      ) : (
        <div className="reason-select-container">
          <select
            id="reason-select"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="reason-select"
            disabled={disabled || (!categoryId && reasonType !== 'transaction')}
          >
            <option value="">{placeholder}</option>
            {reasons.map((reason) => (
              <option key={reason.id} value={reason.id}>
                {reason.reason_text}
              </option>
            ))}
          </select>
          
          {allowAddNew && (
            <button 
              type="button"
              className="add-reason-btn"
              onClick={() => setIsAdding(!isAdding)}
              disabled={disabled || (!categoryId && reasonType !== 'transaction')}
              aria-label={isAdding ? "Cancel adding reason" : "Add new reason"}
            >
              {isAdding ? '✕' : '+'}
            </button>
          )}
        </div>
      )}
      
      <AnimatePresence>
        {isAdding && (
          <motion.form 
            className="add-reason-form"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            onSubmit={handleAddReason}
          >
            <input
              type="text"
              value={newReasonText}
              onChange={(e) => setNewReasonText(e.target.value)}
              placeholder="Enter new reason"
              className="new-reason-input"
              disabled={isAdding && disabled}
              autoFocus
            />
            <button 
              type="submit" 
              className="save-reason-btn"
              disabled={!newReasonText.trim() || (isAdding && disabled)}
            >
              Add
            </button>
          </motion.form>
        )}
      </AnimatePresence>
      
      {error && <div className="reason-error">{error}</div>}
    </div>
  );
};

export default CustomReasonSelector;
