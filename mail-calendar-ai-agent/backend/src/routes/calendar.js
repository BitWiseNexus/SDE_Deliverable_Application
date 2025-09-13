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