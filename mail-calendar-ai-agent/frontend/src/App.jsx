import React, { useEffect, useState } from 'react';
import { AppProvider } from './context/AppContext.jsx';
import { useAuth, useUI, useProcessing } from './hooks/useApi.js';
import Dashboard from './components/Dashboard.jsx';
import EmailList from './components/EmailList.jsx';
import CalendarView from './components/CalendarView.jsx';
import Settings from './components/Settings.jsx';
import Notifications from './components/Notifications.jsx';
import LoadingSpinner from './components/LoadingSpinner.jsx';
import { Mail, Calendar, Settings as SettingsIcon, BarChart3, Bot, LogIn } from 'lucide-react';
import './App.css';

// Auth wrapper component
const AuthWrapper = ({ children }) => {
  const auth = useAuth();
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const emailFromUrl = urlParams.get('email');
      const authSuccess = urlParams.get('auth') === 'success';
      
      let email = emailFromUrl || auth.email;
      
      if (email) {
        await auth.checkAuthStatus(email);
      }
      
      if (authSuccess && email) {
        // Clear URL parameters
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      
      setInitializing(false);
    };

    initAuth();
  }, []);

  if (initializing || auth.loading) {
    return <LoadingSpinner message="Initializing application..." />;
  }

  if (!auth.authenticated) {
    return <LoginScreen onLogin={auth.login} />;
  }

  return children;
};

// Login screen component
const LoginScreen = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const ui = useUI();

  const handleEmailSubmit = (e) => {
    e.preventDefault();
    if (email) {
      localStorage.setItem('userEmail', email);
      window.location.href = `http://localhost:5000/auth/quick-login/${encodeURIComponent(email)}`;
    }
  };

  const handleQuickLogin = () => {
    window.location.href = 'http://localhost:5000/auth/login?redirect=true';
  };

  return (
    <div className="login-screen">
      <div className="login-container">
        <div className="login-header">
          <Bot className="login-icon" />
          <h1>Mail Calendar AI Agent</h1>
          <p>Automatically process your emails and create calendar events using AI</p>
        </div>

        <div className="login-form">
          <form onSubmit={handleEmailSubmit}>
            <div className="form-group">
              <label htmlFor="email">Enter your Gmail address:</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your-email@gmail.com"
                required
              />
            </div>
            
            <button type="submit" className="btn btn-primary">
              <LogIn className="icon" />
              Continue with Google
            </button>
          </form>

          <div className="login-divider">
            <span>or</span>
          </div>

          <button onClick={handleQuickLogin} className="btn btn-secondary">
            <LogIn className="icon" />
            Quick Login
          </button>
        </div>

        <div className="login-features">
          <h3>Features:</h3>
          <ul>
            <li>📧 Automatically analyze your emails with AI</li>
            <li>📅 Create calendar events from important deadlines</li>
            <li>⚡ Smart importance scoring</li>
            <li>🔍 Advanced email categorization</li>
            <li>📊 Processing analytics and insights</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

// Main app content
const AppContent = () => {
  const ui = useUI();
  const auth = useAuth();
  const processing = useProcessing();

  const tabs = [
    { id: 'dashboard', name: 'Dashboard', icon: BarChart3 },
    { id: 'emails', name: 'Emails', icon: Mail },
    { id: 'calendar', name: 'Calendar', icon: Calendar },
    { id: 'settings', name: 'Settings', icon: SettingsIcon },
  ];

  const renderContent = () => {
    switch (ui.activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'emails':
        return <EmailList />;
      case 'calendar':
        return <CalendarView />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className={`app ${ui.theme}`}>
      <nav className="sidebar">
        <div className="sidebar-header">
          <Bot className="logo" />
          <div className="user-info">
            <h3>AI Agent</h3>
            <p>{auth.email}</p>
          </div>
        </div>

        <div className="nav-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`nav-tab ${ui.activeTab === tab.id ? 'active' : ''}`}
              onClick={() => ui.setActiveTab(tab.id)}
            >
              <tab.icon className="icon" />
              {tab.name}
            </button>
          ))}
        </div>

        <div className="sidebar-footer">
          <button 
            className="btn btn-primary process-btn"
            onClick={() => processing.processEmails()}
            disabled={processing.isProcessing}
          >
            <Bot className="icon" />
            {processing.isProcessing ? 'Processing...' : 'Process Emails'}
          </button>
          
          <button 
            className="btn btn-ghost logout-btn"
            onClick={auth.logout}
          >
            <LogIn className="icon" />
            Logout
          </button>
        </div>
      </nav>

      <main className="main-content">
        <header className="content-header">
          <h1>{tabs.find(t => t.id === ui.activeTab)?.name}</h1>
          <div className="header-actions">
            {processing.isProcessing && (
              <div className="processing-indicator">
                <LoadingSpinner size="small" />
                <span>Processing emails...</span>
              </div>
            )}
          </div>
        </header>

        <div className="content-body">
          {renderContent()}
        </div>
      </main>

      <Notifications />
    </div>
  );
};

// Root App component
const App = () => {
  return (
    <AppProvider>
      <AuthWrapper>
        <AppContent />
      </AuthWrapper>
    </AppProvider>
  );
};

export default App;