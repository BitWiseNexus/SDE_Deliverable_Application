import React, { useState, useEffect } from 'react';
import { useAuth, useUI } from '../hooks/useApi.js';
import { databaseService } from '../services/api.js';
import { 
  Mail, 
  Calendar, 
  Star, 
  Clock, 
  User,
  Search,
  Filter,
  ChevronDown,
  RefreshCw,
  Eye,
  MoreHorizontal,
  AlertCircle,
  CheckCircle,
  TrendingUp
} from 'lucide-react';
import LoadingSpinner from './LoadingSpinner.jsx';

const EmailList = () => {
  const auth = useAuth();
  const ui = useUI();
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('processedAt');
  const [filterBy, setFilterBy] = useState('all');
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadEmails();
  }, [auth.email, sortBy, filterBy]);

  const loadEmails = async () => {
    if (!auth.email) return;

    try {
      setLoading(true);
      const response = await databaseService.getProcessedEmails(auth.email, 100);
      let emailData = response.data.emails || [];

      // Apply sorting
      emailData = sortEmails(emailData, sortBy);

      // Apply filtering
      emailData = filterEmails(emailData, filterBy);

      setEmails(emailData);
    } catch (error) {
      console.error('Failed to load emails:', error);
      ui.addNotification({
        type: 'error',
        message: 'Failed to load processed emails'
      });
    } finally {
      setLoading(false);
    }
  };

  const sortEmails = (emailData, sortBy) => {
    return [...emailData].sort((a, b) => {
      switch (sortBy) {
        case 'processedAt':
          return new Date(b.processedAt) - new Date(a.processedAt);
        case 'importance':
          return (b.importanceScore || 0) - (a.importanceScore || 0);
        case 'subject':
          return a.subject.localeCompare(b.subject);
        case 'sender':
          return a.sender.localeCompare(b.sender);
        default:
          return 0;
      }
    });
  };

  const filterEmails = (emailData, filterBy) => {
    switch (filterBy) {
      case 'all':
        return emailData;
      case 'high-importance':
        return emailData.filter(email => (email.importanceScore || 0) >= 7);
      case 'has-deadline':
        return emailData.filter(email => email.hasDeadline);
      case 'has-calendar':
        return emailData.filter(email => email.hasCalendarEvent);
      case 'recent':
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
        return emailData.filter(email => new Date(email.processedAt) > threeDaysAgo);
      default:
        return emailData;
    }
  };

  const filteredEmails = emails.filter(email =>
    email.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    email.sender.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (email.aiSummary && email.aiSummary.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getImportanceColor = (score) => {
    if (score >= 8) return 'text-red-600 bg-red-100';
    if (score >= 6) return 'text-orange-600 bg-orange-100';
    return 'text-gray-600 bg-gray-100';
  };

  const getImportanceLabel = (score) => {
    if (score >= 8) return 'High';
    if (score >= 6) return 'Medium';
    return 'Low';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner message="Loading processed emails..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search emails..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="input w-auto min-w-0"
            >
              <option value="processedAt">Latest Processed</option>
              <option value="importance">Importance Score</option>
              <option value="subject">Subject</option>
              <option value="sender">Sender</option>
            </select>
          </div>

          <button
            className={`btn btn-secondary ${showFilters ? 'bg-blue-50 text-blue-700 border-blue-200' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-5 h-5" />
            Filters
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>

          <button className="btn btn-secondary" onClick={loadEmails}>
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="card p-4">
          <div className="flex flex-wrap gap-2">
            {[
              { value: 'all', label: 'All Emails', count: emails.length },
              { value: 'high-importance', label: 'High Importance (7+)', count: emails.filter(e => (e.importanceScore || 0) >= 7).length },
              { value: 'has-deadline', label: 'Has Deadline', count: emails.filter(e => e.hasDeadline).length },
              { value: 'has-calendar', label: 'Calendar Event Created', count: emails.filter(e => e.hasCalendarEvent).length },
              { value: 'recent', label: 'Recent (3 days)', count: emails.filter(e => {
                const threeDaysAgo = new Date();
                threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
                return new Date(e.processedAt) > threeDaysAgo;
              }).length }
            ].map(option => (
              <button
                key={option.value}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterBy === option.value
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}
                onClick={() => setFilterBy(option.value)}
              >
                {option.label} ({option.count})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Email List Stats */}
      {filteredEmails.length > 0 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <p>Showing {filteredEmails.length} of {emails.length} emails</p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-100 rounded-full"></div>
              <span>High Priority</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-orange-100 rounded-full"></div>
              <span>Medium Priority</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-gray-100 rounded-full"></div>
              <span>Low Priority</span>
            </div>
          </div>
        </div>
      )}

      {/* Email List */}
      <div className="space-y-4">
        {filteredEmails.length > 0 ? (
          filteredEmails.map((email, index) => (
            <div
              key={email.id || index}
              className={`card p-6 transition-all cursor-pointer hover:shadow-md ${
                selectedEmail?.id === email.id ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => setSelectedEmail(selectedEmail?.id === email.id ? null : email)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">
                      {email.subject || 'No Subject'}
                    </h3>
                    
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`badge ${getImportanceColor(email.importanceScore)} flex items-center gap-1`}>
                        <Star className="w-3 h-3" />
                        {email.importanceScore || 0}
                      </span>
                      
                      {email.hasDeadline && (
                        <span className="badge bg-yellow-100 text-yellow-700 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Deadline
                        </span>
                      )}
                      
                      {email.hasCalendarEvent && (
                        <span className="badge bg-green-100 text-green-700 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Event
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-gray-600 text-sm mb-3">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      <span className="truncate">{email.sender}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>{new Date(email.processedAt).toLocaleString()}</span>
                    </div>
                  </div>

                  {email.aiSummary && (
                    <div className="bg-blue-50 p-3 rounded-lg mb-3">
                      <p className="text-sm text-blue-800">
                        <strong>AI Summary:</strong> {email.aiSummary}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <button className="btn btn-ghost p-2 text-gray-500 hover:bg-gray-50">
                    <Eye className="w-4 h-4" />
                  </button>
                  <button className="btn btn-ghost p-2 text-gray-500 hover:bg-gray-50">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {selectedEmail?.id === email.id && (
                <div className="mt-6 pt-6 border-t border-gray-200 space-y-6 animate-fade-in">
                  {/* Content Preview */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Mail className="w-5 h-5" />
                      Content Preview
                    </h4>
                    <div className="bg-gray-50 p-4 rounded-lg max-h-40 overflow-y-auto custom-scrollbar">
                      <p className="text-gray-700 text-sm whitespace-pre-wrap">
                        {email.content || 'No content available'}
                      </p>
                    </div>
                  </div>

                  {/* AI Analysis */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      AI Analysis
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600 mb-1">
                          {email.importanceScore || 0}/10
                        </div>
                        <div className="text-sm text-blue-700">
                          {getImportanceLabel(email.importanceScore)} Importance
                        </div>
                      </div>
                      
                      <div className={`p-4 rounded-lg ${email.hasDeadline ? 'bg-yellow-50' : 'bg-gray-50'}`}>
                        <div className={`text-2xl mb-1 ${email.hasDeadline ? 'text-yellow-600' : 'text-gray-600'}`}>
                          {email.hasDeadline ? <CheckCircle className="w-8 h-8" /> : <AlertCircle className="w-8 h-8" />}
                        </div>
                        <div className={`text-sm ${email.hasDeadline ? 'text-yellow-700' : 'text-gray-700'}`}>
                          {email.hasDeadline ? 'Has Deadline' : 'No Deadline'}
                        </div>
                      </div>
                      
                      <div className={`p-4 rounded-lg ${email.hasCalendarEvent ? 'bg-green-50' : 'bg-gray-50'}`}>
                        <div className={`text-2xl mb-1 ${email.hasCalendarEvent ? 'text-green-600' : 'text-gray-600'}`}>
                          {email.hasCalendarEvent ? <Calendar className="w-8 h-8" /> : <Calendar className="w-8 h-8" />}
                        </div>
                        <div className={`text-sm ${email.hasCalendarEvent ? 'text-green-700' : 'text-gray-700'}`}>
                          {email.hasCalendarEvent ? 'Event Created' : 'No Event'}
                        </div>
                      </div>
                      
                      <div className="bg-purple-50 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-purple-600 mb-1">
                          {new Date(email.processedAt).toLocaleDateString()}
                        </div>
                        <div className="text-sm text-purple-700">
                          Processed Date
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Email Metadata */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Email Details</h4>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div>
                          <dt className="font-medium text-gray-600">Message ID:</dt>
                          <dd className="text-gray-900 font-mono text-xs break-all">{email.messageId || email.id}</dd>
                        </div>
                        <div>
                          <dt className="font-medium text-gray-600">Processing Time:</dt>
                          <dd className="text-gray-900">{new Date(email.processedAt).toLocaleString()}</dd>
                        </div>
                        <div>
                          <dt className="font-medium text-gray-600">Content Length:</dt>
                          <dd className="text-gray-900">{email.content ? `${email.content.length} characters` : 'N/A'}</dd>
                        </div>
                        <div>
                          <dt className="font-medium text-gray-600">AI Summary Length:</dt>
                          <dd className="text-gray-900">{email.aiSummary ? `${email.aiSummary.length} characters` : 'N/A'}</dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-16">
            <Mail className="w-20 h-20 text-gray-400 mx-auto mb-6" />
            <h3 className="text-2xl font-semibold text-gray-900 mb-3">No emails found</h3>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              {searchTerm
                ? 'No emails match your search criteria. Try adjusting your search terms or filters.'
                : 'No processed emails yet. Process some emails to see them here.'
              }
            </p>
            
            {!searchTerm && (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  className="btn btn-primary"
                  onClick={() => ui.setActiveTab('dashboard')}
                >
                  <TrendingUp className="w-5 h-5" />
                  Go to Dashboard
                </button>
                
                <button
                  className="btn btn-secondary"
                  onClick={loadEmails}
                >
                  <RefreshCw className="w-5 h-5" />
                  Refresh
                </button>
              </div>
            )}

            {searchTerm && (
              <button
                className="btn btn-secondary"
                onClick={() => setSearchTerm('')}
              >
                Clear Search
              </button>
            )}
          </div>
        )}
      </div>

      {/* Summary Stats */}
      {filteredEmails.length > 0 && (
        <div className="gradient-bg rounded-xl p-6 border border-primary-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Email Processing Summary</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 mb-1">
                {filteredEmails.filter(e => (e.importanceScore || 0) >= 7).length}
              </div>
              <div className="text-sm text-gray-600">High Priority</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600 mb-1">
                {filteredEmails.filter(e => e.hasDeadline).length}
              </div>
              <div className="text-sm text-gray-600">With Deadlines</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 mb-1">
                {filteredEmails.filter(e => e.hasCalendarEvent).length}
              </div>
              <div className="text-sm text-gray-600">Calendar Events</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 mb-1">
                {Math.round(filteredEmails.reduce((acc, email) => acc + (email.importanceScore || 0), 0) / filteredEmails.length) || 0}
              </div>
              <div className="text-sm text-gray-600">Avg. Importance</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailList;