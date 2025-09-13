import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { logError, logInfo } from './utils/validation.js';

// Import routes
import authRoutes from './routes/auth.js';
import emailRoutes from './routes/emails.js';
import calendarRoutes from './routes/calendar.js';
import agentRoutes from './routes/agent.js';
import dashboardRoutes from './routes/dashboard.js';
import databaseRoutes from './routes/database.js';

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  if (process.env.DEBUG_MODE === 'true') {
    logInfo(`${req.method} ${req.path}`);
  }
  next();
});

// Routes
app.use('/auth', authRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/agent', agentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/database', databaseRoutes);

// Health check with system info
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Mail Calendar AI Agent Backend is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// API info endpoint
app.get('/api/info', (req, res) => {
  res.json({
    name: 'Mail Calendar AI Agent API',
    version: '1.0.0',
    endpoints: {
      auth: '/auth/*',
      emails: '/api/emails/*',
      calendar: '/api/calendar/*',
      agent: '/api/agent/*',
      dashboard: '/api/dashboard/*',
      database: '/api/database/*'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logError('Express Error Handler', err);
  
  // Don't expose internal errors in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(err.status || 500).json({ 
    error: true,
    message: isDevelopment ? err.message : 'Internal server error',
    ...(isDevelopment && { stack: err.stack })
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: true,
    message: `Route ${req.method} ${req.originalUrl} not found`,
    availableRoutes: [
      'GET /health',
      'GET /api/info',
      'GET /auth/login',
      'GET /auth/test',
      'POST /api/agent/process/:email',
      'GET /api/emails/:email',
      'GET /api/calendar/:email/events',
      'GET /api/database/users'
    ]
  });
});

export default app;