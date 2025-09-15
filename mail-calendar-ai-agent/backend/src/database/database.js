import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { logError, logSuccess, logInfo } from '../utils/validation.js';

// Ensure database directory exists
const dbDir = path.dirname(process.env.DATABASE_PATH || './database/mail_calendar.db');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  logInfo(`Created database directory: ${dbDir}`);
}

const dbPath = process.env.DATABASE_PATH || './database/mail_calendar.db';

// Create database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    logError('Database Connection', err);
    throw err;
  } else {
    logSuccess('Connected to SQLite database');
  }
});

// Enable foreign key constraints
db.run("PRAGMA foreign_keys = ON");

// Initialize database tables
export async function initializeDatabase() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Users table for OAuth tokens
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT UNIQUE NOT NULL,
          access_token TEXT,
          refresh_token TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          logError('Create users table', err);
          return reject(err);
        }
        logSuccess('Users table ready');
      });

      // Processed emails table
      db.run(`
        CREATE TABLE IF NOT EXISTS processed_emails (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_email TEXT NOT NULL,
          message_id TEXT UNIQUE NOT NULL,
          subject TEXT,
          sender TEXT,
          content TEXT,
          ai_summary TEXT,
          importance_score INTEGER,
          deadline_extracted TEXT,
          calendar_event_id TEXT,
          processed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_email) REFERENCES users (email) ON DELETE CASCADE
        )
      `, (err) => {
        if (err) {
          logError('Create processed_emails table', err);
          return reject(err);
        }
        logSuccess('Processed emails table ready');
      });

      // Agent logs table for monitoring
      db.run(`
        CREATE TABLE IF NOT EXISTS agent_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_email TEXT NOT NULL,
          action TEXT NOT NULL,
          status TEXT NOT NULL,
          details TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_email) REFERENCES users (email) ON DELETE CASCADE
        )
      `, (err) => {
        if (err) {
          logError('Create agent_logs table', err);
          return reject(err);
        }
        logSuccess('Agent logs table ready');
        resolve();
      });
    });
  });
}

// Database helper functions
export async function createUser(email, accessToken, refreshToken) {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO users (email, access_token, refresh_token, updated_at) 
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `);
    stmt.run(email, accessToken, refreshToken, function(err) {
      if (err) {
        logError('Create/Update User', err);
        reject(err);
      } else {
        logSuccess(`User saved: ${email}`);
        resolve({ id: this.lastID });
      }
    });
    stmt.finalize();
  });
}

export async function getUserByEmail(email) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
      if (err) {
        logError('Get User', err);
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

export async function getAllUsers() {
  return new Promise((resolve, reject) => {
    db.all('SELECT email, created_at FROM users ORDER BY created_at DESC', [], (err, rows) => {
      if (err) {
        logError('Get All Users', err);
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

export async function saveProcessedEmail(emailData) {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO processed_emails 
      (user_email, message_id, subject, sender, content, ai_summary, importance_score, deadline_extracted, calendar_event_id) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      emailData.userEmail,
      emailData.messageId,
      emailData.subject,
      emailData.sender,
      emailData.content,
      emailData.aiSummary,
      emailData.importanceScore,
      emailData.deadlineExtracted,
      emailData.calendarEventId,
      function(err) {
        if (err) {
          logError('Save Processed Email', err);
          reject(err);
        } else {
          if (this.changes > 0) {
            logSuccess(`Email processed: ${emailData.subject}`);
          }
          resolve({ id: this.lastID, changes: this.changes });
        }
      }
    );
    stmt.finalize();
  });
}

export async function getProcessedEmails(userEmail, limit = 50) {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT * FROM processed_emails WHERE user_email = ? ORDER BY processed_at DESC LIMIT ?',
      [userEmail, limit],
      (err, rows) => {
        if (err) {
          logError('Get Processed Emails', err);
          reject(err);
        } else {
          resolve(rows);
        }
      }
    );
  });
}

export async function isEmailProcessed(messageId) {
  return new Promise((resolve, reject) => {
    db.get('SELECT id FROM processed_emails WHERE message_id = ?', [messageId], (err, row) => {
      if (err) {
        logError('Check Email Processed', err);
        reject(err);
      } else {
        resolve(!!row);
      }
    });
  });
}

export async function logAgentAction(userEmail, action, status, details = null) {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare(`
      INSERT INTO agent_logs (user_email, action, status, details) 
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(userEmail, action, status, details, function(err) {
      if (err) {
        logError('Log Agent Action', err);
        reject(err);
      } else {
        if (process.env.DEBUG_MODE === 'true') {
          logInfo(`Agent: ${action} - ${status} for ${userEmail}`);
        }
        resolve({ id: this.lastID });
      }
    });
    stmt.finalize();
  });
}

export async function getAgentLogs(userEmail, limit = 100) {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT * FROM agent_logs WHERE user_email = ? ORDER BY created_at DESC LIMIT ?',
      [userEmail, limit],
      (err, rows) => {
        if (err) {
          logError('Get Agent Logs', err);
          reject(err);
        } else {
          resolve(rows);
        }
      }
    );
  });
}

export async function getDatabaseStats() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      const stats = {};
      
      db.get('SELECT COUNT(*) as count FROM users', [], (err, row) => {
        if (err) return reject(err);
        stats.totalUsers = row.count;
      });
      
      db.get('SELECT COUNT(*) as count FROM processed_emails', [], (err, row) => {
        if (err) return reject(err);
        stats.totalEmails = row.count;
      });
      
      db.get('SELECT COUNT(*) as count FROM agent_logs WHERE status = "success"', [], (err, row) => {
        if (err) return reject(err);
        stats.successfulActions = row.count;
        resolve(stats);
      });
    });
  });
}

export { db };