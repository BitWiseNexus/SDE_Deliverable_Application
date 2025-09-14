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
      return { status: 'past', label: 'Past', color: 'bg-gray-100 text-gray-600' };
    } else if (eventDate.toDateString() === now.toDateString()) {
      return { status: 'today', label: 'Today', color: 'bg-blue-100 text-blue-700' };
    } else {
      return { status: 'upcoming', label: 'Upcoming', color: 'bg-green-100 text-green-700' };
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
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner message="Loading calendar events..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            className={`btn px-4 py-2 ${viewMode === 'ai' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setViewMode('ai')}
          >
            <Bot className="w-5 h-5" />
            AI Created Events
          </button>
          <button
            className={`btn px-4 py-2 ${viewMode === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setViewMode('all')}
          >
            <CalendarIcon className="w-5 h-5" />
            All Upcoming Events
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button className="btn btn-secondary" onClick={loadEvents}>
            <RefreshCw className="w-5 h-5" />
            Refresh
          </button>
          
          <a
            href="https://calendar.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
          >
            <ExternalLink className="w-5 h-5" />
            Open Google Calendar
          </a>
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-6 text-center">
          <div className="text-3xl font-bold text-blue-600 mb-2">{upcomingEvents.length}</div>
          <div className="text-gray-600">Upcoming Events</div>
        </div>
        
        <div className="card p-6 text-center">
          <div className="text-3xl font-bold text-gray-600 mb-2">{pastEvents.length}</div>
          <div className="text-gray-600">Past Events</div>
        </div>
        
        {viewMode === 'ai' && (
          <div className="card p-6 text-center">
            <div className="text-3xl font-bold text-purple-600 mb-2">{events.filter(e => isAIEvent(e)).length}</div>
            <div className="text-gray-600">AI Generated</div>
          </div>
        )}
      </div>

      {/* Events List */}
      <div className="space-y-6">
        {currentEvents.length > 0 ? (
          <>
            {/* Upcoming Events */}
            {upcomingEvents.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <CalendarIcon className="w-6 h-6" />
                  Upcoming Events ({upcomingEvents.length})
                </h3>
                
                <div className="space-y-4">
                  {upcomingEvents.map((event, index) => {
                    const eventStatus = getEventStatus(event);
                    const eventDate = formatEventDate(event.start.dateTime || event.start.date);
                    
                    return (
                      <div
                        key={event.id || index}
                        className={`card p-6 transition-all cursor-pointer hover:shadow-md ${
                          selectedEvent?.id === event.id ? 'ring-2 ring-blue-500' : ''
                        }`}
                        onClick={() => setSelectedEvent(selectedEvent?.id === event.id ? null : event)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              {isAIEvent(event) && (
                                <span className="badge badge-primary">
                                  <Bot className="w-3 h-3" />
                                  AI
                                </span>
                              )}
                              <span className={`badge ${eventStatus.color}`}>
                                {eventStatus.label}
                              </span>
                            </div>
                            
                            <h4 className="text-lg font-semibold text-gray-900 mb-2">
                              {event.summary || 'No Title'}
                            </h4>
                            
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-gray-600 text-sm">
                              <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {eventDate.date} at {eventDate.time}
                              </div>
                              
                              {event.location && (
                                <div className="flex items-center gap-1">
                                  <MapPin className="w-4 h-4" />
                                  <span className="truncate">{event.location}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 ml-4">
                            {isAIEvent(event) && viewMode === 'ai' && (
                              <button
                                className="btn btn-ghost p-2 text-red-600 hover:bg-red-50"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteEvent(event.id);
                                }}
                                title="Delete Event"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                            
                            {event.htmlLink && (
                              <a
                                href={event.htmlLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-ghost p-2 text-blue-600 hover:bg-blue-50"
                                title="Open in Google Calendar"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            )}
                          </div>
                        </div>

                        {selectedEvent?.id === event.id && (
                          <div className="mt-6 pt-6 border-t border-gray-200 space-y-4">
                            {event.description && (
                              <div>
                                <h5 className="font-semibold text-gray-900 mb-2">Description:</h5>
                                <div className="text-gray-700 text-sm bg-gray-50 p-4 rounded-lg max-h-32 overflow-y-auto custom-scrollbar">
                                  {event.description.split('\n').map((line, i) => (
                                    <p key={i} className="mb-1">{line}</p>
                                  ))}
                                </div>
                              </div>
                            )}

                            {isAIEvent(event) && (
                              <div>
                                <h5 className="font-semibold text-gray-900 mb-2">AI Event Details:</h5>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                  {event.extendedProperties?.private?.['email-subject'] && (
                                    <div className="bg-blue-50 p-3 rounded-lg">
                                      <span className="font-medium text-blue-900">From Email:</span>
                                      <p className="text-blue-700 mt-1">{event.extendedProperties.private['email-subject']}</p>
                                    </div>
                                  )}
                                  
                                  {event.extendedProperties?.private?.['email-from'] && (
                                    <div className="bg-green-50 p-3 rounded-lg">
                                      <span className="font-medium text-green-900">Sender:</span>
                                      <p className="text-green-700 mt-1">{event.extendedProperties.private['email-from']}</p>
                                    </div>
                                  )}
                                  
                                  {event.extendedProperties?.private?.['importance-score'] && (
                                    <div className="bg-orange-50 p-3 rounded-lg">
                                      <span className="font-medium text-orange-900">Importance:</span>
                                      <p className="text-orange-700 mt-1">{event.extendedProperties.private['importance-score']}/10</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {event.attendees && event.attendees.length > 0 && (
                              <div>
                                <h5 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                                  <Users className="w-5 h-5" />
                                  Attendees ({event.attendees.length}):
                                </h5>
                                <div className="space-y-2">
                                  {event.attendees.map((attendee, i) => (
                                    <div key={i} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                                      <span className="text-sm text-gray-700">{attendee.email}</span>
                                      <span className={`badge ${
                                        attendee.responseStatus === 'accepted' ? 'badge-success' :
                                        attendee.responseStatus === 'declined' ? 'badge-error' :
                                        'badge-warning'
                                      }`}>
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
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <Clock className="w-6 h-6" />
                  Past Events ({pastEvents.length})
                </h3>
                
                <div className="space-y-3">
                  {pastEvents.slice(0, 10).map((event, index) => {
                    const eventDate = formatEventDate(event.start.dateTime || event.start.date);
                    
                    return (
                      <div key={event.id || index} className="card p-4 opacity-75">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {isAIEvent(event) && (
                                <span className="badge bg-gray-100 text-gray-600">
                                  <Bot className="w-3 h-3" />
                                  AI
                                </span>
                              )}
                              <span className="badge bg-gray-100 text-gray-600">
                                Completed
                              </span>
                            </div>
                            
                            <h4 className="font-semibold text-gray-800 mb-1">
                              {event.summary || 'No Title'}
                            </h4>
                            
                            <div className="flex items-center gap-1 text-gray-600 text-sm">
                              <Clock className="w-4 h-4" />
                              {eventDate.date} at {eventDate.time}
                            </div>
                          </div>

                          {event.htmlLink && (
                            <a
                              href={event.htmlLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-ghost p-2 text-gray-500 hover:bg-gray-50"
                              title="Open in Google Calendar"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  
                  {pastEvents.length > 10 && (
                    <div className="text-center p-4 text-gray-500">
                      <p>And {pastEvents.length - 10} more past events...</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <CalendarIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No events found</h3>
            <p className="text-gray-600 mb-6">
              {viewMode === 'ai'
                ? 'No AI-generated events yet. Process some emails with deadlines to create calendar events automatically.'
                : 'No upcoming events in your calendar.'
              }
            </p>
            
            {viewMode === 'ai' && (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  className="btn btn-primary"
                  onClick={() => ui.setActiveTab('dashboard')}
                >
                  <Bot className="w-5 h-5" />
                  Process Emails
                </button>
                
                <button
                  className="btn btn-secondary"
                  onClick={() => setViewMode('all')}
                >
                  <CalendarIcon className="w-5 h-5" />
                  View All Events
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Info Section */}
      {viewMode === 'ai' && events.length > 0 && (
        <div className="gradient-bg rounded-xl p-6 border border-primary-200">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">💡 About AI-Generated Events</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white/50 p-4 rounded-lg">
              <strong className="text-blue-900">🤖 Automatic Creation:</strong>
              <p className="text-gray-700 text-sm mt-1">Events are automatically created when the AI detects deadlines in your emails with high importance scores.</p>
            </div>
            
            <div className="bg-white/50 p-4 rounded-lg">
              <strong className="text-green-900">📧 Email Context:</strong>
              <p className="text-gray-700 text-sm mt-1">Each event includes details from the original email, including sender and importance score for reference.</p>
            </div>
            
            <div className="bg-white/50 p-4 rounded-lg">
              <strong className="text-orange-900">🔄 Smart Scheduling:</strong>
              <p className="text-gray-700 text-sm mt-1">Events are scheduled based on detected deadlines with appropriate reminders set automatically.</p>
            </div>
            
            <div className="bg-white/50 p-4 rounded-lg">
              <strong className="text-purple-900">✏️ Fully Editable:</strong>
              <p className="text-gray-700 text-sm mt-1">All AI-created events can be edited or deleted directly in Google Calendar or from this interface.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarView; 