import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import { askFinanceAI, generateFinanceInsights } from '../services/ai/askFinanceAI';
import '../styles/components/AIAssistant.css';

const AIAssistant = ({ userData }) => {
  const { darkMode } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { id: 1, text: "Hello! I'm your finance assistant. How can I help with your finances today?", isBot: true }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-generate an insight when first opened with user data
  useEffect(() => {
    if (isOpen && messages.length === 1 && userData) {
      handleInitialInsight();
    }
  }, [isOpen, userData]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleInitialInsight = async () => {
    if (!userData) return;
    
    setIsTyping(true);
    try {
      // Generate personalized insight based on user data
      const insight = await generateFinanceInsights({
        income: userData.income || 30000,
        expenses: userData.expenses || 25000,
        savings: userData.savings || 5000,
        categories: userData.categories || {
          Food: 8000,
          Entertainment: 5000,
          Transport: 3000,
          Utilities: 2000
        }
      });
      
      setMessages(prevMessages => [
        ...prevMessages,
        { id: Date.now(), text: insight, isBot: true }
      ]);
    } catch (error) {
      console.error('Error generating initial insight:', error);
    } finally {
      setIsTyping(false);
    }
  };

  const toggleAssistant = () => {
    setIsOpen(!isOpen);
  };

  const handleInputChange = (e) => {
    setInputText(e.target.value);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!inputText.trim()) return;
    
    // Add user message
    const newUserMessage = { id: Date.now(), text: inputText, isBot: false };
    setMessages(prev => [...prev, newUserMessage]);
    setInputText('');
    setIsTyping(true);
    
    try {
      // Get response from Gemini AI
      const aiResponse = await askFinanceAI(inputText);
      
      setMessages(prevMessages => [
        ...prevMessages,
        { id: Date.now() + 1, text: aiResponse, isBot: true }
      ]);
    } catch (error) {
      console.error('Error getting AI response:', error);
      setMessages(prevMessages => [
        ...prevMessages,
        { 
          id: Date.now() + 1, 
          text: "Sorry, I couldn't process your question. Please try again.", 
          isBot: true 
        }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className={`ai-assistant-container ${darkMode ? 'dark' : 'light'}-mode`}>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            className="ai-assistant-window"
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ duration: 0.3 }}
          >
            <div className="ai-assistant-header">
              <div className="ai-assistant-title">
                <span className="ai-icon">💸</span>
                <h3>Finance Assistant</h3>
              </div>
              <button className="ai-close-button" onClick={toggleAssistant}>
                ×
              </button>
            </div>
            
            <div className="ai-assistant-messages">
              {messages.map(message => (
                <div 
                  key={message.id} 
                  className={`ai-message ${message.isBot ? 'bot' : 'user'}`}
                >
                  {message.isBot && <span className="ai-avatar">💸</span>}
                  <div className="ai-message-bubble">
                    {message.text}
                  </div>
                  {!message.isBot && <span className="user-avatar">👤</span>}
                </div>
              ))}
              
              {isTyping && (
                <div className="ai-message bot">
                  <span className="ai-avatar">💸</span>
                  <div className="ai-message-bubble typing">
                    <span className="typing-dot"></span>
                    <span className="typing-dot"></span>
                    <span className="typing-dot"></span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            
            <form className="ai-assistant-input" onSubmit={handleSendMessage}>
              <input 
                type="text" 
                value={inputText} 
                onChange={handleInputChange} 
                placeholder="Ask about your finances..." 
                disabled={isTyping}
              />
              <button 
                type="submit" 
                className="send-button"
                disabled={!inputText.trim() || isTyping}
              >
                Send
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
      
      <motion.button 
        className="ai-assistant-button"
        onClick={toggleAssistant}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <span className="ai-button-icon">💸</span>
        <span className="ai-button-text">Finance AI</span>
      </motion.button>
    </div>
  );
};

export default AIAssistant;
