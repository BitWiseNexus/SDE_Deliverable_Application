import React, { createContext, useContext, useReducer, useEffect } from 'react';

const AppContext = createContext();

const initialState = {
  user: {
    email: localStorage.getItem('userEmail') || '',
    authenticated: false,
    loading: false, // Don't start with loading true - let initialization handle it
  },
  processing: {
    isProcessing: false,
    lastProcessing: null,
    results: null,
  },
  data: {
    processedEmails: [],
    agentLogs: [],
    calendarEvents: [],
    stats: null,
  },
  ui: {
    activeTab: 'dashboard',
    notifications: [],
    theme: 'light',
  }
};

function appReducer(state, action) {
  switch (action.type) {
    case 'SET_USER':
      return {
        ...state,
        user: { ...state.user, ...action.payload }
      };
    
    case 'SET_AUTHENTICATION':
      return {
        ...state,
        user: { 
          ...state.user, 
          authenticated: action.payload,
          loading: false
        }
      };
    
    case 'SET_PROCESSING':
      return {
        ...state,
        processing: { ...state.processing, ...action.payload }
      };
    
    case 'SET_DATA':
      return {
        ...state,
        data: { ...state.data, ...action.payload }
      };
    
    case 'SET_UI':
      return {
        ...state,
        ui: { ...state.ui, ...action.payload }
      };
    
    case 'ADD_NOTIFICATION':
      return {
        ...state,
        ui: {
          ...state.ui,
          notifications: [
            ...state.ui.notifications,
            { id: Date.now(), ...action.payload }
          ]
        }
      };
    
    case 'REMOVE_NOTIFICATION':
      return {
        ...state,
        ui: {
          ...state.ui,
          notifications: state.ui.notifications.filter(n => n.id !== action.payload)
        }
      };
    
    case 'CLEAR_NOTIFICATIONS':
      return {
        ...state,
        ui: { ...state.ui, notifications: [] }
      };
      
    default:
      return state;
  }
}

export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Actions
  const actions = {
    setUser: (userData) => {
      dispatch({ type: 'SET_USER', payload: userData });
      if (userData.email) {
        localStorage.setItem('userEmail', userData.email);
      }
    },

    setAuthentication: (isAuthenticated) => {
      dispatch({ type: 'SET_AUTHENTICATION', payload: isAuthenticated });
    },

    setProcessing: (processingData) => {
      dispatch({ type: 'SET_PROCESSING', payload: processingData });
    },

    setData: (data) => {
      dispatch({ type: 'SET_DATA', payload: data });
    },

    setUI: (uiData) => {
      dispatch({ type: 'SET_UI', payload: uiData });
    },

    addNotification: (notification) => {
      dispatch({ 
        type: 'ADD_NOTIFICATION', 
        payload: {
          type: 'info',
          duration: 5000,
          ...notification
        }
      });
    },

    removeNotification: (id) => {
      dispatch({ type: 'REMOVE_NOTIFICATION', payload: id });
    },

    clearNotifications: () => {
      dispatch({ type: 'CLEAR_NOTIFICATIONS' });
    },

    logout: () => {
      localStorage.removeItem('userEmail');
      dispatch({ type: 'SET_USER', payload: { email: '', authenticated: false } });
      dispatch({ type: 'SET_DATA', payload: initialState.data });
    }
  };

  // Auto-remove notifications
  useEffect(() => {
    state.ui.notifications.forEach(notification => {
      if (notification.duration && notification.duration > 0) {
        setTimeout(() => {
          actions.removeNotification(notification.id);
        }, notification.duration);
      }
    });
  }, [state.ui.notifications]);

  // Restore activeTab from localStorage on first mount (one-time hash fallback for backward compat)
  useEffect(() => {
    try {
      const allowedTabs = ['dashboard', 'emails', 'calendar', 'settings'];
      const stored = localStorage.getItem('activeTab');
      let tabFromHash = null;
      const hash = window.location.hash || '';
      if (!stored && hash.startsWith('#tab=')) {
        tabFromHash = decodeURIComponent(hash.slice(5));
      }
      const candidate = stored || tabFromHash;
      if (candidate && allowedTabs.includes(candidate) && candidate !== state.ui.activeTab) {
        actions.setUI({ activeTab: candidate });
      }
      // Strip any hash from URL for clean appearance
      if (window.location.hash) {
        window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
      }
    } catch {}
  }, []);

  // Sync activeTab to localStorage only (no URL hash)
  useEffect(() => {
    try {
      const tab = state.ui.activeTab;
      if (!tab) return;
      localStorage.setItem('activeTab', tab);
    } catch {}
  }, [state.ui.activeTab]);

  return (
    <AppContext.Provider value={{ state, actions }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

export default AppContext;