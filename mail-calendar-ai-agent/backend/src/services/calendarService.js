import { google } from 'googleapis';
import { getUserByEmail, logAgentAction, createUser } from '../database/database.js';
import { logError, logSuccess, logInfo, loadGoogleCredentials } from '../utils/validation.js';

class CalendarService {
  constructor() {
    this.calendar = null;
    this.credentials = null;
  }

  // Initialize Calendar client for user
  async initializeCalendarClient(userEmail) {
    try {
      const user = await getUserByEmail(userEmail);
      if (!user || !user.access_token) {
        throw new Error(`User not authenticated: ${userEmail}`);
      }

      // Load Google credentials
      this.credentials = loadGoogleCredentials();
      
      // Create OAuth2 client
      const oauth2Client = new google.auth.OAuth2(
        this.credentials.client_id,
        this.credentials.client_secret,
        this.credentials.redirect_uris[0]
      );

      // Set user tokens
      oauth2Client.setCredentials({
        access_token: user.access_token,
        refresh_token: user.refresh_token
      });

      // Handle token refresh
      oauth2Client.on('tokens', async (tokens) => {
        if (tokens.access_token) {
          logInfo(`Refreshing tokens for ${userEmail}`);
          await createUser(userEmail, tokens.access_token, tokens.refresh_token || user.refresh_token);
        }
      });

      this.calendar = google.calendar({ version: 'v3', auth: oauth2Client });
      logSuccess(`Calendar client initialized for ${userEmail}`);
      
      return this.calendar;
    } catch (error) {
      logError('Calendar Client Init', error);
      throw new Error(`Failed to initialize Calendar client: ${error.message}`);
    }
  }

  // Create calendar event from email analysis
  async createEventFromEmail(userEmail, emailData, analysis) {
    try {
      if (!analysis.deadline_info.has_deadline) {
        return null;
      }

      await this.initializeCalendarClient(userEmail);

      // Prepare event data
      const eventData = this.prepareEventData(emailData, analysis);
      
      const response = await this.calendar.events.insert({
        calendarId: 'primary',
        resource: eventData
      });

      const event = response.data;
      await logAgentAction(userEmail, 'create_calendar_event', 'success', 
        `Created event: ${event.summary} (${event.id})`);
      
      logSuccess(`Created calendar event: ${event.summary}`);
      return event;

    } catch (error) {
      await logAgentAction(userEmail, 'create_calendar_event', 'error', 
        `Failed to create event for email: ${emailData.subject} - ${error.message}`);
      logError('Create Calendar Event', error);
      throw new Error(`Failed to create calendar event: ${error.message}`);
    }
  }

