import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { addCustomReason, getCustomReasonsByType, deleteCustomReason } from '../services/reasonService';
import toast from 'react-hot-toast';
import '../styles/components/CustomReasonManager.css';

const CustomReasonManager = ({ reasonType = 'income', category, onClose, onReasonAdded }) => {
  const [reasons, setReasons] = useState([]);
  const [newReason, setNewReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState('add'); // 'add' or 'browse'
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [expandedReason, setExpandedReason] = useState(null);

  useEffect(() => {
    loadReasons();
  }, [reasonType]);

  const loadReasons = async () => {
    try {
      const data = await getCustomReasonsByType(reasonType);
      setReasons(data);
    } catch (error) {
      console.error('Error loading reasons:', error);
      toast.error('Failed to load custom reasons');
    }
  };

  const handleAddReason = async (e) => {
    e.preventDefault();
    
    if (!newReason.trim()) {
      toast.error('Please enter a reason');
      return;
    }

    try {
      setIsLoading(true);
      
      const reasonData = {
        reason_text: newReason.trim(),
        type: reasonType,
        category: category
      };
      
      const addedReason = await addCustomReason(reasonData);
      
      setReasons([addedReason, ...reasons]);
      setNewReason('');
      setSelectedTab('browse');
      
      toast.success('Custom reason added successfully!', {
        style: {
          border: '1px solid #10b981',
          padding: '16px',
          color: '#10b981',
        },
        iconTheme: {
          primary: '#10b981',
          secondary: '#FFFAEE',
        },
      });
      
      if (onReasonAdded) {
        onReasonAdded(addedReason);
      }
    } catch (error) {
      console.error('Error adding reason:', error);
      toast.error('Failed to add custom reason');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteReason = async (id) => {
    setConfirmDelete(null);
    
    if (isDeleting) return;
    
    try {
      setIsDeleting(true);
      await deleteCustomReason(id);
      setReasons(reasons.filter(reason => reason.id !== id));
      
      toast.success('Custom reason deleted', {
        style: {
          border: '1px solid #ef4444',
          padding: '16px',
          color: '#ef4444',
        },
        iconTheme: {
          primary: '#ef4444',
          secondary: '#FFFAEE',
        },
      });
      
    } catch (error) {
      console.error('Error deleting reason:', error);
      toast.error('Failed to delete custom reason');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredReasons = searchQuery
    ? reasons.filter(reason => 
        reason.reason_text.toLowerCase().includes(searchQuery.toLowerCase()))
    : reasons;
    
  const getTitle = () => {
    switch(reasonType) {
      case 'income': return 'Income Reasons';
      case 'expense': return 'Expense Reasons';
      case 'budget': return 'Budget Reasons';
      default: return 'Custom Reasons';
    }
  };
  
  const getThemeColor = () => {
    switch(reasonType) {
      case 'income': return 'success';
      case 'expense': return 'error';
      case 'budget': return 'primary';
      default: return 'primary';
    }
  };
  
  const themeColor = getThemeColor();

  return (
    <motion.div 
      className={`custom-reason-manager theme-${themeColor}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
    >
      <div className="reason-manager-header">
        <div className="reason-title-container">
          <div className="reason-icon">
            {reasonType === 'income' ? '💰' : reasonType === 'expense' ? '💸' : '🎯'}
          </div>
          <div className="reason-title-content">
            <h3 className="reason-manager-title">{getTitle()}</h3>
            <p className="reason-manager-subtitle">
              {reasonType === 'income' 
                ? 'Organize your income sources' 
                : reasonType === 'expense' 
                ? 'Track why you spend money' 
                : 'Define your budget purposes'}
            </p>
          </div>
        </div>
        <button className="close-icon-button" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>
      
      <div className="reason-manager-tabs">
        <button 
          className={`tab-button ${selectedTab === 'add' ? 'active' : ''}`}
          onClick={() => setSelectedTab('add')}
        >
          <span className="tab-icon">+</span>
          <span>Add New</span>
        </button>
        <button 
          className={`tab-button ${selectedTab === 'browse' ? 'active' : ''}`}
          onClick={() => setSelectedTab('browse')}
        >
          <span className="tab-icon">🔍</span>
          <span>Browse ({reasons.length})</span>
        </button>
      </div>
      
      <div className="reason-manager-content">
        <AnimatePresence mode="wait">
          {selectedTab === 'add' ? (
            <motion.div
              key="add-form"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="add-reason-section"
            >
              <form className="reason-form" onSubmit={handleAddReason}>
                <div className="input-container">
                  <input
                    type="text"
                    value={newReason}
                    onChange={(e) => setNewReason(e.target.value)}
                    placeholder="Enter a custom reason..."
                    disabled={isLoading}
                    className="reason-input"
                    autoFocus
                  />
                  <motion.button 
                    type="submit" 
                    className="add-reason-button"
                    disabled={isLoading || !newReason.trim()}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {isLoading ? 
                      <span className="loading-spinner"></span> : 
                      selectedTab === 'add' ? 'Add Reason' : 'Save'
                    }
                  </motion.button>
                </div>
                
                {category && (
                  <div className="category-tag">
                    <span className="tag-text">Category: {category}</span>
                  </div>
                )}
                
                <div className="helper-text">
                  {reasonType === 'income' ? 
                    'Examples: Monthly Salary, Freelance Project, Dividend Payment' : 
                    reasonType === 'expense' ? 
                    'Examples: Groceries Shopping, Utility Bill, Coffee with Friends' : 
                    'Examples: Emergency Fund, Vacation Savings, Home Repair Budget'}
                </div>
              </form>
              
              {reasons.length > 0 && (
                <div className="quick-select-section">
                  <h4>Recently Added</h4>
                  <div className="quick-reasons">
                    {reasons.slice(0, 3).map(reason => (
                      <motion.div 
                        key={reason.id}
                        className="quick-reason-item"
                        whileHover={{ scale: 1.03 }}
                        onClick={() => {
                          if (onReasonAdded) {
                            onReasonAdded(reason);
                            onClose();
                          }
                        }}
                      >
                        <span className="reason-chip-text">{reason.reason_text}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="browse-section"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
              className="browse-reason-section"
            >
              {reasons.length > 0 ? (
                <>
                  <div className="search-container">
                    <div className="search-icon">🔍</div>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search reasons..."
                      className="search-input"
                    />
                    {searchQuery && (
                      <button 
                        className="clear-search"
                        onClick={() => setSearchQuery('')}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  
                  <div className="reasons-list">
                    <AnimatePresence>
                      {filteredReasons.length === 0 ? (
                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="no-reasons"
                        >
                          No matching reasons found
                        </motion.div>
                      ) : (
                        filteredReasons.map(reason => (
                          <motion.div 
                            layout
                            key={reason.id} 
                            className={`reason-item ${expandedReason === reason.id ? 'expanded' : ''}`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                          >
                            <div 
                              className="reason-content" 
                              onClick={() => {
                                if (confirmDelete !== reason.id) {
                                  setExpandedReason(expandedReason === reason.id ? null : reason.id);
                                }
                              }}
                            >
                              <div className="reason-text-container">
                                <span className="reason-indicator"></span>
                                <span className="reason-text">{reason.reason_text}</span>
                              </div>
                              
                              <div className="reason-actions">
                                {confirmDelete === reason.id ? (
                                  <div className="confirm-delete">
                                    <span>Delete?</span>
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteReason(reason.id);
                                      }}
                                      className="confirm-yes"
                                    >
                                      Yes
                                    </button>
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setConfirmDelete(null);
                                      }}
                                      className="confirm-no"
                                    >
                                      No
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (onReasonAdded) {
                                          onReasonAdded(reason);
                                          onClose();
                                        }
                                      }}
                                      className="select-reason-button"
                                      aria-label="Use this reason"
                                    >
                                      Use
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setConfirmDelete(reason.id);
                                      }}
                                      className="delete-reason-button"
                                      disabled={isDeleting}
                                      aria-label="Delete reason"
                                    >
                                      ×
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                            
                            <AnimatePresence>
                              {expandedReason === reason.id && (
                                <motion.div 
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  className="reason-details"
                                >
                                  <div className="detail-item">
                                    <span className="detail-label">Created:</span>
                                    <span className="detail-value">
                                      {new Date(reason.created_at).toLocaleDateString()}
                                    </span>
                                  </div>
                                  {reason.category && (
                                    <div className="detail-item">
                                      <span className="detail-label">Category:</span>
                                      <span className="detail-value category-value">
                                        {reason.category}
                                      </span>
                                    </div>
                                  )}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        ))
                      )}
                    </AnimatePresence>
                  </div>
                </>
              ) : (
                <div className="empty-reasons">
                  <div className="empty-icon">🗒️</div>
                  <h4>No {reasonType} reasons yet</h4>
                  <p>Create your first reason to get started!</p>
                  <button 
                    className="create-first-reason" 
                    onClick={() => setSelectedTab('add')}
                  >
                    Create Your First Reason
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      <div className="reason-manager-actions">
        <motion.button 
          onClick={onClose} 
          className="close-button"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Close
        </motion.button>
      </div>
    </motion.div>
  );
};

export default CustomReasonManager;
