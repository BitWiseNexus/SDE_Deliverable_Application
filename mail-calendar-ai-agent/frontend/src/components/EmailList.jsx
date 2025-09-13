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
  MoreHorizontal
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
    if (score >= 8) return 'high';
    if (score >= 6) return 'medium';
    return 'low';
  };

  const getImportanceLabel = (score) => {
    if (score >= 8) return 'High';
    if (score >= 6) return 'Medium';
    return 'Low';
  };

  if (loading) {
    return <LoadingSpinner message="Loading processed emails..." />;
  }

  return (
    <div className="email-list-container">
      {/* Header Controls */}
      <div className="email-list-header">
        <div className="search-section">
          <div className="search-input-wrapper">
            <Search className="search-icon" />
            <input
              type="text"
              placeholder="Search emails..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        </div>

        <div className="controls-section">
          <div className="sort-controls">
            <label>Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="sort-select"
            >
              <option value="processedAt">Latest Processed</option>
              <option value="importance">Importance Score</option>
              <option value="subject">Subject</option>
              <option value="sender">Sender</option>
            </select>
          </div>

          <div className="filter-controls">
            <button
              className={`filter-btn ${showFilters ? 'active' : ''}`}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="icon" />
              Filters
              <ChevronDown className={`icon ${showFilters ? 'rotate' : ''}`} />
            </button>
          </div>

          <button className="refresh-btn" onClick={loadEmails}>
            <RefreshCw className="icon" />
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="filter-panel">
          <div className="filter-options">
            {[
              { value: 'all', label: 'All Emails' },
              { value: 'high-importance', label: 'High Importance (7+)' },
              { value: 'has-deadline', label: 'Has Deadline' },
              { value: 'has-calendar', label: 'Calendar Event Created' },
              { value: 'recent', label: 'Recent (3 days)' }
            ].map(option => (
              <button
                key={option.value}
                className={`filter-option ${filterBy === option.value ? 'active' : ''}`}
                onClick={() => setFilterBy(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Email List */}
      <div className="email-list">
        {filteredEmails.length > 0 ? (
          <>
            <div className="email-list-stats">
              <p>Showing {filteredEmails.length} of {emails.length} emails</p>
            </div>

            {filteredEmails.map((email, index) => (
              <div
                key={email.id || index}
                className={`email-item ${selectedEmail?.id === email.id ? 'selected' : ''}`}
                onClick={() => setSelectedEmail(selectedEmail?.id === email.id ? null : email)}
              >
                <div className="email-item-header">
                  <div className="email-subject-section">
                    <div className="email-subject">{email.subject || 'No Subject'}</div>
                    <div className="email-indicators">
                      <div className={`importance-badge ${getImportanceColor(email.importanceScore)}`}>
                        <Star className="icon" />
                        {email.importanceScore || 0}
                      </div>
                      
                      {email.hasDeadline && (
                        <div className="deadline-badge">
                          <Clock className="icon" />
                          Deadline
                        </div>
                      )}
                      
                      {email.hasCalendarEvent && (
                        <div className="calendar-badge">
                          <Calendar className="icon" />
                          Event
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="email-meta-section">
                    <div className="email-sender">
                      <User className="icon" />
                      {email.sender}
                    </div>
                    <div className="email-time">
                      {new Date(email.processedAt).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="email-actions">
                    <button className="action-btn">
                      <Eye className="icon" />
                    </button>
                    <button className="action-btn">
                      <MoreHorizontal className="icon" />
                    </button>
                  </div>
                </div>

                {email.aiSummary && (
                  <div className="email-summary">
                    <strong>AI Summary:</strong> {email.aiSummary}
                  </div>
                )}

                {selectedEmail?.id === email.id && (
                  <div className="email-details">
                    <div className="email-content-preview">
                      <h4>Content Preview:</h4>
                      <p>{email.content || 'No content available'}</p>
                    </div>

                    <div className="email-analysis">
                      <h4>AI Analysis:</h4>
                      <div className="analysis-grid">
                        <div className="analysis-item">
                          <span className="analysis-label">Importance:</span>
                          <span className="analysis-value">
                            {email.importanceScore || 0}/10 - {getImportanceLabel(email.importanceScore)}
                          </span>
                        </div>
                        
                        <div className="analysis-item">
                          <span className="analysis-label">Has Deadline:</span>
                          <span className="analysis-value">
                            {email.hasDeadline ? '✅ Yes' : '❌ No'}
                          </span>
                        </div>
                        
                        <div className="analysis-item">
                          <span className="analysis-label">Calendar Event:</span>
                          <span className="analysis-value">
                            {email.hasCalendarEvent ? '✅ Created' : '❌ Not Created'}
                          </span>
                        </div>
                        
                        <div className="analysis-item">
                          <span className="analysis-label">Processed:</span>
                          <span className="analysis-value">
                            {new Date(email.processedAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </>
        ) : (
          <div className="empty-state">
            <Mail className="empty-icon" />
            <h3>No emails found</h3>
            <p>
              {searchTerm
                ? 'No emails match your search criteria'
                : 'No processed emails yet. Process some emails to see them here.'
              }
            </p>
            {!searchTerm && (
              <button
                className="btn btn-primary"
                onClick={() => ui.setActiveTab('dashboard')}
              >
                Go to Dashboard
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EmailList;