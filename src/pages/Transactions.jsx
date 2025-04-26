import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import { useCurrency } from '../context/CurrencyContext';
import { supabase } from '../services/supabaseClient';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';
import '../styles/pages/TransactionsPage.css';

const Transactions = () => {
  const { darkMode } = useTheme();
  const { formatAmount } = useCurrency();
  
  // State variables
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [summary, setSummary] = useState({
    income: 0,
    expenses: 0,
    balance: 0,
    incomeChange: 5.2, // Example percentage change
    expensesChange: -2.5, // Example percentage change
  });
  
  // Filter states
  const [filters, setFilters] = useState({
    type: 'all',
    category: 'all',
    startDate: '',
    endDate: '',
    search: '',
  });
  
  // Pagination states
  const [pagination, setPagination] = useState({
    currentPage: 1,
    entriesPerPage: 10,
    totalEntries: 0,
    totalPages: 1,
  });
  
  // Form state
  const [formData, setFormData] = useState({
    type: 'expense',
    amount: '',
    category: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'Cash',
  });
  
  // Sample categories
  const categories = {
    income: ['Salary', 'Freelance', 'Investments', 'Gifts', 'Other'],
    expense: ['Food', 'Shopping', 'Housing', 'Transportation', 'Healthcare', 'Utilities', 'Entertainment', 'Other']
  };
  
  // Payment methods
  const paymentMethods = ['Cash', 'Credit Card', 'Debit Card', 'Bank Transfer', 'Mobile Payment', 'Other'];

  // Load transactions on component mount
  useEffect(() => {
    fetchTransactions();
  }, []);
  
  // Filter transactions whenever filters change
  useEffect(() => {
    if (transactions.length > 0) {
      applyFilters();
    }
  }, [filters, transactions]);
  
  // Fetch transactions from the database
  const fetchTransactions = async () => {
    try {
      setIsLoading(true);
      
      // Fetch from Supabase
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Process transactions
      const processedTransactions = data.map(transaction => ({
        ...transaction,
        formattedDate: new Date(transaction.created_at).toLocaleDateString(),
      }));
      
      setTransactions(processedTransactions);
      calculateSummary(processedTransactions);
      
      // Update pagination
      setPagination(prev => ({
        ...prev,
        totalEntries: processedTransactions.length,
        totalPages: Math.ceil(processedTransactions.length / prev.entriesPerPage)
      }));
      
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast.error('Failed to load transactions');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Calculate financial summary
  const calculateSummary = (transactionsData) => {
    const income = transactionsData
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
      
    const expenses = transactionsData
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
      
    setSummary({
      ...summary,
      income,
      expenses,
      balance: income - expenses
    });
  };
  
  // Apply filters to transactions
  const applyFilters = () => {
    let filtered = [...transactions];
    
    // Filter by type
    if (filters.type !== 'all') {
      filtered = filtered.filter(t => t.type === filters.type);
    }
    
    // Filter by category
    if (filters.category !== 'all') {
      filtered = filtered.filter(t => t.category === filters.category);
    }
    
    // Filter by date range
    if (filters.startDate) {
      filtered = filtered.filter(t => new Date(t.created_at) >= new Date(filters.startDate));
    }
    
    if (filters.endDate) {
      filtered = filtered.filter(t => new Date(t.created_at) <= new Date(filters.endDate + 'T23:59:59'));
    }
    
    // Filter by search term
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(t => 
        t.description?.toLowerCase().includes(searchLower) || 
        t.category?.toLowerCase().includes(searchLower)
      );
    }
    
    setFilteredTransactions(filtered);
    
    // Update pagination
    setPagination(prev => ({
      ...prev,
      totalEntries: filtered.length,
      totalPages: Math.ceil(filtered.length / prev.entriesPerPage),
      currentPage: 1 // Reset to first page on filter change
    }));
  };
  
  // Handle form submission for new transaction
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    
    if (!formData.category) {
      toast.error('Please select a category');
      return;
    }
    
    try {
      const newTransaction = {
        type: formData.type,
        amount: parseFloat(formData.amount),
        category: formData.category,
        description: formData.description || null,
        payment_method: formData.paymentMethod,
        created_at: new Date(formData.date).toISOString(),
        status: 'completed'
      };
      
      const { error } = await supabase
        .from('transactions')
        .insert([newTransaction]);
      
      if (error) throw error;
      
      toast.success(`Transaction added successfully`);
      
      // Play success sound
      new Audio('/sounds/success.mp3').play().catch(e => {});
      
      // Reset form and close modal
      setFormData({
        type: 'expense',
        amount: '',
        category: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        paymentMethod: 'Cash',
      });
      setShowAddModal(false);
      fetchTransactions();
      
    } catch (error) {
      console.error('Error adding transaction:', error);
      toast.error('Failed to add transaction');
    }
  };
  
  // Handle filter changes
  const handleFilterChange = (name, value) => {
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Get paginated transactions
  const getPaginatedTransactions = () => {
    const startIndex = (pagination.currentPage - 1) * pagination.entriesPerPage;
    return filteredTransactions.slice(startIndex, startIndex + pagination.entriesPerPage);
  };
  
  // Get category badge class
  const getCategoryClass = (category) => {
    const classMap = {
      'Food': 'category-food',
      'Shopping': 'category-shopping',
      'Transportation': 'category-transportation',
      'Housing': 'category-housing',
      'Utilities': 'category-utilities',
      'Healthcare': 'category-healthcare',
      'Entertainment': 'category-entertainment',
      'Salary': 'category-income',
      'Freelance': 'category-income',
      'Investments': 'category-income',
      'Gifts': 'category-income',
      'Other': 'category-other'
    };
    
    return classMap[category] || 'category-other';
  };

  return (
    <div className={`transactions-page ${darkMode ? 'dark' : 'light'}-mode`}>
      <div className="transactions-container">
        {/* Header Section */}
        <motion.div 
          className="transactions-header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1>Transactions</h1>
          <p>Track and manage your financial activities</p>
        </motion.div>

        {/* Financial Summary Section */}
        <motion.div 
          className="transaction-summary"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="summary-card income">
            <div className="summary-icon income">📈</div>
            <div className="summary-label">Total Income</div>
            <div className="summary-value">{formatAmount(summary.income)}</div>
            <div className={`summary-trend ${summary.incomeChange >= 0 ? 'trend-up' : 'trend-down'}`}>
              {summary.incomeChange >= 0 ? '↑' : '↓'} {Math.abs(summary.incomeChange)}% from last month
            </div>
          </div>
          
          <div className="summary-card expenses">
            <div className="summary-icon expenses">📉</div>
            <div className="summary-label">Total Expenses</div>
            <div className="summary-value">{formatAmount(summary.expenses)}</div>
            <div className={`summary-trend ${summary.expensesChange <= 0 ? 'trend-up' : 'trend-down'}`}>
              {summary.expensesChange <= 0 ? '↑' : '↓'} {Math.abs(summary.expensesChange)}% from last month
            </div>
          </div>
          
          <div className="summary-card balance">
            <div className="summary-icon balance">💰</div>
            <div className="summary-label">Current Balance</div>
            <div className="summary-value">{formatAmount(summary.balance)}</div>
            <div className="summary-trend">
              Available to spend
            </div>
          </div>
        </motion.div>

        {/* Controls Section */}
        <motion.div 
          className="transactions-controls"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="filter-group">
            <div className="filter-label">Filter:</div>
            <select 
              className="filter-select" 
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
            >
              <option value="all">All Types</option>
              <option value="income">Income</option>
              <option value="expense">Expenses</option>
            </select>
            
            <select 
              className="filter-select" 
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
            >
              <option value="all">All Categories</option>
              <optgroup label="Income">
                {categories.income.map(cat => (
                  <option key={`income-${cat}`} value={cat}>{cat}</option>
                ))}
              </optgroup>
              <optgroup label="Expenses">
                {categories.expense.map(cat => (
                  <option key={`expense-${cat}`} value={cat}>{cat}</option>
                ))}
              </optgroup>
            </select>
            
            <div className="search-container">
              <input 
                type="text" 
                className="search-input" 
                placeholder="Search transactions..." 
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
              />
              <span className="search-icon">🔍</span>
            </div>
          </div>
          
          <div className="date-range-picker">
            <input 
              type="date" 
              className="date-input" 
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
            />
            <span>to</span>
            <input 
              type="date" 
              className="date-input" 
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
            />
          </div>
          
          <div className="actions-group">
            <button 
              className="add-transaction-btn"
              onClick={() => setShowAddModal(true)}
            >
              + Add Transaction
            </button>
            
            <button className="export-btn" title="Export data">
              📊
            </button>
          </div>
        </motion.div>

        {/* Transactions Table Section */}
        <motion.div 
          className="transactions-panel"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className="panel-header">
            <h2>Transaction History</h2>
            <div className="panel-actions">
              <span className="showing-info">
                Showing {Math.min(pagination.totalEntries, 1 + (pagination.currentPage - 1) * pagination.entriesPerPage)}-
                {Math.min(pagination.currentPage * pagination.entriesPerPage, pagination.totalEntries)} of {pagination.totalEntries}
              </span>
              
              <select 
                className="entries-select"
                value={pagination.entriesPerPage}
                onChange={(e) => setPagination({
                  ...pagination,
                  entriesPerPage: parseInt(e.target.value),
                  totalPages: Math.ceil(filteredTransactions.length / parseInt(e.target.value)),
                  currentPage: 1
                })}
              >
                <option value="5">5 per page</option>
                <option value="10">10 per page</option>
                <option value="25">25 per page</option>
                <option value="50">50 per page</option>
              </select>
            </div>
          </div>
          
          {isLoading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p className="loading-text">Loading transactions...</p>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <h3 className="empty-title">No transactions found</h3>
              <p className="empty-description">
                {filters.type !== 'all' || filters.category !== 'all' || filters.search || filters.startDate || filters.endDate
                  ? "Try changing your filters to see more results"
                  : "Add your first transaction to start tracking your finances"}
              </p>
              <button 
                className="add-transaction-btn"
                onClick={() => setShowAddModal(true)}
              >
                + Add Transaction
              </button>
            </div>
          ) : (
            <>
              <div className="transactions-table-container">
                <table className="transactions-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Description</th>
                      <th>Category</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getPaginatedTransactions().map((transaction) => (
                      <tr key={transaction.id}>
                        <td className="transaction-date">{transaction.formattedDate}</td>
                        <td>
                          <div className="transaction-description">
                            <div className={`transaction-icon ${transaction.type === 'income' ? 'income-icon' : 'expense-icon'}`}>
                              {transaction.type === 'income' ? '↑' : '↓'}
                            </div>
                            {transaction.description || transaction.category}
                          </div>
                        </td>
                        <td>
                          <span className={`transaction-category ${getCategoryClass(transaction.category)}`}>
                            {transaction.category}
                          </span>
                        </td>
                        <td className={`transaction-amount amount-${transaction.type}`}>
                          {transaction.type === 'income' ? '+' : '-'} {formatAmount(transaction.amount)}
                        </td>
                        <td className="transaction-status">
                          <span className={`status-indicator status-${transaction.status || 'completed'}`}></span>
                          {transaction.status || 'Completed'}
                        </td>
                        <td className="transaction-actions">
                          <button className="action-btn" title="Edit">
                            ✏️
                          </button>
                          <button className="action-btn" title="Delete">
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="table-footer">
                <div className="showing-info">
                  Showing {Math.min(pagination.totalEntries, 1 + (pagination.currentPage - 1) * pagination.entriesPerPage)}-
                  {Math.min(pagination.currentPage * pagination.entriesPerPage, pagination.totalEntries)} of {pagination.totalEntries}
                </div>
                
                <div className="pagination">
                  <button 
                    className="page-btn" 
                    disabled={pagination.currentPage === 1}
                    onClick={() => setPagination({...pagination, currentPage: pagination.currentPage - 1})}
                  >
                    &lt;
                  </button>
                  
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    // Logic to show pages around current page
                    let pageNum;
                    if (pagination.totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (pagination.currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (pagination.currentPage >= pagination.totalPages - 2) {
                      pageNum = pagination.totalPages - 4 + i;
                    } else {
                      pageNum = pagination.currentPage - 2 + i;
                    }
                    
                    return (
                      <button 
                        key={pageNum}
                        className={`page-btn ${pagination.currentPage === pageNum ? 'active' : ''}`}
                        onClick={() => setPagination({...pagination, currentPage: pageNum})}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  
                  <button 
                    className="page-btn" 
                    disabled={pagination.currentPage === pagination.totalPages}
                    onClick={() => setPagination({...pagination, currentPage: pagination.currentPage + 1})}
                  >
                    &gt;
                  </button>
                </div>
              </div>
            </>
          )}
        </motion.div>
      </div>

      {/* Mobile Floating Action Button */}
      <div className="mobile-fab">
        <button 
          className="mobile-add-btn"
          onClick={() => setShowAddModal(true)}
          aria-label="Add new transaction"
        >
          +
        </button>
      </div>

      {/* Add Transaction Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)}>
        <div className="transaction-form-container">
          <div className="form-header">
            <h2>Add New Transaction</h2>
            <p>Record your income or expenses</p>
          </div>
          
          <form className="transaction-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Transaction Type</label>
              <div className="type-selector">
                <div 
                  className={`type-option ${formData.type === 'income' ? 'selected income' : ''}`}
                  onClick={() => setFormData({...formData, type: 'income', category: ''})}
                >
                  <span>↑</span> Income
                </div>
                <div 
                  className={`type-option ${formData.type === 'expense' ? 'selected expense' : ''}`}
                  onClick={() => setFormData({...formData, type: 'expense', category: ''})}
                >
                  <span>↓</span> Expense
                </div>
              </div>
            </div>
            
            <div className="form-group amount-group">
              <label htmlFor="amount">Amount</label>
              <span className="currency-symbol">$</span>
              <input 
                type="number" 
                id="amount"
                className="form-control amount-input"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: e.target.value})}
                required
                min="0.01"
                step="0.01"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="category">Category</label>
              <select 
                id="category"
                className="form-control"
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                required
              >
                <option value="">Select a category</option>
                {formData.type === 'income' ? (
                  categories.income.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))
                ) : (
                  categories.expense.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))
                )}
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="description">Description (optional)</label>
              <input 
                type="text" 
                id="description"
                className="form-control"
                placeholder="Enter a description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              />
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="date">Date</label>
                <input 
                  type="date" 
                  id="date"
                  className="form-control"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="payment">Payment Method</label>
                <select 
                  id="payment"
                  className="form-control"
                  value={formData.paymentMethod}
                  onChange={(e) => setFormData({...formData, paymentMethod: e.target.value})}
                >
                  {paymentMethods.map(method => (
                    <option key={method} value={method}>{method}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="form-footer">
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => setShowAddModal(false)}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn btn-primary"
              >
                Add Transaction
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
};

export default Transactions;