  // Prepare event data from email and analysis
  prepareEventData(emailData, analysis) {
    const deadline = analysis.deadline_info;
    const now = new Date();
    
    // Calculate event date/time
    let startDateTime, endDateTime;
    
    if (deadline.deadline_date) {
      // Use extracted date
      const dateStr = deadline.deadline_date;
      const timeStr = deadline.deadline_time || '09:00';
      startDateTime = new Date(`${dateStr}T${timeStr}:00`);
    } else {
      // Default to tomorrow 9 AM if no specific date found
      startDateTime = new Date(now);
      startDateTime.setDate(startDateTime.getDate() + 1);
      startDateTime.setHours(9, 0, 0, 0);
    }
    
    // Event duration: 1 hour for meetings, 30 minutes for tasks
    endDateTime = new Date(startDateTime);
    const duration = analysis.category === 'work' && 
      emailData.subject.toLowerCase().includes('meeting') ? 60 : 30;
    endDateTime.setMinutes(endDateTime.getMinutes() + duration);

    // Create event title
    const eventTitle = this.generateEventTitle(emailData, analysis);
    
    // Create description
    const description = this.generateEventDescription(emailData, analysis);

    return {
      summary: eventTitle,
      description: description,
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // 1 day before
          { method: 'popup', minutes: 30 } // 30 minutes before
        ]
      },
      source: {
        title: 'Mail Calendar AI Agent',
        url: emailData.id ? `https://mail.google.com/mail/#inbox/${emailData.id}` : undefined
      },
      extendedProperties: {
        private: {
          'ai-agent': 'true',
          'email-subject': emailData.subject,
          'importance-score': analysis.importance_score.toString(),
          'email-from': emailData.from
        }
      }
    };
  }

  // Generate event title
  generateEventTitle(emailData, analysis) {
    const deadline = analysis.deadline_info;
    
    if (deadline.deadline_description) {
      return `📧 ${deadline.deadline_description}`;
    }
    
    // Use subject but make it more action-oriented
    let title = emailData.subject;
    
    if (analysis.action_required) {
      title = `📧 Action Required: ${title}`;
    } else {
      title = `📧 ${title}`;
    }
    
    // Truncate if too long
    return title.length > 100 ? title.substring(0, 97) + '...' : title;
  }

  // Generate event description
  generateEventDescription(emailData, analysis) {
    const parts = [
      '🤖 This event was created automatically by Mail Calendar AI Agent',
      '',
      `📧 **Original Email:**`,
      `From: ${emailData.from}`,
      `Subject: ${emailData.subject}`,
      `Date: ${emailData.date}`,
      '',
      `🧠 **AI Analysis:**`,
      `Summary: ${analysis.summary}`,
      `Importance: ${analysis.importance_score}/10`,
      `Category: ${analysis.category}`,
      `Action Required: ${analysis.action_required ? 'Yes' : 'No'}`,
    ];

    if (analysis.deadline_info.deadline_description) {
      parts.push(`Deadline: ${analysis.deadline_info.deadline_description}`);
    }

    if (analysis.keywords.length > 0) {
      parts.push(`Keywords: ${analysis.keywords.join(', ')}`);
    }

    parts.push('', '📎 **Original Email Content:**');
    
    // Add truncated email content
    const content = emailData.body || emailData.snippet || '';
    const truncatedContent = content.length > 500 ? 
      content.substring(0, 500) + '... [truncated]' : content;
    
    parts.push(truncatedContent);

    return parts.join('\n');
  }

  // Get upcoming events
  async getUpcomingEvents(userEmail, maxResults = 10) {
    try {
      await this.initializeCalendarClient(userEmail);

      const response = await this.calendar.events.list({
        calendarId: 'primary',
        timeMin: new Date().toISOString(),
        maxResults: maxResults,
        singleEvents: true,
        orderBy: 'startTime'
      });

      const events = response.data.items || [];
      logSuccess(`Retrieved ${events.length} upcoming events`);
      
      return events;
    } catch (error) {
      logError('Get Upcoming Events', error);
      throw new Error(`Failed to get upcoming events: ${error.message}`);
    }
  }

  // Get events created by AI agent
  async getAICreatedEvents(userEmail, maxResults = 50) {
    try {
      await this.initializeCalendarClient(userEmail);

      const response = await this.calendar.events.list({
        calendarId: 'primary',
        timeMin: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // Last 30 days
        maxResults: maxResults,
        singleEvents: true,
        orderBy: 'startTime'
      });

      const allEvents = response.data.items || [];
      
      // Filter events created by AI agent
      const aiEvents = allEvents.filter(event => 
        event.extendedProperties?.private?.['ai-agent'] === 'true'
      );

      logSuccess(`Found ${aiEvents.length} AI-created events`);
      return aiEvents;
    } catch (error) {
      logError('Get AI Created Events', error);
      throw new Error(`Failed to get AI created events: ${error.message}`);
    }
  }

  // Update event
  async updateEvent(userEmail, eventId, updates) {
    try {
      await this.initializeCalendarClient(userEmail);

      const response = await this.calendar.events.patch({
        calendarId: 'primary',
        eventId: eventId,
        resource: updates
      });

      const event = response.data;
      await logAgentAction(userEmail, 'update_calendar_event', 'success', 
        `Updated event: ${event.summary} (${event.id})`);
      
      logSuccess(`Updated calendar event: ${event.summary}`);
      return event;
    } catch (error) {
      await logAgentAction(userEmail, 'update_calendar_event', 'error', 
        `Failed to update event ${eventId}: ${error.message}`);
      logError('Update Calendar Event', error);
      throw new Error(`Failed to update calendar event: ${error.message}`);
    }
  }

  // Delete event
  async deleteEvent(userEmail, eventId) {
    try {
      await this.initializeCalendarClient(userEmail);

      await this.calendar.events.delete({
        calendarId: 'primary',
        eventId: eventId
      });

      await logAgentAction(userEmail, 'delete_calendar_event', 'success', 
        `Deleted event: ${eventId}`);
      
      logSuccess(`Deleted calendar event: ${eventId}`);
      return true;
    } catch (error) {
      await logAgentAction(userEmail, 'delete_calendar_event', 'error', 
        `Failed to delete event ${eventId}: ${error.message}`);
      logError('Delete Calendar Event', error);
      throw new Error(`Failed to delete calendar event: ${error.message}`);
    }
  }

  // Test event creation and retrieval
  async testEventCreation(userEmail) {
    try {
      await this.initializeCalendarClient(userEmail);
      
      // Create a simple test event
      const testEvent = {
        summary: '🧪 Test Event - Mail Calendar AI Agent',
        description: 'This is a test event created by the Mail Calendar AI Agent to verify event creation and retrieval.',
        start: {
          dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        end: {
          dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(), // Tomorrow + 1 hour
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        extendedProperties: {
          private: {
            'ai-agent': 'true',
            'test-event': 'true'
          }
        }
      };
      
      // Create the event
      const createResponse = await this.calendar.events.insert({
        calendarId: 'primary',
        resource: testEvent
      });
      
      const createdEvent = createResponse.data;
      logSuccess(`Test event created with ID: ${createdEvent.id}`);
      
      // Immediately try to retrieve the event
      try {
        const retrieveResponse = await this.calendar.events.get({
          calendarId: 'primary',
          eventId: createdEvent.id
        });
        
        logSuccess(`Test event retrieved successfully: ${retrieveResponse.data.summary}`);
        
        return {
          success: true,
          message: 'Event creation and retrieval test passed',
          eventId: createdEvent.id,
          eventSummary: createdEvent.summary,
          canRetrieve: true
        };
        
      } catch (retrieveError) {
        logError('Test Event Retrieval', retrieveError);
        return {
          success: false,
          message: 'Event was created but cannot be retrieved',
          eventId: createdEvent.id,
          createSuccess: true,
          canRetrieve: false,
          error: retrieveError.message
        };
      }
      
    } catch (createError) {
      logError('Test Event Creation', createError);
      return {
        success: false,
        message: 'Event creation failed',
        createSuccess: false,
        error: createError.message
      };
    }
  }

  // Test calendar connection
  async testConnection(userEmail) {
    try {
      await this.initializeCalendarClient(userEmail);
      
      const response = await this.calendar.calendarList.list();
      
      logSuccess(`Calendar connection test successful for ${userEmail}`);
      return { 
        success: true, 
        calendars: response.data.items?.map(cal => ({
          id: cal.id,
          summary: cal.summary,
          primary: cal.primary
        }))
      };
    } catch (error) {
      logError('Calendar Connection Test', error);
      return { success: false, error: error.message };
    }
  }
}

export default new CalendarService();