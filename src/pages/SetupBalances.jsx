import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import { useCurrency } from '../context/CurrencyContext';
import toast from 'react-hot-toast';
import '../styles/pages/SetupBalances.css';
import { supabase } from '../services/supabaseClient';

const SetupBalances = () => {
  const { darkMode } = useTheme();
  const { formatAmount } = useCurrency();
  const [balances, setBalances] = useState([]);
  const [newBalance, setNewBalance] = useState({
    name: '',
    icon: '💰',
    balance: '',
    color: '#6366f1'
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalBalance, setTotalBalance] = useState(0);
  const [balanceTypes, setBalanceTypes] = useState([]);

  const handleIconSelect = (icon) => {
    setNewBalance(prev => ({
      ...prev,
      icon: icon
    }));
    
    if (error && error.includes('icon')) {
      setError('');
    }
  };

  const fetchBalancesAndTypes = async () => {
    try {
      setIsLoading(true);
      
      const { data: balancesData, error: balancesError } = await supabase
        .from('user_balances')
        .select(`
          id,
          amount,
          balance_type:balance_type_id (
            id,
            name,
            icon
          )
        `);
      
      if (balancesError) {
        console.error('Error fetching balances:', balancesError);
        throw balancesError;
      }
      
      const formattedBalances = balancesData.map(item => ({
        id: item.id,
        name: item.balance_type?.name || 'Account',
        icon: item.balance_type?.icon || '💰',
        balance: parseFloat(item.amount || 0),
        balance_type_id: item.balance_type_id
      }));
      
      setBalances(formattedBalances);
      
      const total = formattedBalances.reduce((sum, item) => sum + item.balance, 0);
      setTotalBalance(total);
      
      const { data: typesData, error: typesError } = await supabase
        .from('balance_types')
        .select('*');
      
      if (typesError) {
        console.error('Error fetching balance types:', typesError);
        throw typesError;
      }
      
      setBalanceTypes(typesData || []);
    } catch (error) {
      console.error('Failed to load balances:', error);
      setError('Failed to load balances. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBalancesAndTypes();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewBalance(prev => ({
      ...prev,
      [name]: name === 'balance' ? value.replace(/[^0-9.]/g, '') : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!newBalance.name.trim()) {
      toast.error("Please enter a name for your balance");
      return;
    }
    
    if (!newBalance.balance) {
      toast.error("Please enter a balance amount");
      return;
    }

    if (!newBalance.icon) {
      toast.error("Please select an icon");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      console.log('Checking database tables before adding balance...');
      const { data: tableInfo } = await supabase.from('user_balances').select('count(*)');
      console.log('User balances count:', tableInfo);
      
      const balanceData = {
        name: newBalance.name.trim(),
        icon: newBalance.icon,
        balance: parseFloat(newBalance.balance),
        color: newBalance.color
      };
      
      console.log('Adding balance with data:', balanceData);
      
      if (isEditing && editId) {
        const { data: balanceTypeData } = await supabase
          .from('balance_types')
          .select('id')
          .eq('name', balanceData.name)
          .single();
        
        if (!balanceTypeData) {
          throw new Error('Balance type not found');
        }
        
        const { error: updateError } = await supabase
          .from('user_balances')
          .update({
            balance_type_id: balanceTypeData.id,
            amount: balanceData.balance
          })
          .eq('id', editId);
        
        if (updateError) throw updateError;
        toast.success('Balance updated successfully!');
      } else {
        let balanceTypeId;
        const { data: existingType, error: typeCheckError } = await supabase
          .from('balance_types')
          .select('id')
          .eq('name', balanceData.name)
          .maybeSingle();
        
        if (typeCheckError) {
          console.log('Error checking balance type:', typeCheckError);
        }
        
        if (!existingType) {
          const { data: newTypeData, error: createTypeError } = await supabase
            .from('balance_types')
            .insert([{
              name: balanceData.name,
              icon: balanceData.icon || '💰',
              is_default: false
            }])
            .select('id')
            .single();
          
          if (createTypeError) throw createTypeError;
          balanceTypeId = newTypeData.id;
        } else {
          balanceTypeId = existingType.id;
        }
        
        const { error: insertError } = await supabase
          .from('user_balances')
          .insert([{
            balance_type_id: balanceTypeId,
            amount: balanceData.balance
          }]);
        
        if (insertError) throw insertError;
        toast.success('New balance added successfully!');
      }
      
      await fetchBalancesAndTypes();
      
      setNewBalance({
        name: '',
        icon: '💰',
        balance: '',
        color: '#6366f1'
      });
      setIsEditing(false);
      setEditId(null);
    } catch (err) {
      console.error('Error adding/updating balance:', err);
      setError(err.message || 'Failed to save balance');
      toast.error(err.message || 'Failed to save balance');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = async (id) => {
    try {
      setIsLoading(true);
      
      const balanceToEdit = balances.find(balance => balance.id === id);
      
      if (balanceToEdit) {
        setNewBalance({
          name: balanceToEdit.name,
          icon: balanceToEdit.icon,
          balance: balanceToEdit.balance.toString(),
          color: balanceToEdit.color || '#6366f1'
        });
        setIsEditing(true);
        setEditId(id);
      } else {
        toast.error("Balance not found");
      }
    } catch (err) {
      console.error("Error preparing edit:", err);
      toast.error("Failed to load balance data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this balance?")) {
      try {
        setIsLoading(true);
        
        const { error: deleteError } = await supabase
          .from('user_balances')
          .delete()
          .eq('id', id);
        
        if (deleteError) throw deleteError;
        
        await fetchBalancesAndTypes();
        
        toast.success("Balance deleted successfully!");
      } catch (err) {
        console.error("Error deleting balance:", err);
        toast.error("Failed to delete balance. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleCancel = () => {
    setNewBalance({
      name: '',
      icon: '💰',
      balance: '',
      color: '#6366f1'
    });
    setIsEditing(false);
    setEditId(null);
  };

  return (
    <div className={`balances-container ${darkMode ? 'dark' : 'light'}-mode`}>
      <section className="balances-header">
        <motion.div
          className="header-content"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1>Manage Your Balances</h1>
          <p>Add and manage different types of accounts and balances</p>
        </motion.div>
      </section>

      {error && (
        <div className="error-message">
          <p>⚠️ {error}</p>
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      <div className="balances-grid">
        <section className="add-balance-form responsive-card">
          <h2>{isEditing ? 'Update Balance' : 'Add New Balance'}</h2>
          <form onSubmit={handleSubmit} className="responsive-form">
            <div className="form-group">
              <label htmlFor="name">Account Name</label>
              <input
                type="text"
                id="name"
                name="name"
                value={newBalance.name}
                onChange={handleInputChange}
                placeholder="e.g., Savings Account"
                disabled={isLoading}
                className="responsive-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="icon">Choose an Icon</label>
              <div className="icon-selector responsive-grid">
                {['💰', '💵', '💳', '🏦', '🏠', '🚗', '💻', '📱', '🛒', '🎮', '✈️', '🏛️', '👛'].map(icon => (
                  <button
                    key={icon}
                    type="button"
                    className={`icon-button ${newBalance.icon === icon ? 'selected' : ''}`}
                    onClick={() => handleIconSelect(icon)}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="balance">Current Balance</label>
              <input
                type="text"
                id="balance"
                name="balance"
                value={newBalance.balance}
                onChange={handleInputChange}
                placeholder="0.00"
                disabled={isLoading}
                className="responsive-input"
              />
            </div>

            <div className="form-actions responsive-actions">
              {isEditing && (
                <button 
                  type="button" 
                  className="cancel-button responsive-button" 
                  onClick={handleCancel}
                  disabled={isLoading}
                >
                  Cancel
                </button>
              )}
              <button 
                type="submit" 
                className="submit-button responsive-button"
                disabled={isLoading}
              >
                {isLoading ? 'Processing...' : isEditing ? 'Update Balance' : 'Add Balance'}
              </button>
            </div>
          </form>
        </section>

        <section className="balances-list responsive-card">
          <div className="balances-header-row">
            <h2>Your Balances</h2>
            <div className="total-balance">
              <span>Total: {formatAmount(totalBalance)}</span>
            </div>
          </div>

          {isLoading ? (
            <div className="loading">Processing your request...</div>
          ) : balances.length === 0 ? (
            <div className="empty-state">
              <p>You haven't added any balances yet.</p>
              <p>Start by adding your first account above!</p>
            </div>
          ) : (
            <div className="balances-grid-list responsive-list">
              {balances.map(account => (
                <motion.div
                  key={account.id}
                  className="balance-card responsive-balance-card"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="balance-card-content">
                    <div 
                      className="balance-icon responsive-icon" 
                      style={{ backgroundColor: `${account.color || '#6366f1'}20`, color: account.color || '#6366f1' }}
                    >
                      {account.icon}
                    </div>
                    <div className="balance-details">
                      <h3>{account.name}</h3>
                      <p className="balance-amount">{formatAmount(account.balance)}</p>
                      {account.updatedAt && (
                        <p className="balance-date">
                          Last updated: {new Date(account.updatedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="balance-actions responsive-balance-actions">
                    <button 
                      onClick={() => handleEdit(account.id)} 
                      aria-label={`Edit ${account.name}`}
                      disabled={isLoading}
                      className="responsive-action-button"
                    >
                      ✏️
                    </button>
                    <button 
                      onClick={() => handleDelete(account.id)} 
                      aria-label={`Delete ${account.name}`}
                      disabled={isLoading}
                      className="responsive-action-button"
                    >
                      🗑️
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default SetupBalances;