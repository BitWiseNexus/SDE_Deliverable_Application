import express from 'express';
import gmailService from '../services/gmailService.js';
import { getProcessedEmails } from '../database/database.js';
import { logError } from '../utils/validation.js';

const router = express.Router();

// GET /api/emails/:email - Get recent emails
router.get('/:email', async (req, res) => {
  const { email } = req.params;
  const { maxResults = 10, timeRange = '1d' } = req.query;
  
  try {
    const emailIds = await gmailService.getRecentEmails(email, parseInt(maxResults), timeRange);
    res.json({
      success: true,
      emails: emailIds,
      count: emailIds.length
    });
  } catch (error) {
    logError('Get Emails', error);
    res.status(500).json({
      error: true,
      message: 'Failed to get emails',
      details: error.message
    });
  }
});

// GET /api/emails/:email/processed - Get processed emails from database
router.get('/:email/processed', async (req, res) => {
  const { email } = req.params;
  const { limit = 50 } = req.query;
  
  try {
    const processed = await getProcessedEmails(email, parseInt(limit));
    res.json({
      success: true,
      processedEmails: processed
    });
  } catch (error) {
    logError('Get Processed Emails', error);
    res.status(500).json({
      error: true,
      message: 'Failed to get processed emails'
    });
  }
});

// GET /api/emails/:email/details/:messageId - Get email details
router.get('/:email/details/:messageId', async (req, res) => {
  const { email, messageId } = req.params;
  
  try {
    const emailDetails = await gmailService.getEmailDetails(email, messageId);
    res.json({
      success: true,
      email: emailDetails
    });
  } catch (error) {
    logError('Get Email Details', error);
    res.status(500).json({
      error: true,
      message: 'Failed to get email details',
      details: error.message
    });
  }
});

export default router;