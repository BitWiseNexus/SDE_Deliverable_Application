import express from 'express';
import { db, getAllUsers, getProcessedEmails, getAgentLogs, getDatabaseStats } from '../database/database.js';
import { logError } from '../utils/validation.js';

const router = express.Router();

// GET /api/database/tables - List all tables
router.get('/tables', (req, res) => {
  db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, rows) => {
    if (err) {
      logError('List Tables', err);
      return res.status(500).json({ error: true, message: err.message });
    }
    res.json({ success: true, tables: rows });
  });
});

// GET /api/database/users - View all users
// GET /api/database/users - View all users
router.get('/users', async (req, res) => {
  try {
    const users = await getAllUsers();
    
    // Also get detailed info for each user
    const userDetails = await Promise.all(users.map(async (user) => {
      const processedCount = await new Promise((resolve, reject) => {
        db.get('SELECT COUNT(*) as count FROM processed_emails WHERE user_email = ?', 
          [user.email], (err, row) => {
            if (err) reject(err);
            else resolve(row.count);
          });
      });
      
      const logsCount = await new Promise((resolve, reject) => {
        db.get('SELECT COUNT(*) as count FROM agent_logs WHERE user_email = ?', 
          [user.email], (err, row) => {
            if (err) reject(err);
            else resolve(row.count);
          });
      });

      // Check if user has tokens without exposing them
      const hasTokens = await new Promise((resolve, reject) => {
        db.get('SELECT access_token, refresh_token FROM users WHERE email = ?', 
          [user.email], (err, row) => {
            if (err) reject(err);
            else resolve(!!(row && row.access_token && row.refresh_token));
          });
      });

      return {
        email: user.email,
        created_at: user.created_at,
        processedEmailsCount: processedCount,
        agentLogsCount: logsCount,
        hasTokens: hasTokens
      };
    }));

    res.json({ success: true, users: userDetails });
  } catch (error) {
    logError('Get Users', error);
    res.status(500).json({ error: true, message: error.message });
  }
});

// GET /api/database/emails/:email - View processed emails for a user
router.get('/emails/:email', async (req, res) => {
  const { email } = req.params;
  const { limit = 100 } = req.query;

  try {
    const emails = await getProcessedEmails(email, parseInt(limit));
    res.json({ 
      success: true, 
      email: email,
      count: emails.length,
      emails: emails.map(e => ({
        id: e.id,
        messageId: e.message_id,
        subject: e.subject,
        sender: e.sender,
        importanceScore: e.importance_score,
        hasDeadline: !!e.deadline_extracted,
        hasCalendarEvent: !!e.calendar_event_id,
        processedAt: e.processed_at,
        aiSummary: e.ai_summary,
        content: e.content ? e.content.substring(0, 200) + '...' : null
      }))
    });
  } catch (error) {
    logError('Get User Emails', error);
    res.status(500).json({ error: true, message: error.message });
  }
});

// GET /api/database/logs/:email - View agent logs for a user
router.get('/logs/:email', async (req, res) => {
  const { email } = req.params;
  const { limit = 100 } = req.query;

  try {
    const logs = await getAgentLogs(email, parseInt(limit));
    res.json({ 
      success: true, 
      email: email,
      count: logs.length,
      logs 
    });
  } catch (error) {
    logError('Get User Logs', error);
    res.status(500).json({ error: true, message: error.message });
  }
});

// GET /api/database/stats - Get database statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await getDatabaseStats();
    
    // Get additional stats
    const tableStats = await new Promise((resolve, reject) => {
      const queries = [
        "SELECT COUNT(*) as users FROM users",
        "SELECT COUNT(*) as processed_emails FROM processed_emails", 
        "SELECT COUNT(*) as agent_logs FROM agent_logs",
        "SELECT COUNT(*) as emails_with_events FROM processed_emails WHERE calendar_event_id IS NOT NULL",
        "SELECT AVG(importance_score) as avg_importance FROM processed_emails WHERE importance_score IS NOT NULL"
      ];
      
      Promise.all(queries.map(query => 
        new Promise((res, rej) => {
          db.get(query, [], (err, row) => err ? rej(err) : res(row));
        })
      )).then(results => {
        resolve({
          users: results[0].users,
          processedEmails: results[1].processed_emails,
          agentLogs: results[2].agent_logs,
          emailsWithEvents: results[3].emails_with_events,
          avgImportance: results[4].avg_importance ? Math.round(results[4].avg_importance * 10) / 10 : 0
        });
      }).catch(reject);
    });

    res.json({ 
      success: true, 
      stats: { ...stats, ...tableStats }
    });
  } catch (error) {
    logError('Get Database Stats', error);
    res.status(500).json({ error: true, message: error.message });
  }
});

// GET /api/database/email/:messageId - Get specific email details
router.get('/email/:messageId', (req, res) => {
  const { messageId } = req.params;
  
  db.get('SELECT * FROM processed_emails WHERE message_id = ?', [messageId], (err, row) => {
    if (err) {
      logError('Get Email Detail', err);
      return res.status(500).json({ error: true, message: err.message });
    }
    
    if (!row) {
      return res.status(404).json({ error: true, message: 'Email not found' });
    }

    // Parse deadline info if exists
    if (row.deadline_extracted) {
      try {
        row.deadline_info = JSON.parse(row.deadline_extracted);
      } catch (e) {
        row.deadline_info = null;
      }
    }

    res.json({ success: true, email: row });
  });
});

export default router;