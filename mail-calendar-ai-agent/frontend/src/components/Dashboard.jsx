import React, { useEffect, useState } from 'react';
import { useAuth, useData, useProcessing } from '../hooks/useApi.js';
import { databaseService, agentService } from '../services/api.js';
import { 
  Mail, 
  Calendar, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Activity,
  Bot,
  RefreshCw
} from 'lucide-react';
import LoadingSpinner from './LoadingSpinner.jsx';
import StatCard from './StatCard.jsx';

const Dashboard = () => {
  const auth = useAuth();
  const data = useData();
  const processing = useProcessing();
  const [dashboardData, setDashboardData] = useState({
    stats: null,
    recentEmails: [],
    recentLogs: [],
    loading: true
  });

  useEffect(() => {
    loadDashboardData();
  }, [auth.email]);

  const loadDashboardData = async () => {
    if (!auth.email) return;

    try {
      setDashboardData(prev => ({ ...prev, loading: true }));

      const [statsRes, emailsRes, logsRes] = await Promise.allSettled([
        databaseService.getStats(),
        databaseService.getProcessedEmails(auth.email, 5),
        agentService.getLogs(auth.email, 10)
      ]);

      setDashboardData({
        stats: statsRes.status === 'fulfilled' ? statsRes.value.data.stats : null,
        recentEmails: emailsRes.status === 'fulfilled' ? emailsRes.value.data.emails : [],
        recentLogs: logsRes.status === 'fulfilled' ? logsRes.value.data.logs : [],
        loading: false
      });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setDashboardData(prev => ({ ...prev, loading: false }));
    }
  };

  const handleQuickProcess = async () => {
    try {
      await processing.processEmails({ maxEmails: 5, createCalendarEvents: true });
      // Refresh dashboard after processing
      setTimeout(loadDashboardData, 1000);
    } catch (error) {
      console.error('Processing failed:', error);
    }
  };

  if (dashboardData.loading) {
    return <LoadingSpinner message="Loading dashboard..." />;
  }

  const stats = dashboardData.stats || {};

  return (
    <div className="dashboard">
      {/* Welcome Section */}
      <div className="dashboard-header">
        <div className="welcome-section">
          <h2>Welcome back! 👋</h2>
          <p>Here's what's happening with your email processing</p>
        </div>
        
        <div className="quick-actions">
          <button 
            className="btn btn-primary"
            onClick={handleQuickProcess}
            disabled={processing.isProcessing}
          >
            <Bot className="icon" />
            {processing.isProcessing ? 'Processing...' : 'Quick Process'}
          </button>
          
          <button 
            className="btn btn-secondary"
            onClick={loadDashboardData}
          >
            <RefreshCw className="icon" />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <StatCard
          title="Total Emails Processed"
          value={stats.processedEmails || 0}
          icon={Mail}
          color="blue"
          subtitle="All time"
        />
        
        <StatCard
          title="Calendar Events Created"
          value={stats.emailsWithEvents || 0}
          icon={Calendar}
          color="green"
          subtitle="From deadlines"
        />
        
        <StatCard
          title="Average Importance"
          value={stats.avgImportance ? `${stats.avgImportance}/10` : 'N/A'}
          icon={TrendingUp}
          color="orange"
          subtitle="Email importance score"
        />
        
        <StatCard
          title="Success Rate"
          value={stats.agentLogs > 0 ? `${Math.round((stats.successfulActions / stats.agentLogs) * 100)}%` : 'N/A'}
          icon={CheckCircle}
          color="purple"
          subtitle="Processing success"
        />
      </div>

      {/* Processing Results */}
      {processing.results && (
        <div className="processing-results">
          <h3>
            <Activity className="icon" />
            Last Processing Results
          </h3>
          
          <div className="results-grid">
            <div className="result-item">
              <div className="result-number">{processing.results.summary.processedEmails}</div>
              <div className="result-label">Emails Processed</div>
            </div>
            
            <div className="result-item">
              <div className="result-number">{processing.results.summary.createdEvents}</div>
              <div className="result-label">Events Created</div>
            </div>
            
            <div className="result-item">
              <div className="result-number">{processing.results.summary.skippedEmails}</div>
              <div className="result-label">Emails Skipped</div>
            </div>
            
            <div className="result-item">
              <div className="result-number">{processing.results.summary.errors}</div>
              <div className="result-label">Errors</div>
            </div>
          </div>
          
          {processing.lastProcessing && (
            <p className="processing-time">
              <Clock className="icon" />
              Last processed: {new Date(processing.lastProcessing).toLocaleString()}
            </p>
          )}
        </div>
      )}

      {/* Recent Activity */}
      <div className="dashboard-sections">
        <div className="section">
          <h3>
            <Mail className="icon" />
            Recent Processed Emails
          </h3>
          
          {dashboardData.recentEmails.length > 0 ? (
            <div className="email-list">
              {dashboardData.recentEmails.map((email, index) => (
                <div key={email.id || index} className="email-item">
                  <div className="email-content">
                    <div className="email-subject">{email.subject || 'No Subject'}</div>
                    <div className="email-meta">
                      <span className="email-sender">{email.sender}</span>
                      <span className="email-importance">
                        Importance: {email.importanceScore || 0}/10
                      </span>
                      {email.hasCalendarEvent && (
                        <span className="calendar-indicator">
                          <Calendar className="icon" />
                          Event Created
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="email-time">
                    {new Date(email.processedAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <Mail className="empty-icon" />
              <p>No emails processed yet</p>
              <button className="btn btn-primary" onClick={handleQuickProcess}>
                Process Some Emails
              </button>
            </div>
          )}
        </div>

        <div className="section">
          <h3>
            <Activity className="icon" />
            Recent Agent Activity
          </h3>
          
          {dashboardData.recentLogs.length > 0 ? (
            <div className="activity-list">
              {dashboardData.recentLogs.map((log, index) => (
                <div key={log.id || index} className="activity-item">
                  <div className={`activity-status ${log.status}`}>
                    {log.status === 'success' ? (
                      <CheckCircle className="icon" />
                    ) : log.status === 'error' ? (
                      <AlertCircle className="icon" />
                    ) : (
                      <Clock className="icon" />
                    )}
                  </div>
                  
                  <div className="activity-content">
                    <div className="activity-action">{log.action.replace(/_/g, ' ')}</div>
                    <div className="activity-details">{log.details}</div>
                    <div className="activity-time">
                      {new Date(log.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <Activity className="empty-icon" />
              <p>No recent activity</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Tips */}
      <div className="tips-section">
        <h3>💡 Tips for Better Results</h3>
        <div className="tips-grid">
          <div className="tip">
            <strong>📧 Email Processing:</strong>
            <p>Process emails regularly to catch important deadlines. The AI works best with recent emails.</p>
          </div>
          
          <div className="tip">
            <strong>📅 Calendar Integration:</strong>
            <p>Enable calendar event creation to automatically add important deadlines to your Google Calendar.</p>
          </div>
          
          <div className="tip">
            <strong>🎯 Importance Scoring:</strong>
            <p>Emails scored 7+ are considered high importance. Review these first for urgent items.</p>
          </div>
          
          <div className="tip">
            <strong>🔄 Regular Processing:</strong>
            <p>Set up a routine to process emails daily. This helps maintain an organized inbox and calendar.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;