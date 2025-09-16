import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { handleApiError } from '../services/api.js';

export const useApi = (apiFunction, dependencies = []) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { actions } = useApp();

  const fetchData = async (...args) => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiFunction(...args);
      setData(response.data);
      return response.data;
    } catch (err) {
      const errorInfo = handleApiError(err);
      setError(errorInfo);
      actions.addNotification({
        type: 'error',
        message: errorInfo.message,
        duration: 5000
      });
      throw errorInfo;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (dependencies.length === 0 || dependencies.every(dep => dep != null)) {
      fetchData(...dependencies);
    }
  }, dependencies);

  return { data, loading, error, refetch: fetchData };
};

// Authentication hook
export const useAuth = () => {
  const { state, actions } = useApp();
  const [checking, setChecking] = useState(false);

  const checkAuthStatus = async (email) => {
    if (!email) return false;
    
    try {
      setChecking(true);
      const { authService } = await import('../services/api.js');
      const response = await authService.getAuthStatus(email);
      
      const isAuthenticated = response.data.authenticated;
      actions.setAuthentication(isAuthenticated);
      
      if (isAuthenticated) {
        actions.setUser({ email, ...response.data });
      }
      
      return isAuthenticated;
    } catch (error) {
      const errorInfo = handleApiError(error);
      actions.addNotification({
        type: 'error',
        message: `Authentication check failed: ${errorInfo.message}`
      });
      actions.setAuthentication(false);
      return false;
    } finally {
      setChecking(false);
    }
  };

  const login = () => {
    const email = state.user.email;
    if (email) {
      // Store email and redirect to quick login
      localStorage.setItem('userEmail', email);
      window.location.href = `http://localhost:5000/auth/quick-login/${encodeURIComponent(email)}`;
    } else {
      // No email, redirect to regular login
      window.location.href = 'http://localhost:5000/auth/login?redirect=true';
    }
  };

  const logout = async () => {
    try {
      const { authService } = await import('../services/api.js');
      if (state.user.email) {
        await authService.logout(state.user.email);
      }
      actions.logout();
      actions.addNotification({
        type: 'success',
        message: 'Logged out successfully'
      });
    } catch (error) {
      const errorInfo = handleApiError(error);
      actions.addNotification({
        type: 'warning',
        message: `Logout warning: ${errorInfo.message}`
      });
      actions.logout();
    }
  };

  return {
    ...state.user,
    loading: checking, 
    checkAuthStatus,
    setAuthentication: actions.setAuthentication,
    login,
    logout
  };
};

// Processing hook
export const useProcessing = () => {
  const { state, actions } = useApp();

  const processEmails = async (options = {}) => {
    if (!state.user.email || !state.user.authenticated) {
      throw new Error('User not authenticated');
    }

    try {
      actions.setProcessing({ isProcessing: true, results: null });
      actions.addNotification({
        type: 'info',
        message: '🤖 Starting email processing...',
        duration: 3000
      });

      const { agentService } = await import('../services/api.js');
      const response = await agentService.processEmails(state.user.email, options);
      
      const results = response.data.results;
      actions.setProcessing({
        isProcessing: false,
        lastProcessing: new Date().toISOString(),
        results
      });

      actions.addNotification({
        type: 'success',
        message: `Processing complete! ${results.summary.processedEmails} emails processed, ${results.summary.createdEvents} events created`,
        duration: 7000
      });

      // Refresh data after processing
      await refreshData();
      
      return results;
    } catch (error) {
      actions.setProcessing({ isProcessing: false, results: null });
      const errorInfo = handleApiError(error);
      actions.addNotification({
        type: 'error',
        message: `❌ Processing failed: ${errorInfo.message}`,
        duration: 7000
      });
      throw errorInfo;
    }
  };

  const refreshData = async () => {
    if (!state.user.email) return;

    try {
      const [
        { databaseService },
        { calendarService },
        { agentService }
      ] = await Promise.all([
        import('../services/api.js'),
        import('../services/api.js'),
        import('../services/api.js')
      ]);

      const [emailsRes, logsRes, eventsRes, statsRes] = await Promise.allSettled([
        databaseService.getProcessedEmails(state.user.email, 20),
        agentService.getLogs(state.user.email, 20),
        calendarService.getAIEvents(state.user.email, 10),
        databaseService.getStats()
      ]);

      const newData = {};
      
      if (emailsRes.status === 'fulfilled') {
        newData.processedEmails = emailsRes.value.data.emails || [];
      }
      
      if (logsRes.status === 'fulfilled') {
        newData.agentLogs = logsRes.value.data.logs || [];
      }
      
      if (eventsRes.status === 'fulfilled') {
        newData.calendarEvents = eventsRes.value.data.aiEvents || [];
      }
      
      if (statsRes.status === 'fulfilled') {
        newData.stats = statsRes.value.data.stats || {};
      }

      actions.setData(newData);
    } catch (error) {
      console.error('Failed to refresh data:', error);
    }
  };

  return {
    ...state.processing,
    processEmails,
    refreshData
  };
};

// Data hook
export const useData = () => {
  const { state } = useApp();
  return state.data;
};

// UI hook  
export const useUI = () => {
  const { state, actions } = useApp();
  
  const setActiveTab = (tab) => {
    actions.setUI({ activeTab: tab });
  };

  const toggleTheme = () => {
    const newTheme = state.ui.theme === 'light' ? 'dark' : 'light';
    actions.setUI({ theme: newTheme });
    localStorage.setItem('theme', newTheme);
  };

  return {
    ...state.ui,
    setActiveTab,
    toggleTheme,
    addNotification: actions.addNotification,
    removeNotification: actions.removeNotification,
    clearNotifications: actions.clearNotifications
  };
};