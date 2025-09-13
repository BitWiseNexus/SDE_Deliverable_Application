import express from 'express';
import { getDatabaseStats, getAllUsers, getAgentLogs } from '../database/database.js';
import { logError } from '../utils/validation.js';

const router = express.Router();

// GET /api/dashboard/stats - Get overall stats
router.get('/stats', async (req, res) => {
  try {
    const stats = await getDatabaseStats();
    const users = await getAllUsers();
    
    res.json({
      success: true,
      stats: {
        ...stats,
        registeredUsers: users.length,
        users: users.slice(0, 10) // Recent 10 users
      }
    });
  } catch (error) {
    logError('Get Dashboard Stats', error);
    res.status(500).json({
      error: true,
      message: 'Failed to get dashboard stats'
    });
  }
});

// GET /api/dashboard/:email - Get user dashboard
router.get('/:email', async (req, res) => {
  const { email } = req.params;
  
  try {
    const recentLogs = await getAgentLogs(email, 20);
    
    // Calculate some basic stats
    const successfulActions = recentLogs.filter(log => log.status === 'success').length;
    const errorActions = recentLogs.filter(log => log.status === 'error').length;
    
    res.json({
      success: true,
      dashboard: {
        email,
        recentActivity: recentLogs.slice(0, 10),
        stats: {
          totalActions: recentLogs.length,
          successfulActions,
          errorActions,
          successRate: recentLogs.length > 0 ? 
            Math.round((successfulActions / recentLogs.length) * 100) : 0
        }
      }
    });
  } catch (error) {
    logError('Get User Dashboard', error);
    res.status(500).json({
      error: true,
      message: 'Failed to get user dashboard'
    });
  }
});

export default router;