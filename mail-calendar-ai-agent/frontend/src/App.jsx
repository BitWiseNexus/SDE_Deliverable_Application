/* --- UI Enhanced with Gradients --- */
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

const AuthWrapper = ({ children }) => {
  const auth = useAuth();
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const authSuccess = urlParams.get('auth') === 'success';
        if (authSuccess) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }

        try {
          const response = await fetch('http://localhost:5000/api/database/users');
          const data = await response.json();
          if (data.success && data.users.length > 0) {
            const authenticatedEmail = data.users[0].email;
            localStorage.setItem('userEmail', authenticatedEmail);
            await auth.checkAuthStatus(authenticatedEmail);
          } else {
            auth.setAuthentication(false);
          }
        } catch {
          const emailFromUrl = urlParams.get('email');
          let email = emailFromUrl || auth.email;
          if (email) {
            if (emailFromUrl && emailFromUrl !== auth.email) {
              localStorage.setItem('userEmail', emailFromUrl);
            }
            await auth.checkAuthStatus(email);
          } else {
            auth.setAuthentication(false);
          }
        }
      } catch {
        auth.setAuthentication(false);
      } finally {
        setInitializing(false);
      }
    };

    initAuth();
  }, []);

  if (initializing) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <LoadingSpinner message="Initializing application..." />
      </div>
    );
  }

  if (!auth.authenticated) {
    return <LoginScreen onLogin={auth.login} />;
  }

  return children;
};

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-100 to-purple-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-200 via-indigo-200 to-purple-200 rounded-full mb-4 shadow-md">
            <Bot className="w-8 h-8 text-indigo-700" />
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
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm"
              required
            />
          </div>
          <button 
            type="submit" 
            className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white font-medium py-3 px-4 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <LogIn className="w-5 h-5" />
            Continue
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
          className="w-full bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-700 font-medium py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 mb-8"
        >
          <LogIn className="w-5 h-5" />
          Quick Login
        </button>
      </div>
    </div>
  );
};

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
      case 'dashboard': return <Dashboard />;
      case 'emails': return <EmailList />;
      case 'calendar': return <CalendarView />;
      case 'settings': return <Settings />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 via-indigo-50 to-purple-50">
      {/* Sidebar (desktop/tablet) */}
      <div className="hidden md:flex w-72 xl:w-80 bg-gradient-to-b from-white via-indigo-50 to-blue-50 border-r border-gray-200 flex-col shadow-lg">
  <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-200 via-indigo-200 to-purple-200 rounded-lg flex items-center justify-center shadow-sm">
              <Bot className="w-6 h-6 text-indigo-700" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">AI Agent</h3>
              <p className="text-sm text-gray-600 truncate">{auth.email}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 p-4">
          <nav className="space-y-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 border ${
                  ui.activeTab === tab.id
                    ? 'bg-gradient-to-r from-blue-100 via-indigo-100 to-purple-100 text-indigo-800 border-indigo-200 shadow-sm'
                    : 'text-gray-700 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 hover:text-gray-900 border-transparent'
                }`}
                onClick={() => ui.setActiveTab(tab.id)}
                onMouseUp={(e) => e.currentTarget.blur()}
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
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl shadow-sm transition-all ${
              processing.isProcessing
                ? 'bg-gradient-to-r from-orange-50 to-yellow-50 text-orange-700 border border-orange-200'
                : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white'
            }`}
            onClick={() => processing.processEmails()}
            disabled={processing.isProcessing}
          >
            <Bot className="w-5 h-5" />
            {processing.isProcessing ? 'Processing...' : 'Process Emails'}
          </button>
          
          <button 
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-600 hover:text-gray-900 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 rounded-xl transition-all"
            onClick={auth.logout}
          >
            <LogIn className="w-5 h-5" />
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="bg-gradient-to-r from-white via-indigo-50 to-blue-50 shadow-sm px-4 md:px-8 py-4 md:py-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">
            {tabs.find(t => t.id === ui.activeTab)?.name}
          </h1>
          <div className="flex items-center gap-3">
            {processing.isProcessing && (
              <div className="flex items-center gap-2 text-orange-600">
                <div className="w-4 h-4 border-2 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm font-medium">Processing emails...</span>
              </div>
            )}
            {/* Mobile actions */}
            <div className="md:hidden flex items-center gap-2">
              <button
                className={`btn ${processing.isProcessing ? 'btn-secondary' : 'btn-primary'} px-3 py-2 text-sm`}
                onClick={() => processing.processEmails()}
                disabled={processing.isProcessing}
              >
                <Bot className="w-4 h-4" />
                <span className="hidden xs:inline">{processing.isProcessing ? 'Processing' : 'Process'}</span>
              </button>
              <button
                className="btn btn-secondary px-3 py-2 text-sm"
                onClick={auth.logout}
              >
                <LogIn className="w-4 h-4" />
                <span className="hidden xs:inline">Logout</span>
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="p-4 md:p-8 pb-24 md:pb-8">
            {renderContent()}
          </div>
        </main>
      </div>

      <Notifications />

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-gray-200 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <ul className="grid grid-cols-4">
          {tabs.map(tab => (
            <li key={tab.id}>
              <button
                className={`w-full flex flex-col items-center justify-center py-2.5 text-xs font-medium transition-colors outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 ${
                  ui.activeTab === tab.id ? 'text-indigo-700' : 'text-gray-600 hover:text-gray-900'
                }`}
                onClick={() => ui.setActiveTab(tab.id)}
                aria-current={ui.activeTab === tab.id ? 'page' : undefined}
              >
                <tab.icon className="w-5 h-5 mb-0.5" />
                {tab.name}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
};

const App = () => (
  <AppProvider>
    <AuthWrapper>
      <AppContent />
    </AuthWrapper>
  </AppProvider>
);

export default App;
