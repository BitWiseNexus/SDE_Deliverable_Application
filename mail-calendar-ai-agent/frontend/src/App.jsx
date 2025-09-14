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

// Auth wrapper component
const AuthWrapper = ({ children }) => {
  const auth = useAuth();
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const emailFromUrl = urlParams.get('email');
        const authSuccess = urlParams.get('auth') === 'success';
        
        // Clean URL if auth success
        if (authSuccess && emailFromUrl) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
        
        // Get email from URL or localStorage
        let email = emailFromUrl || auth.email;
        
        if (email) {
          // Store email in localStorage for future sessions
          if (emailFromUrl && emailFromUrl !== auth.email) {
            localStorage.setItem('userEmail', emailFromUrl);
          }
          await auth.checkAuthStatus(email);
        } else {
          // No email available, user needs to login
          auth.setAuthentication(false);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        auth.setAuthentication(false);
      } finally {
        setInitializing(false);
      }
    };

    initAuth();
  }, []); // Run only once on mount

  // Show loading only during initialization
  if (initializing) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <LoadingSpinner message="Initializing application..." />
      </div>
    );
  }

  // Show login screen if not authenticated
  if (!auth.authenticated) {
    return <LoginScreen onLogin={auth.login} />;
  }

  // Show main app if authenticated
  return children;
};

// Login screen component
const LoginScreen = ({ onLogin }) => {
  const [email, setEmail] = useState('');

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <Bot className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Mail Calendar AI Agent</h1>
          <p className="text-gray-600">Automatically process your emails and create calendar events using AI</p>
        </div>

        <form onSubmit={handleEmailSubmit} className="space-y-4 mb-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Enter your Gmail address:
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your-email@gmail.com"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              required
            />
          </div>
          
          <button 
            type="submit" 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <LogIn className="w-5 h-5" />
            Continue with Google
          </button>
        </form>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">or</span>
          </div>
        </div>

        <button 
          onClick={handleQuickLogin} 
          className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 mb-8"
        >
          <LogIn className="w-5 h-5" />
          Quick Login
        </button>

        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Features:</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-center gap-2">
              <span className="text-blue-500">📧</span>
              Automatically analyze your emails with AI
            </li>
            <li className="flex items-center gap-2">
              <span className="text-blue-500">📅</span>
              Create calendar events from important deadlines
            </li>
            <li className="flex items-center gap-2">
              <span className="text-blue-500">⚡</span>
              Smart importance scoring
            </li>
            <li className="flex items-center gap-2">
              <span className="text-blue-500">🔍</span>
              Advanced email categorization
            </li>
            <li className="flex items-center gap-2">
              <span className="text-blue-500">📊</span>
              Processing analytics and insights
            </li>
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
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col shadow-sm">
        {/* Sidebar Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Bot className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">AI Agent</h3>
              <p className="text-sm text-gray-600 truncate">{auth.email}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 p-4">
          <nav className="space-y-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                  ui.activeTab === tab.id
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }`}
                onClick={() => ui.setActiveTab(tab.id)}
              >
                <tab.icon className="w-5 h-5" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-gray-200 space-y-3">
          <button 
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
              processing.isProcessing
                ? 'bg-orange-50 text-orange-700 border border-orange-200'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
            onClick={() => processing.processEmails()}
            disabled={processing.isProcessing}
          >
            <Bot className="w-5 h-5" />
            {processing.isProcessing ? 'Processing...' : 'Process Emails'}
          </button>
          
          <button 
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
            onClick={auth.logout}
          >
            <LogIn className="w-5 h-5" />
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-8 py-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">
            {tabs.find(t => t.id === ui.activeTab)?.name}
          </h1>
          
          <div className="flex items-center gap-4">
            {processing.isProcessing && (
              <div className="flex items-center gap-2 text-orange-600">
                <div className="w-4 h-4 border-2 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm font-medium">Processing emails...</span>
              </div>
            )}
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="p-8">
            {renderContent()}
          </div>
        </main>
      </div>

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