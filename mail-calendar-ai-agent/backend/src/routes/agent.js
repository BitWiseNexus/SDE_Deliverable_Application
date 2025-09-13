import express from 'express';
import gmailService from '../services/gmailService.js';
import geminiService from '../services/geminiService.js';
import calendarService from '../services/calendarService.js';
import { saveProcessedEmail, logAgentAction, getProcessedEmails } from '../database/database.js';
import { logError, logSuccess, logInfo } from '../utils/validation.js';

const router = express.Router();

// POST /api/agent/process/:email - Main AI agent processing
router.post('/process/:email', async (req, res) => {
  const { email } = req.params;
  const { maxEmails = 10, timeRange = '1d', createCalendarEvents = true } = req.body;
  
  if (!email) {
    return res.status(400).json({ 
      error: true,
      message: 'Email is required'
    });
  }
  
  try {
    logInfo(`🤖 Starting AI agent processing for ${email}`);
    await logAgentAction(email, 'agent_process_start', 'info', 
      `Processing up to ${maxEmails} emails from last ${timeRange}`);

    const results = {
      processedEmails: [],
      createdEvents: [],
      errors: [],
      summary: {
        totalEmails: 0,
        processedEmails: 0,
        createdEvents: 0,
        skippedEmails: 0,
        errors: 0
      }
    };

    // Step 1: Fetch recent emails
    logInfo('📧 Step 1: Fetching recent emails...');
    const emailIds = await gmailService.getRecentEmails(email, maxEmails, timeRange);
    results.summary.totalEmails = emailIds.length;
    
    if (emailIds.length === 0) {
      logInfo('No new emails found');
      return res.json({
        success: true,
        message: 'No new emails found to process',
        results
      });
    }

    // Step 2: Get email details in batch
    logInfo(`📄 Step 2: Getting details for ${emailIds.length} emails...`);
    const { emails, errors } = await gmailService.getEmailsBatch(email, emailIds.map(e => e.id));
    results.errors.push(...errors);
    results.summary.errors = errors.length;

    if (emails.length === 0) {
      logInfo('No email details could be retrieved');
      return res.json({
        success: true,
        message: 'No email details could be retrieved',
        results
      });
    }

    // Step 3: Process each email with AI
    logInfo(`🧠 Step 3: Analyzing ${emails.length} emails with AI...`);
    
    for (let i = 0; i < emails.length; i++) {
      const emailData = emails[i];
      try {
        logInfo(`Processing email ${i + 1}/${emails.length}: ${emailData.subject}`);

        // Analyze with Gemini AI
        const analysis = await geminiService.analyzeEmail(emailData);
        
        // Save processed email to database
        const emailRecord = {
          userEmail: email,
          messageId: emailData.id,
          subject: emailData.subject,
          sender: emailData.from,
          content: emailData.body || emailData.snippet,
          aiSummary: analysis.summary,
          importanceScore: analysis.importance_score,
          deadlineExtracted: analysis.deadline_info.has_deadline ? 
            JSON.stringify(analysis.deadline_info) : null,
          calendarEventId: null
        };

        // Step 4: Create calendar event if deadline detected and requested
        let createdEvent = null;
        if (createCalendarEvents && analysis.deadline_info.has_deadline) {
          try {
            logInfo(`📅 Creating calendar event for: ${emailData.subject}`);
            createdEvent = await calendarService.createEventFromEmail(email, emailData, analysis);
            
            if (createdEvent) {
              emailRecord.calendarEventId = createdEvent.id;
              results.createdEvents.push({
                eventId: createdEvent.id,
                eventTitle: createdEvent.summary,
                eventDate: createdEvent.start.dateTime || createdEvent.start.date,
                emailSubject: emailData.subject
              });
              results.summary.createdEvents++;
            }
          } catch (calendarError) {
            logError(`Calendar Event Creation - ${emailData.subject}`, calendarError);
            results.errors.push({
              type: 'calendar',
              emailSubject: emailData.subject,
              error: calendarError.message
            });
          }
        }

        // Save to database
        const saved = await saveProcessedEmail(emailRecord);
        
        if (saved.changes > 0) {
          results.processedEmails.push({
            id: emailData.id,
            subject: emailData.subject,
            from: emailData.from,
            importanceScore: analysis.importance_score,
            hasDeadline: analysis.deadline_info.has_deadline,
            category: analysis.category,
            summary: analysis.summary,
            createdEvent: createdEvent ? {
              id: createdEvent.id,
              title: createdEvent.summary
            } : null
          });
          results.summary.processedEmails++;
        } else {
          results.summary.skippedEmails++;
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (emailError) {
        logError(`Process Email - ${emailData.subject}`, emailError);
        results.errors.push({
          type: 'processing',
          emailSubject: emailData.subject,
          error: emailError.message
        });
        results.summary.errors++;
      }
    }

    // Log completion
    await logAgentAction(email, 'agent_process_complete', 'success', 
      `Processed ${results.summary.processedEmails} emails, created ${results.summary.createdEvents} events`);
    
    logSuccess(`🎉 AI Agent processing complete for ${email}`);
    logSuccess(`📊 Summary: ${results.summary.processedEmails} processed, ${results.summary.createdEvents} events, ${results.summary.errors} errors`);

    res.json({
      success: true,
      message: 'AI agent processing completed',
      results
    });

  } catch (error) {
    logError('Agent Processing', error);
    await logAgentAction(email, 'agent_process_error', 'error', error.message);
    
    res.status(500).json({
      error: true,
      message: 'Agent processing failed',
      details: error.message
    });
  }
});

// GET /api/agent/status/:email - Get processing status and history
router.get('/status/:email', async (req, res) => {
  const { email } = req.params;
  
  try {
    const processedEmails = await getProcessedEmails(email, 20);
    
    // Get recent calendar events created by AI
    const aiEvents = await calendarService.getAICreatedEvents(email, 10);
    
    const stats = {
      totalProcessedEmails: processedEmails.length,
      recentEmails: processedEmails.slice(0, 5).map(e => ({
        subject: e.subject,
        sender: e.sender,
        importanceScore: e.importance_score,
        processedAt: e.processed_at,
        hasCalendarEvent: !!e.calendar_event_id
      })),
      recentEvents: aiEvents.slice(0, 5).map(event => ({
        id: event.id,
        title: event.summary,
        start: event.start.dateTime || event.start.date,
        description: event.description
      })),
      lastProcessed: processedEmails.length > 0 ? processedEmails[0].processed_at : null
    };

    res.json({
      success: true,
      email,
      stats
    });

  } catch (error) {
    logError('Agent Status', error);
    res.status(500).json({
      error: true,
      message: 'Failed to get agent status'
    });
  }
});

// POST /api/agent/test/:email - Test all services
router.post('/test/:email', async (req, res) => {
  const { email } = req.params;
  
  const testResults = {
    gmail: { success: false, error: null },
    gemini: { success: false, error: null },
    calendar: { success: false, error: null }
  };

  try {
    // Test Gmail
    logInfo('Testing Gmail connection...');
    try {
      const gmailTest = await gmailService.testConnection(email);
      testResults.gmail = gmailTest;
    } catch (error) {
      testResults.gmail = { success: false, error: error.message };
    }

    // Test Gemini
    logInfo('Testing Gemini AI...');
    try {
      const geminiTest = await geminiService.testConnection();
      testResults.gemini = geminiTest;
    } catch (error) {
      testResults.gemini = { success: false, error: error.message };
    }

    // Test Calendar
    logInfo('Testing Calendar connection...');
    try {
      const calendarTest = await calendarService.testConnection(email);
      testResults.calendar = calendarTest;
    } catch (error) {
      testResults.calendar = { success: false, error: error.message };
    }

    const allSuccess = Object.values(testResults).every(test => test.success);
    
    res.json({
      success: allSuccess,
      message: allSuccess ? 'All services working correctly' : 'Some services have issues',
      results: testResults
    });

  } catch (error) {
    logError('Service Tests', error);
    res.status(500).json({
      error: true,
      message: 'Test execution failed',
      results: testResults
    });
  }
});

// GET /api/agent/logs/:email - Get agent logs
router.get('/logs/:email', async (req, res) => {
  const { email } = req.params;
  const { limit = 50 } = req.query;
  
  try {
    const { getAgentLogs } = await import('../database/database.js');
    const logs = await getAgentLogs(email, parseInt(limit));
    
    res.json({
      success: true,
      logs: logs.map(log => ({
        id: log.id,
        action: log.action,
        status: log.status,
        details: log.details,
        createdAt: log.created_at
      }))
    });

  } catch (error) {
    logError('Get Agent Logs', error);
    res.status(500).json({
      error: true,
      message: 'Failed to get agent logs'
    });
  }
});

export default router;