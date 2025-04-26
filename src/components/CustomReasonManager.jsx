import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  getCustomReasonsByType, 
  getCustomReasonsByTypeAndCategory, 
  addCustomReason, 
  updateCustomReason, 
  deleteCustomReason 
} from '../services/reasonService';
import toast from 'react-hot-toast';
import '../styles/components/CustomReasonManager.css';

const CustomReasonManager = ({ reasonType, categoryId, onClose, onReasonAdded }) => {
  const [reasons, setReasons] = useState([]);
  const [newReason, setNewReason] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchReasons = async () => {
      setIsLoading(true);
      try {
        let data;
        if (categoryId) {
          data = await getCustomReasonsByTypeAndCategory(reasonType, categoryId);
        } else {
          data = await getCustomReasonsByType(reasonType);
        }
        
        // Map the category data to match the expected format
        const formattedData = data.map(item => ({
          id: item.id,
          reason_text: item.category_name,
          reason_type: reasonType,
          category_id: categoryId || null
        }));
        
        setReasons(formattedData);
      } catch (error) {
        console.error('Error fetching reasons:', error);
        toast.error('Failed to load custom reasons');
      } finally {
        setIsLoading(false);
      }
    };

    fetchReasons();
  }, [reasonType, categoryId]);

  const handleAddReason = async (e) => {
    e.preventDefault();
    if (!newReason.trim()) return;

    setIsLoading(true);
    try {
      const reason = {
        reason_text: newReason.trim(),
        reason_type: reasonType,
        category_id: categoryId || null
      };
      
      const added = await addCustomReason(reason);
      
      // Transform the response to match expected format
      const formattedReason = {
        id: added.id,
        reason_text: added.category_name,
        reason_type: reasonType,
        category_id: categoryId || null
      };
      
      setReasons([formattedReason, ...reasons]);
      setNewReason('');
      toast.success('Custom reason added!');
      
      if (onReasonAdded) {
        onReasonAdded(formattedReason);
      }
    } catch (error) {
      toast.error('Failed to add custom reason');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditReason = async (id) => {
    if (!editText.trim()) {
      setEditingId(null);
      return;
    }

    setIsLoading(true);
    try {
      const updated = await updateCustomReason(id, { reason_text: editText });
      
      // Transform the response to match expected format
      const formattedReason = {
        id: updated.id,
        reason_text: updated.category_name,
        reason_type: reasonType,
        category_id: categoryId || null
      };
      
      setReasons(reasons.map(r => r.id === id ? formattedReason : r));
      setEditingId(null);
      toast.success('Custom reason updated!');
    } catch (error) {
      toast.error('Failed to update custom reason');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteReason = async (id) => {
    if (!window.confirm('Are you sure you want to delete this reason?')) {
      return;
    }

    setIsLoading(true);
    try {
      await deleteCustomReason(id);
      setReasons(reasons.filter(r => r.id !== id));
      toast.success('Custom reason deleted');
    } catch (error) {
      toast.error('Failed to delete custom reason');
    } finally {
      setIsLoading(false);
    }
  };

  const startEditing = (reason) => {
    setEditingId(reason.id);
    setEditText(reason.reason_text);
  };

  return (
    <div className="custom-reason-manager">
      <div className="reason-manager-header">
        <h3>Manage Custom Reasons</h3>
        <button className="close-button" onClick={onClose}>×</button>
      </div>

      <form className="add-reason-form" onSubmit={handleAddReason}>
        <input
          type="text"
          value={newReason}
          onChange={(e) => setNewReason(e.target.value)}
          placeholder="Enter new custom reason..."
          disabled={isLoading}
          autoFocus
        />
        <button 
          type="submit" 
          className="add-reason-btn"
          disabled={isLoading || !newReason.trim()}
        >
          Add
        </button>
      </form>

      <div className="reasons-list-container">
        {isLoading && reasons.length === 0 ? (
          <div className="loading-state">Loading custom reasons...</div>
        ) : reasons.length === 0 ? (
          <div className="empty-state">
            No custom reasons yet. Add your first one above!
          </div>
        ) : (
          <ul className="reasons-list">
            {reasons.map((reason) => (
              <li key={reason.id} className="reason-item">
                {editingId === reason.id ? (
                  <div className="edit-reason-form">
                    <input
                      type="text"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      disabled={isLoading}
                      autoFocus
                    />
                    <div className="edit-actions">
                      <button 
                        onClick={() => handleEditReason(reason.id)}
                        disabled={isLoading}
                      >
                        Save
                      </button>
                      <button 
                        onClick={() => setEditingId(null)}
                        disabled={isLoading}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <span className="reason-text">{reason.reason_text}</span>
                    <div className="reason-actions">
                      <button 
                        className="edit-btn" 
                        onClick={() => startEditing(reason)}
                        disabled={isLoading}
                        aria-label="Edit reason"
                      >
                        ✏️
                      </button>
                      <button 
                        className="delete-btn" 
                        onClick={() => handleDeleteReason(reason.id)}
                        disabled={isLoading}
                        aria-label="Delete reason"
                      >
                        🗑️
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default CustomReasonManager;
