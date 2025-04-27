import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import { useCurrency } from '../context/CurrencyContext';
import toast from 'react-hot-toast';
import { supabase } from '../services/supabaseClient';
import '../styles/variables.css'; // Import our new variables
import '../styles/pages/Settings.css';

const Settings = () => {
  const { darkMode, toggleDarkMode } = useTheme();
  const { currency, setCurrency } = useCurrency();
  const [selectedCurrency, setSelectedCurrency] = useState(currency);
  const [notifications, setNotifications] = useState(true);
  const [dataExported, setDataExported] = useState(false);
  const [userProfile, setUserProfile] = useState({
    name: 'Vinitt',
    email: 'user@example.com',
    profileImage: null
  });
  const [activeTab, setActiveTab] = useState('profile');
  const [isLoading, setIsLoading] = useState(false);
  
  // Currencies for selection
  const currencies = [
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
    { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
    { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
    { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
    { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' }
  ];

  // Handler for currency change
  const handleCurrencyChange = (currencyCode) => {
    setSelectedCurrency(currencyCode);
    setCurrency(currencyCode);
    toast.success(`Currency changed to ${currencyCode}`);
    
    // Save to localStorage or database
    localStorage.setItem('preferred_currency', currencyCode);
  };

  // Handler for toggling notification settings
  const handleNotificationToggle = () => {
    setNotifications(!notifications);
    toast.success(`Notifications ${!notifications ? 'enabled' : 'disabled'}`);
  };

  // Handler for exporting user data
  const handleExportData = () => {
    setIsLoading(true);
    
    // Simulate data export
    setTimeout(() => {
      setDataExported(true);
      setIsLoading(false);
      toast.success('Your data has been exported successfully!');
      
      // Reset status after showing success
      setTimeout(() => {
        setDataExported(false);
      }, 3000);
    }, 1500);
  };
  
  // Handler for updating profile
  const handleProfileUpdate = (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      toast.success('Profile updated successfully!');
    }, 1000);
  };
  
  // Handler for profile image change
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUserProfile({
          ...userProfile,
          profileImage: reader.result
        });
      };
      reader.readAsDataURL(file);
    }
  };
  
  // Animation variants for tabs
  const tabVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  return (
    <div className={`settings-page ${darkMode ? 'dark' : 'light'}-mode`}>
      <div className="settings-container">
        <motion.div 
          className="settings-header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1>Settings</h1>
          <p>Customize your experience</p>
        </motion.div>
        
        <div className="settings-content">
          <div className="settings-sidebar">
            {/* Profile Photo */}
            <div className="profile-photo-container">
              <div className="profile-photo">
                {userProfile.profileImage ? (
                  <img src={userProfile.profileImage} alt="Profile" />
                ) : (
                  <div className="profile-initials">{userProfile.name.charAt(0)}</div>
                )}
                
                <label htmlFor="profile-image-upload" className="edit-overlay">
                  <span className="edit-icon">✏️</span>
                </label>
                <input 
                  type="file"
                  id="profile-image-upload"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden-upload"
                />
              </div>
              <h3 className="profile-name">{userProfile.name}</h3>
            </div>
            
            {/* Navigation Tabs */}
            <nav className="settings-nav">
              <button 
                className={`nav-tab ${activeTab === 'profile' ? 'active' : ''}`}
                onClick={() => setActiveTab('profile')}
              >
                <span className="tab-icon">👤</span>
                <span className="tab-label">Profile</span>
              </button>
              <button 
                className={`nav-tab ${activeTab === 'preferences' ? 'active' : ''}`}
                onClick={() => setActiveTab('preferences')}
              >
                <span className="tab-icon">⚙️</span>
                <span className="tab-label">Preferences</span>
              </button>
              <button 
                className={`nav-tab ${activeTab === 'security' ? 'active' : ''}`}
                onClick={() => setActiveTab('security')}
              >
                <span className="tab-icon">🔒</span>
                <span className="tab-label">Security</span>
              </button>
              <button 
                className={`nav-tab ${activeTab === 'data' ? 'active' : ''}`}
                onClick={() => setActiveTab('data')}
              >
                <span className="tab-icon">📊</span>
                <span className="tab-label">Data</span>
              </button>
            </nav>
          </div>
          
          <div className="settings-main">
            {/* Profile Settings */}
            {activeTab === 'profile' && (
              <motion.div 
                className="settings-panel"
                key="profile-panel"
                initial="hidden"
                animate="visible"
                exit="hidden"
                variants={tabVariants}
              >
                <div className="panel-header">
                  <h2>Profile Settings</h2>
                  <p>Manage your personal information</p>
                </div>
                
                <form className="settings-form" onSubmit={handleProfileUpdate}>
                  <div className="form-group">
                    <label htmlFor="name">Full Name</label>
                    <input 
                      type="text" 
                      id="name" 
                      value={userProfile.name}
                      onChange={(e) => setUserProfile({...userProfile, name: e.target.value})}
                      placeholder="Your name"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="email">Email Address</label>
                    <input 
                      type="email" 
                      id="email" 
                      value={userProfile.email}
                      onChange={(e) => setUserProfile({...userProfile, email: e.target.value})}
                      placeholder="your.email@example.com"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="phone">Phone Number (optional)</label>
                    <input 
                      type="tel" 
                      id="phone" 
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                  
                  <div className="form-actions">
                    <button 
                      type="submit" 
                      className="primary-button"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Updating...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
            
            {/* Preferences Settings */}
            {activeTab === 'preferences' && (
              <motion.div 
                className="settings-panel"
                key="preferences-panel"
                initial="hidden"
                animate="visible"
                exit="hidden"
                variants={tabVariants}
              >
                <div className="panel-header">
                  <h2>Preferences</h2>
                  <p>Customize your app experience</p>
                </div>
                
                <div className="settings-section">
                  <h3>Appearance</h3>
                  
                  <div className="setting-item">
                    <div className="setting-info">
                      <div className="setting-title">Dark Mode</div>
                      <div className="setting-description">Switch between light and dark theme</div>
                    </div>
                    <div className="setting-control">
                      <label className="toggle-switch">
                        <input 
                          type="checkbox" 
                          checked={darkMode}
                          onChange={toggleDarkMode}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>
                  </div>
                </div>
                
                <div className="settings-section">
                  <h3>Currency</h3>
                  
                  <div className="currency-options">
                    {currencies.map(currencyOption => (
                      <div 
                        key={currencyOption.code}
                        className={`currency-option ${selectedCurrency === currencyOption.code ? 'selected' : ''}`}
                        onClick={() => handleCurrencyChange(currencyOption.code)}
                      >
                        <span className="currency-symbol">{currencyOption.symbol}</span>
                        <div className="currency-info">
                          <span className="currency-code">{currencyOption.code}</span>
                          <span className="currency-name">{currencyOption.name}</span>
                        </div>
                        {selectedCurrency === currencyOption.code && (
                          <span className="currency-check">✓</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="settings-section">
                  <h3>Notifications</h3>
                  
                  <div className="setting-item">
                    <div className="setting-info">
                      <div className="setting-title">Push Notifications</div>
                      <div className="setting-description">Receive alerts for transactions and reminders</div>
                    </div>
                    <div className="setting-control">
                      <label className="toggle-switch">
                        <input 
                          type="checkbox" 
                          checked={notifications}
                          onChange={handleNotificationToggle}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
            
            {/* Security Settings */}
            {activeTab === 'security' && (
              <motion.div 
                className="settings-panel"
                key="security-panel"
                initial="hidden"
                animate="visible"
                exit="hidden"
                variants={tabVariants}
              >
                <div className="panel-header">
                  <h2>Security</h2>
                  <p>Manage your account security settings</p>
                </div>
                
                <div className="settings-section">
                  <h3>Password</h3>
                  
                  <div className="form-group">
                    <label htmlFor="current-password">Current Password</label>
                    <input type="password" id="current-password" placeholder="••••••••" />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="new-password">New Password</label>
                    <input type="password" id="new-password" placeholder="••••••••" />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="confirm-password">Confirm New Password</label>
                    <input type="password" id="confirm-password" placeholder="••••••••" />
                  </div>
                  
                  <div className="password-requirements">
                    <div className="requirement-title">Password must include:</div>
                    <ul className="requirements-list">
                      <li className="requirement-item">At least 8 characters</li>
                      <li className="requirement-item">At least one uppercase letter</li>
                      <li className="requirement-item">At least one number</li>
                      <li className="requirement-item">At least one special character</li>
                    </ul>
                  </div>
                  
                  <button className="primary-button">Update Password</button>
                </div>
                
                <div className="settings-section">
                  <h3>Two-Factor Authentication</h3>
                  
                  <div className="setting-item">
                    <div className="setting-info">
                      <div className="setting-title">Enable 2FA</div>
                      <div className="setting-description">Add an extra layer of security to your account</div>
                    </div>
                    <div className="setting-control">
                      <button className="outline-button">Setup 2FA</button>
                    </div>
                  </div>
                </div>
                
                <div className="settings-section danger-zone">
                  <h3>Danger Zone</h3>
                  
                  <div className="setting-item">
                    <div className="setting-info">
                      <div className="setting-title danger">Delete Account</div>
                      <div className="setting-description">Permanently delete your account and all data</div>
                    </div>
                    <div className="setting-control">
                      <button className="danger-button">Delete Account</button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
            
            {/* Data Settings */}
            {activeTab === 'data' && (
              <motion.div 
                className="settings-panel"
                key="data-panel"
                initial="hidden"
                animate="visible"
                exit="hidden"
                variants={tabVariants}
              >
                <div className="panel-header">
                  <h2>Data & Privacy</h2>
                  <p>Manage your data and privacy settings</p>
                </div>
                
                <div className="settings-section">
                  <h3>Data Export</h3>
                  
                  <div className="setting-item">
                    <div className="setting-info">
                      <div className="setting-title">Export Your Data</div>
                      <div className="setting-description">Download a copy of all your financial records</div>
                    </div>
                    <div className="setting-control">
                      <button 
                        className="primary-button"
                        onClick={handleExportData}
                        disabled={isLoading || dataExported}
                      >
                        {isLoading ? 'Exporting...' : dataExported ? 'Downloaded!' : 'Export Data'}
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="settings-section">
                  <h3>Privacy Settings</h3>
                  
                  <div className="setting-item">
                    <div className="setting-info">
                      <div className="setting-title">Data Analytics</div>
                      <div className="setting-description">Allow app to analyze your spending patterns</div>
                    </div>
                    <div className="setting-control">
                      <label className="toggle-switch">
                        <input 
                          type="checkbox" 
                          defaultChecked={true}
                          onChange={() => {}}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>
                  </div>
                  
                  <div className="setting-item">
                    <div className="setting-info">
                      <div className="setting-title">Personalization</div>
                      <div className="setting-description">Receive personalized financial insights</div>
                    </div>
                    <div className="setting-control">
                      <label className="toggle-switch">
                        <input 
                          type="checkbox" 
                          defaultChecked={true}
                          onChange={() => {}}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>
                  </div>
                </div>
                
                <div className="settings-section">
                  <h3>Connected Services</h3>
                  
                  <div className="connected-services">
                    <div className="service-item">
                      <div className="service-icon google">G</div>
                      <div className="service-info">
                        <div className="service-name">Google</div>
                        <div className="service-status">Connected</div>
                      </div>
                      <button className="text-button">Disconnect</button>
                    </div>
                    
                    <div className="service-item">
                      <div className="service-icon apple">A</div>
                      <div className="service-info">
                        <div className="service-name">Apple</div>
                        <div className="service-status">Not connected</div>
                      </div>
                      <button className="text-button">Connect</button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
        
        {/* Add mobile bottom navbar */}
        <div className="bottom-navbar">
          <div className="bottom-navbar-tabs">
            <button 
              className={`bottom-navbar-tab ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              <span className="bottom-navbar-icon">👤</span>
              <span>Profile</span>
            </button>
            <button 
              className={`bottom-navbar-tab ${activeTab === 'preferences' ? 'active' : ''}`}
              onClick={() => setActiveTab('preferences')}
            >
              <span className="bottom-navbar-icon">⚙️</span>
              <span>Preferences</span>
            </button>
            <button 
              className={`bottom-navbar-tab ${activeTab === 'security' ? 'active' : ''}`}
              onClick={() => setActiveTab('security')}
            >
              <span className="bottom-navbar-icon">🔒</span>
              <span>Security</span>
            </button>
            <button 
              className={`bottom-navbar-tab ${activeTab === 'data' ? 'active' : ''}`}
              onClick={() => setActiveTab('data')}
            >
              <span className="bottom-navbar-icon">📊</span>
              <span>Data</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
