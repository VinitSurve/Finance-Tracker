import { useState, useRef, useEffect } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import '../styles/components/FloatingNav.css';

const FloatingNav = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const location = useLocation();
  const navItemsRef = useRef(null);
  const activeItemRef = useRef(null);
  
  const navItems = [
    { path: '/dashboard', icon: '📊', label: 'Dashboard' },
    { path: '/balances', icon: '💰', label: 'Balances' },
    { path: '/transactions', icon: '🔄', label: 'Transactions' },
    { path: '/income/add', icon: '➕', label: 'Add' },
    { path: '/expense/add', icon: '➖', label: 'Expense' },
    { path: '/budgets', icon: '🎯', label: 'Budgets' },
    { path: '/settings', icon: '⚙️', label: 'Settings' }
  ];
  
  // Scroll to the active item when the navbar expands
  useEffect(() => {
    if (isExpanded && navItemsRef.current && activeItemRef.current) {
      const container = navItemsRef.current;
      const activeItem = activeItemRef.current;
      
      const containerRect = container.getBoundingClientRect();
      const activeRect = activeItem.getBoundingClientRect();
      
      // Calculate the scroll position to center the active item
      const scrollPosition = activeRect.left - containerRect.left - 
        (containerRect.width / 2) + (activeRect.width / 2);
      
      // Scroll smoothly to the position
      container.scrollTo({
        left: scrollPosition,
        behavior: 'smooth'
      });
    }
  }, [isExpanded]);
  
  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };
  
  return (
    <div className="floating-nav-container">
      <motion.div 
        className={`floating-nav ${isExpanded ? 'expanded' : ''}`}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <button 
          className="nav-toggle"
          onClick={toggleExpand}
          aria-label="Toggle navigation"
        >
          {isExpanded ? '✕' : '≡'}
        </button>
        
        <AnimatePresence>
          {isExpanded && (
            <motion.div 
              className="nav-items"
              ref={navItemsRef}
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.3 }}
            >
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => setIsExpanded(false)}
                  ref={location.pathname === item.path ? activeItemRef : null}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-label">{item.label}</span>
                </NavLink>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default FloatingNav;
