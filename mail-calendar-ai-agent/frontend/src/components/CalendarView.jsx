import React, { useState, useEffect } from "react";
import { useAuth, useUI } from "../hooks/useApi.js";
import { calendarService } from "../services/api.js";
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Users,
  Trash2,
  ExternalLink,
  RefreshCw,
  Bot,
} from "lucide-react";
import LoadingSpinner from "./LoadingSpinner.jsx";

const CalendarView = () => {
  const auth = useAuth();
  const ui = useUI();
  const [events, setEvents] = useState([]);
  const [allEvents, setAllEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("ai"); // 'ai' or 'all'
  const [selectedEvent, setSelectedEvent] = useState(null);

  useEffect(() => {
    loadEvents();
  }, [auth.email, viewMode]);

  const loadEvents = async () => {
    if (!auth.email) return;

    try {
      setLoading(true);
      if (viewMode === "ai") {
        const response = await calendarService.getAIEvents(auth.email, 50);
        setEvents(response.data.aiEvents || []);
      } else {
        const response = await calendarService.getEvents(auth.email, 50);
        setAllEvents(response.data.events || []);
      }
    } catch (error) {
      console.error("Failed to load calendar events:", error);
      ui.addNotification({
        type: "error",
        message: "Failed to load calendar events",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteEvent = async (eventId) => {
    if (!confirm("Are you sure you want to delete this event?")) return;

    try {
      await calendarService.deleteEvent(auth.email, eventId);
      ui.addNotification({
        type: "success",
        message: "Event deleted successfully",
      });
      loadEvents();
    } catch (error) {
      console.error("Failed to delete event:", error);
      ui.addNotification({
        type: "error",
        message: "Failed to delete event",
      });
    }
  };

  const formatEventDate = (dateStr) => {
    const date = new Date(dateStr);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
  };

  const getEventStatus = (event) => {
    const eventDate = new Date(event.start.dateTime || event.start.date);
    const now = new Date();

    if (eventDate < now) {
      return {
        status: "past",
        label: "Past",
        color: "bg-gray-100 text-gray-600",
      };
    } else if (eventDate.toDateString() === now.toDateString()) {
      return {
        status: "today",
        label: "Today",
        color: "bg-blue-100 text-blue-700",
      };
    } else {
      return {
        status: "upcoming",
        label: "Upcoming",
        color: "bg-green-100 text-green-700",
      };
    }
  };

  const isAIEvent = (event) => {
    return event.extendedProperties?.private?.["ai-agent"] === "true";
  };

  const currentEvents = viewMode === "ai" ? events : allEvents;
  const upcomingEvents = currentEvents
    .filter((event) => {
      const eventDate = new Date(event.start.dateTime || event.start.date);
      return eventDate >= new Date();
    })
    .sort(
      (a, b) =>
        new Date(a.start.dateTime || a.start.date) -
        new Date(b.start.dateTime || b.start.date)
    );

  const pastEvents = currentEvents
    .filter((event) => {
      const eventDate = new Date(event.start.dateTime || event.start.date);
      return eventDate < new Date();
    })
    .sort(
      (a, b) =>
        new Date(b.start.dateTime || b.start.date) -
        new Date(a.start.dateTime || a.start.date)
    );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner message="Loading calendar events..." />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-24 md:pb-0">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          <button
            className={`btn ${viewMode === 'ai' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setViewMode('ai')}
          >
            <Bot className="w-4 h-4" />
            AI Created
          </button>
          <button
            className={`btn ${viewMode === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setViewMode('all')}
          >
            <CalendarIcon className="w-4 h-4" />
            All Events
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button className="btn btn-secondary" onClick={loadEvents}>
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <a
            href="https://calendar.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
          >
            <ExternalLink className="w-4 h-4" />
            Google Calendar
          </a>
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-6 text-center">
          <div className="text-3xl font-bold text-blue-600 mb-1">{upcomingEvents.length}</div>
          <div className="text-slate-600">Upcoming</div>
        </div>
        <div className="card p-6 text-center">
          <div className="text-3xl font-bold text-slate-800 mb-1">{pastEvents.length}</div>
          <div className="text-slate-600">Past</div>
        </div>
        {viewMode === 'ai' && (
          <div className="card p-6 text-center">
            <div className="text-3xl font-bold text-purple-600 mb-1">{events.filter((e) => isAIEvent(e)).length}</div>
            <div className="text-slate-600">AI Generated</div>
          </div>
        )}
      </div>

      {/* Upcoming Events */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold tracking-wide text-slate-700 uppercase">Upcoming</h3>
        {upcomingEvents.length === 0 ? (
          <div className="card p-6 text-slate-600 text-sm">No upcoming events</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {upcomingEvents.map((event) => {
              const start = event.start?.dateTime || event.start?.date;
              const end = event.end?.dateTime || event.end?.date;
              const status = getEventStatus(event);
              const isAi = isAIEvent(event);
              return (
                <div key={event.id} className="card p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`badge ${status.color}`}>{status.label}</span>
                        {isAi && (
                          <span className="badge badge-primary inline-flex items-center gap-1">
                            <Bot className="w-3.5 h-3.5" /> AI
                          </span>
                        )}
                      </div>
                      <h4 className="text-base font-semibold text-slate-900 truncate">{event.summary || 'Untitled Event'}</h4>
                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[13px] text-slate-600">
                        <div className="flex items-center gap-1.5"><Clock className="w-4 h-4" />{formatEventDate(start).date} • {formatEventDate(start).time}</div>
                        {event.location && (
                          <div className="flex items-center gap-1.5"><MapPin className="w-4 h-4" />{event.location}</div>
                        )}
                        {event.attendees && event.attendees.length > 0 && (
                          <div className="flex items-center gap-1.5"><Users className="w-4 h-4" />{event.attendees.length} attendee{event.attendees.length>1?'s':''}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1" onClick={(e)=>e.stopPropagation()}>
                      {event.htmlLink && (
                        <a className="p-2 rounded-lg hover:bg-slate-100 text-slate-500" href={event.htmlLink} target="_blank" rel="noreferrer" aria-label="Open in Google Calendar"><ExternalLink className="w-4 h-4" /></a>
                      )}
                      <button className="p-2 rounded-lg hover:bg-slate-100 text-slate-500" onClick={()=>deleteEvent(event.id)} aria-label="Delete event"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                  {event.description && (
                    <p className="mt-3 text-sm text-slate-700 line-clamp-3 whitespace-pre-wrap">{event.description}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Past Events */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold tracking-wide text-slate-700 uppercase">Past</h3>
        {pastEvents.length === 0 ? (
          <div className="card p-6 text-slate-600 text-sm">No past events</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {pastEvents.map((event) => {
              const start = event.start?.dateTime || event.start?.date;
              const status = getEventStatus(event);
              const isAi = isAIEvent(event);
              return (
                <div key={event.id} className="card p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`badge ${status.color}`}>{status.label}</span>
                        {isAi && (
                          <span className="badge badge-primary inline-flex items-center gap-1">
                            <Bot className="w-3.5 h-3.5" /> AI
                          </span>
                        )}
                      </div>
                      <h4 className="text-base font-semibold text-slate-900 truncate">{event.summary || 'Untitled Event'}</h4>
                      <div className="mt-2 flex items-center gap-2 text-[13px] text-slate-600">
                        <Clock className="w-4 h-4" />{formatEventDate(start).date} • {formatEventDate(start).time}
                      </div>
                    </div>
                    <div className="flex items-center gap-1" onClick={(e)=>e.stopPropagation()}>
                      {event.htmlLink && (
                        <a className="p-2 rounded-lg hover:bg-slate-100 text-slate-500" href={event.htmlLink} target="_blank" rel="noreferrer" aria-label="Open in Google Calendar"><ExternalLink className="w-4 h-4" /></a>
                      )}
                      <button className="p-2 rounded-lg hover:bg-slate-100 text-slate-500" onClick={()=>deleteEvent(event.id)} aria-label="Delete event"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default CalendarView;
