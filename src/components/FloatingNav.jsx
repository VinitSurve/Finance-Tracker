import React, { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import '../styles/global/global.css'; // Import global CSS
import '../styles/components/FloatingNav.css';

const FloatingNav = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const location = useLocation();
  const navItemsRef = useRef(null);
  const activeItemRef = useRef(null);
  const navRef = useRef(null);
  
  const navItems = [
    { path: '/dashboard', icon: '📊', label: 'Dashboard' },
    { path: '/balances', icon: '💰', label: 'Balances' },
    { path: '/transactions', icon: '🔄', label: 'Transactions' },
    { path: '/income/add', icon: '➕', label: 'Add' },
    { path: '/expense/add', icon: '➖', label: 'Expense' },
    { path: '/budgets', icon: '🎯', label: 'Budgets' },
    { path: '/settings', icon: '⚙️', label: 'Settings' }
  ];
  
  // Handle click outside to close the nav
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isExpanded && navRef.current && !navRef.current.contains(event.target)) {
        setIsExpanded(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isExpanded]);
  
  // Scroll to the active item when the navbar expands
  useEffect(() => {
    if (isExpanded && navItemsRef.current && activeItemRef.current) {
      setTimeout(() => {
        const container = navItemsRef.current;
        const activeItem = activeItemRef.current;
        
        if (!container || !activeItem) return;
        
        // Scroll the active item into view with a smooth animation
        activeItem.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest'
        });
      }, 300);
    }
  }, [isExpanded]);
  
  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };
  
  // Handle navigation click - scroll to top when navigating to a new page
  const handleNavClick = () => {
    // Close the navigation
    setIsExpanded(false);
    
    // Get the current scroll position
    const currentScrollPosition = window.pageYOffset;
    
    // If already at top, no need to animate
    if (currentScrollPosition <= 0) return;
    
    // Determine if the browser supports smooth scrolling
    const supportsNativeSmoothScroll = 'scrollBehavior' in document.documentElement.style;
    
    if (supportsNativeSmoothScroll) {
      // Use enhanced smooth scroll with custom timing
      const scrollToTop = () => {
        const scrollOptions = {
          top: 0,
          left: 0,
          behavior: 'smooth'
        };
        window.scrollTo(scrollOptions);
      };
      
      scrollToTop();
    } else {
      // Use custom smooth scrolling for browsers that don't support it
      const duration = Math.min(1200, Math.max(800, currentScrollPosition / 2));
      
      // Use easeInOutCubic for natural motion
      const easeInOutCubic = (t) => 
        t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      
      const startTime = performance.now();
      
      const animateScroll = (currentTime) => {
        const elapsedTime = currentTime - startTime;
        const progress = Math.min(elapsedTime / duration, 1);
        
        const easedProgress = easeInOutCubic(progress);
        const newScrollPosition = currentScrollPosition * (1 - easedProgress);
        
        window.scrollTo(0, newScrollPosition);
        
        if (progress < 1) {
          requestAnimationFrame(animateScroll);
        }
      };
      
      requestAnimationFrame(animateScroll);
    }
  };
  
  return (
    <div className="floating-nav-container">
      <div 
        ref={navRef}
        className={`floating-nav ${isExpanded ? 'expanded' : ''}`}
      >
        <button 
          className="nav-toggle"
          onClick={toggleExpand}
          aria-label="Toggle navigation"
        >
          {isExpanded ? '✕' : '≡'}
        </button>
        
        <div 
          className={`nav-items ${isExpanded ? 'visible' : ''}`}
          ref={navItemsRef}
        >
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={handleNavClick}
              ref={location.pathname === item.path ? activeItemRef : null}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FloatingNav;
