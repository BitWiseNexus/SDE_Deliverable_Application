import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds for email processing
});

// Auth Services
export const authService = {
  checkAuth: (email) => api.get(`/auth/check/${email}`),
  getAuthStatus: (email) => api.get(`/auth/status/${email}`),
  testCredentials: () => api.get('/auth/test'),
  logout: (email) => api.post(`/auth/logout/${email}`),
};

// Agent Services
export const agentService = {
  processEmails: (email, options = {}) => 
    api.post(`/api/agent/process/${email}`, {
      maxEmails: options.maxEmails || 10,
      createCalendarEvents: options.createCalendarEvents ?? true,
      timeRange: options.timeRange || '1d',
      ...options
    }),
  getStatus: (email) => api.get(`/api/agent/status/${email}`),
  testServices: (email) => api.post(`/api/agent/test/${email}`),
  getLogs: (email, limit = 50) => api.get(`/api/agent/logs/${email}?limit=${limit}`),
};

// Database Services
export const databaseService = {
  getStats: () => api.get('/api/database/stats'),
  getUsers: () => api.get('/api/database/users'),
  getProcessedEmails: (email, limit = 50) => 
    api.get(`/api/database/emails/${email}?limit=${limit}`),
  getUserLogs: (email, limit = 50) => 
    api.get(`/api/database/logs/${email}?limit=${limit}`),
  getEmailDetails: (messageId) => api.get(`/api/database/email/${messageId}`),
};

// Email Services  
export const emailService = {
  getRecentEmails: (email, maxResults = 10, timeRange = '1d') => 
    api.get(`/api/emails/${email}?maxResults=${maxResults}&timeRange=${timeRange}`),
  getProcessedEmails: (email, limit = 50) =>
    api.get(`/api/emails/${email}/processed?limit=${limit}`),
  getEmailDetails: (email, messageId) =>
    api.get(`/api/emails/${email}/details/${messageId}`),
};

// Calendar Services
export const calendarService = {
  getEvents: (email, maxResults = 10) =>
    api.get(`/api/calendar/${email}/events?maxResults=${maxResults}`),
  getAIEvents: (email, maxResults = 50) =>
    api.get(`/api/calendar/${email}/ai-events?maxResults=${maxResults}`),
  deleteEvent: (email, eventId) =>
    api.delete(`/api/calendar/${email}/events/${eventId}`),
};

// Dashboard Services
export const dashboardService = {
  getOverallStats: () => api.get('/api/dashboard/stats'),
  getUserDashboard: (email) => api.get(`/api/dashboard/${email}`),
};

// Health Check
export const healthService = {
  check: () => api.get('/health'),
  getInfo: () => api.get('/api/info'),
};

// Error handler utility
export const handleApiError = (error) => {
  if (error.response) {
    // Server responded with error status
    return {
      message: error.response.data?.message || 'Server error occurred',
      status: error.response.status,
      data: error.response.data
    };
  } else if (error.request) {
    // Network error
    return {
      message: 'Network error - please check if the server is running',
      status: 0,
      data: null
    };
  } else {
    // Other error
    return {
      message: error.message || 'An unexpected error occurred',
      status: -1,
      data: null
    };
  }
};

export default api;