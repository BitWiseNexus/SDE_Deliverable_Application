import express from 'express';
import calendarService from '../services/calendarService.js';
import { logError } from '../utils/validation.js';

const router = express.Router();

// GET /api/calendar/:email/events - Get upcoming events
router.get('/:email/events', async (req, res) => {
  const { email } = req.params;
  const { maxResults = 10 } = req.query;
  
  try {
    const events = await calendarService.getUpcomingEvents(email, parseInt(maxResults));
    res.json({
      success: true,
      events
    });
  } catch (error) {
    logError('Get Calendar Events', error);
    res.status(500).json({
      error: true,
      message: 'Failed to get calendar events',
      details: error.message
    });
  }
});

// GET /api/calendar/:email/ai-events - Get AI-created events
router.get('/:email/ai-events', async (req, res) => {
  const { email } = req.params;
  const { maxResults = 50 } = req.query;
  
  try {
    const events = await calendarService.getAICreatedEvents(email, parseInt(maxResults));
    res.json({
      success: true,
      aiEvents: events
    });
  } catch (error) {
    logError('Get AI Calendar Events', error);
    res.status(500).json({
      error: true,
      message: 'Failed to get AI-created events',
      details: error.message
    });
  }
});

// GET /api/calendar/:email/debug - Debug calendar events vs database
router.get('/:email/debug', async (req, res) => {
  const { email } = req.params;
  
  try {
    // Get events from Google Calendar
    const calendarEvents = await calendarService.getAICreatedEvents(email, 50);
    
    // Get events from database
    const { getProcessedEmails } = await import('../database/database.js');
    const dbEmails = await getProcessedEmails(email, 50);
    
    // Compare event IDs
    const comparison = {
      calendarEventIds: calendarEvents.map(e => ({ id: e.id, summary: e.summary })),
      databaseEventIds: dbEmails.filter(e => e.calendarEventId).map(e => ({ 
        id: e.calendarEventId, 
        subject: e.subject 
      })),
      mismatches: []
    };
    
    // Find mismatches
    dbEmails.forEach(dbEvent => {
      if (dbEvent.calendarEventId) {
        const exists = calendarEvents.some(calEvent => calEvent.id === dbEvent.calendarEventId);
        if (!exists) {
          comparison.mismatches.push({
            subject: dbEvent.subject,
            eventId: dbEvent.calendarEventId,
            issue: 'Event ID in database but not found in Google Calendar'
          });
        }
      }
    });
    
    res.json({
      success: true,
      comparison
    });
  } catch (error) {
    logError('Debug Calendar Events', error);
    res.status(500).json({
      error: true,
      message: 'Failed to debug calendar events',
      details: error.message
    });
  }
});

// GET /api/calendar/:email/test - Test event creation and retrieval
router.get('/:email/test', async (req, res) => {
  const { email } = req.params;
  
  try {
    const testResult = await calendarService.testEventCreation(email);
    res.json({
      success: true,
      testResult
    });
  } catch (error) {
    logError('Test Calendar Event Creation', error);
    res.status(500).json({
      error: true,
      message: 'Failed to test event creation',
      details: error.message
    });
  }
});

// DELETE /api/calendar/:email/events/:eventId - Delete event
router.delete('/:email/events/:eventId', async (req, res) => {
  const { email, eventId } = req.params;
  
  try {
    await calendarService.deleteEvent(email, eventId);
    res.json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error) {
    logError('Delete Calendar Event', error);
    res.status(500).json({
      error: true,
      message: 'Failed to delete event',
      details: error.message
    });
  }
});

export default router;