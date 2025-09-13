import React, { useState, useEffect } from 'react';
import { useAuth, useUI } from '../hooks/useApi.js';
import { calendarService } from '../services/api.js';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  Users,
  Plus,
  Trash2,
  ExternalLink,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Bot
} from 'lucide-react';
import LoadingSpinner from './LoadingSpinner.jsx';

const CalendarView = () => {
  const auth = useAuth();
  const ui = useUI();
  const [events, setEvents] = useState([]);
  const [allEvents, setAllEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('ai'); // 'ai' or 'all'
  const [selectedEvent, setSelectedEvent] = useState(null);

  useEffect(() => {
    loadEvents();
  }, [auth.email, viewMode]);

  const loadEvents = async () => {
    if (!auth.email) return;

    try {
      setLoading(true);
      
      if (viewMode === 'ai') {
        const response = await calendarService.getAIEvents(auth.email, 50);
        setEvents(response.data.aiEvents || []);
      } else {
        const response = await calendarService.getEvents(auth.email, 50);
        setAllEvents(response.data.events || []);
      }
    } catch (error) {
      console.error('Failed to load calendar events:', error);
      ui.addNotification({
        type: 'error',
        message: 'Failed to load calendar events'
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteEvent = async (eventId) => {
    if (!confirm('Are you sure you want to delete this event?')) return;

    try {
      await calendarService.deleteEvent(auth.email, eventId);
      ui.addNotification({
        type: 'success',
        message: 'Event deleted successfully'
      });
      loadEvents();
    } catch (error) {
      console.error('Failed to delete event:', error);
      ui.addNotification({
        type: 'error',
        message: 'Failed to delete event'
      });
    }
  };

  const formatEventDate = (dateStr) => {
    const date = new Date(dateStr);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  const getEventStatus = (event) => {
    const eventDate = new Date(event.start.dateTime || event.start.date);
    const now = new Date();
    
    if (eventDate < now) {
      return { status: 'past', label: 'Past' };
    } else if (eventDate.toDateString() === now.toDateString()) {
      return { status: 'today', label: 'Today' };
    } else {
      return { status: 'upcoming', label: 'Upcoming' };
    }
  };

  const isAIEvent = (event) => {
    return event.extendedProperties?.private?.['ai-agent'] === 'true';
  };

  const currentEvents = viewMode === 'ai' ? events : allEvents;
  const upcomingEvents = currentEvents.filter(event => {
    const eventDate = new Date(event.start.dateTime || event.start.date);
    return eventDate >= new Date();
  }).sort((a, b) => new Date(a.start.dateTime || a.start.date) - new Date(b.start.dateTime || b.start.date));

  const pastEvents = currentEvents.filter(event => {
    const eventDate = new Date(event.start.dateTime || event.start.date);
    return eventDate < new Date();
  }).sort((a, b) => new Date(b.start.dateTime || b.start.date) - new Date(a.start.dateTime || a.start.date));

  if (loading) {
    return <LoadingSpinner message="Loading calendar events..." />;
  }

  return (
    <div className="calendar-view">
      {/* Header Controls */}
      <div className="calendar-header">
        <div className="view-controls">
          <div className="view-mode-selector">
            <button
              className={`view-mode-btn ${viewMode === 'ai' ? 'active' : ''}`}
              onClick={() => setViewMode('ai')}
            >
              <Bot className="icon" />
              AI Created Events
            </button>
            <button
              className={`view-mode-btn ${viewMode === 'all' ? 'active' : ''}`}
              onClick={() => setViewMode('all')}
            >
              <CalendarIcon className="icon" />
              All Upcoming Events
            </button>
          </div>
        </div>

        <div className="calendar-actions">
          <button className="btn btn-secondary" onClick={loadEvents}>
            <RefreshCw className="icon" />
            Refresh
          </button>
          
          <a
            href="https://calendar.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
          >
            <ExternalLink className="icon" />
            Open Google Calendar
          </a>
        </div>
      </div>

      {/* Stats Section */}
      <div className="calendar-stats">
        <div className="stat-item">
          <div className="stat-number">{upcomingEvents.length}</div>
          <div className="stat-label">Upcoming Events</div>
        </div>
        
        <div className="stat-item">
          <div className="stat-number">{pastEvents.length}</div>
          <div className="stat-label">Past Events</div>
        </div>
        
        {viewMode === 'ai' && (
          <div className="stat-item">
            <div className="stat-number">{events.filter(e => isAIEvent(e)).length}</div>
            <div className="stat-label">AI Generated</div>
          </div>
        )}
      </div>

      {/* Events List */}
      <div className="events-container">
        {currentEvents.length > 0 ? (
          <>
            {/* Upcoming Events */}
            {upcomingEvents.length > 0 && (
              <div className="events-section">
                <h3 className="section-title">
                  <CalendarIcon className="icon" />
                  Upcoming Events ({upcomingEvents.length})
                </h3>
                
                <div className="events-list">
                  {upcomingEvents.map((event, index) => {
                    const eventStatus = getEventStatus(event);
                    const eventDate = formatEventDate(event.start.dateTime || event.start.date);
                    
                    return (
                      <div
                        key={event.id || index}
                        className={`event-item ${eventStatus.status} ${selectedEvent?.id === event.id ? 'selected' : ''}`}
                        onClick={() => setSelectedEvent(selectedEvent?.id === event.id ? null : event)}
                      >
                        <div className="event-header">
                          <div className="event-main">
                            <div className="event-title">
                              {isAIEvent(event) && (
                                <Bot className="ai-indicator" title="Created by AI" />
                              )}
                              {event.summary || 'No Title'}
                            </div>
                            
                            <div className="event-time">
                              <Clock className="icon" />
                              {eventDate.date} at {eventDate.time}
                            </div>
                            
                            {event.location && (
                              <div className="event-location">
                                <MapPin className="icon" />
                                {event.location}
                              </div>
                            )}
                          </div>

                          <div className="event-actions">
                            <div className={`event-status-badge ${eventStatus.status}`}>
                              {eventStatus.label}
                            </div>
                            
                            {isAIEvent(event) && viewMode === 'ai' && (
                              <button
                                className="action-btn delete-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteEvent(event.id);
                                }}
                                title="Delete Event"
                              >
                                <Trash2 className="icon" />
                              </button>
                            )}
                            
                            {event.htmlLink && (
                              <a
                                href={event.htmlLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="action-btn"
                                title="Open in Google Calendar"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <ExternalLink className="icon" />
                              </a>
                            )}
                          </div>
                        </div>

                        {selectedEvent?.id === event.id && (
                          <div className="event-details">
                            {event.description && (
                              <div className="event-description">
                                <h4>Description:</h4>
                                <div className="description-content">
                                  {event.description.split('\n').map((line, i) => (
                                    <p key={i}>{line}</p>
                                  ))}
                                </div>
                              </div>
                            )}

                            {isAIEvent(event) && (
                              <div className="ai-event-info">
                                <h4>AI Event Details:</h4>
                                <div className="ai-info-grid">
                                  {event.extendedProperties?.private?.['email-subject'] && (
                                    <div className="ai-info-item">
                                      <span className="label">From Email:</span>
                                      <span className="value">{event.extendedProperties.private['email-subject']}</span>
                                    </div>
                                  )}
                                  
                                  {event.extendedProperties?.private?.['email-from'] && (
                                    <div className="ai-info-item">
                                      <span className="label">Sender:</span>
                                      <span className="value">{event.extendedProperties.private['email-from']}</span>
                                    </div>
                                  )}
                                  
                                  {event.extendedProperties?.private?.['importance-score'] && (
                                    <div className="ai-info-item">
                                      <span className="label">Importance:</span>
                                      <span className="value">{event.extendedProperties.private['importance-score']}/10</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {event.attendees && event.attendees.length > 0 && (
                              <div className="event-attendees">
                                <h4>
                                  <Users className="icon" />
                                  Attendees ({event.attendees.length}):
                                </h4>
                                <div className="attendees-list">
                                  {event.attendees.map((attendee, i) => (
                                    <div key={i} className="attendee">
                                      <span className="attendee-email">{attendee.email}</span>
                                      <span className={`attendee-status ${attendee.responseStatus}`}>
                                        {attendee.responseStatus}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Past Events */}
            {pastEvents.length > 0 && (
              <div className="events-section">
                <h3 className="section-title">
                  <Clock className="icon" />
                  Past Events ({pastEvents.length})
                </h3>
                
                <div className="events-list past-events">
                  {pastEvents.slice(0, 10).map((event, index) => {
                    const eventDate = formatEventDate(event.start.dateTime || event.start.date);
                    
                    return (
                      <div key={event.id || index} className="event-item past">
                        <div className="event-header">
                          <div className="event-main">
                            <div className="event-title">
                              {isAIEvent(event) && (
                                <Bot className="ai-indicator" title="Created by AI" />
                              )}
                              {event.summary || 'No Title'}
                            </div>
                            
                            <div className="event-time">
                              <Clock className="icon" />
                              {eventDate.date} at {eventDate.time}
                            </div>
                          </div>

                          <div className="event-actions">
                            <div className="event-status-badge past">
                              Completed
                            </div>
                            
                            {event.htmlLink && (
                              <a
                                href={event.htmlLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="action-btn"
                                title="Open in Google Calendar"
                              >
                                <ExternalLink className="icon" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  
                  {pastEvents.length > 10 && (
                    <div className="show-more">
                      <p>And {pastEvents.length - 10} more past events...</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="empty-state">
            <CalendarIcon className="empty-icon" />
            <h3>No events found</h3>
            <p>
              {viewMode === 'ai'
                ? 'No AI-generated events yet. Process some emails with deadlines to create calendar events automatically.'
                : 'No upcoming events in your calendar.'
              }
            </p>
            
            {viewMode === 'ai' && (
              <div className="empty-actions">
                <button
                  className="btn btn-primary"
                  onClick={() => ui.setActiveTab('dashboard')}
                >
                  <Bot className="icon" />
                  Process Emails
                </button>
                
                <button
                  className="btn btn-secondary"
                  onClick={() => setViewMode('all')}
                >
                  <CalendarIcon className="icon" />
                  View All Events
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Info Section */}
      {viewMode === 'ai' && events.length > 0 && (
        <div className="calendar-info">
          <h3>💡 About AI-Generated Events</h3>
          <div className="info-grid">
            <div className="info-item">
              <strong>🤖 Automatic Creation:</strong>
              <p>Events are automatically created when the AI detects deadlines in your emails with high importance scores.</p>
            </div>
            
            <div className="info-item">
              <strong>📧 Email Context:</strong>
              <p>Each event includes details from the original email, including sender and importance score for reference.</p>
            </div>
            
            <div className="info-item">
              <strong>🔄 Smart Scheduling:</strong>
              <p>Events are scheduled based on detected deadlines with appropriate reminders set automatically.</p>
            </div>
            
            <div className="info-item">
              <strong>✏️ Fully Editable:</strong>
              <p>All AI-created events can be edited or deleted directly in Google Calendar or from this interface.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarView;