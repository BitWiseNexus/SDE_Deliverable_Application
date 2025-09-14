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
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Welcome back! 👋</h2>
          <p className="text-gray-600 mt-2">Here's what's happening with your email processing</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
            onClick={handleQuickProcess}
            disabled={processing.isProcessing}
          >
            <Bot className="w-5 h-5" />
            {processing.isProcessing ? 'Processing...' : 'Quick Process'}
          </button>
          
          <button 
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
            onClick={loadDashboardData}
          >
            <RefreshCw className="w-5 h-5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Activity className="w-6 h-6" />
            Last Processing Results
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-900">{processing.results.summary.processedEmails}</div>
              <div className="text-sm text-blue-700">Emails Processed</div>
            </div>
            
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-900">{processing.results.summary.createdEvents}</div>
              <div className="text-sm text-green-700">Events Created</div>
            </div>
            
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">{processing.results.summary.skippedEmails}</div>
              <div className="text-sm text-gray-700">Emails Skipped</div>
            </div>
            
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-900">{processing.results.summary.errors}</div>
              <div className="text-sm text-red-700">Errors</div>
            </div>
          </div>
          
          {processing.lastProcessing && (
            <p className="text-gray-600 text-sm flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Last processed: {new Date(processing.lastProcessing).toLocaleString()}
            </p>
          )}
        </div>
      )}

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Mail className="w-6 h-6" />
            Recent Processed Emails
          </h3>
          
          {dashboardData.recentEmails.length > 0 ? (
            <div className="space-y-4">
              {dashboardData.recentEmails.map((email, index) => (
                <div key={email.id || index} className="p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 truncate">{email.subject || 'No Subject'}</div>
                      <div className="text-sm text-gray-600 mt-1 flex items-center gap-4">
                        <span className="truncate">{email.sender}</span>
                        <span className="flex items-center gap-1">
                          Importance: {email.importanceScore || 0}/10
                        </span>
                        {email.hasCalendarEvent && (
                          <span className="text-green-600 flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            Event Created
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-sm text-gray-500">
                      {new Date(email.processedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">No emails processed yet</p>
              <button 
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                onClick={handleQuickProcess}
              >
                Process Some Emails
              </button>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Activity className="w-6 h-6" />
            Recent Agent Activity
          </h3>
          
          {dashboardData.recentLogs.length > 0 ? (
            <div className="space-y-4">
              {dashboardData.recentLogs.map((log, index) => (
                <div key={log.id || index} className="flex items-start gap-3 p-3 border border-gray-100 rounded-lg">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                    log.status === 'success' ? 'bg-green-100 text-green-600' : 
                    log.status === 'error' ? 'bg-red-100 text-red-600' : 
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {log.status === 'success' ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : log.status === 'error' ? (
                      <AlertCircle className="w-4 h-4" />
                    ) : (
                      <Clock className="w-4 h-4" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900">{log.action.replace(/_/g, ' ')}</div>
                    <div className="text-sm text-gray-600 truncate">{log.details}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(log.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No recent activity</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Tips */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">💡 Tips for Better Results</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white/50 p-4 rounded-lg">
            <strong className="text-blue-900">📧 Email Processing:</strong>
            <p className="text-gray-700 text-sm mt-1">Process emails regularly to catch important deadlines. The AI works best with recent emails.</p>
          </div>
          
          <div className="bg-white/50 p-4 rounded-lg">
            <strong className="text-green-900">📅 Calendar Integration:</strong>
            <p className="text-gray-700 text-sm mt-1">Enable calendar event creation to automatically add important deadlines to your Google Calendar.</p>
          </div>
          
          <div className="bg-white/50 p-4 rounded-lg">
            <strong className="text-orange-900">🎯 Importance Scoring:</strong>
            <p className="text-gray-700 text-sm mt-1">Emails scored 7+ are considered high importance. Review these first for urgent items.</p>
          </div>
          
          <div className="bg-white/50 p-4 rounded-lg">
            <strong className="text-purple-900">🔄 Regular Processing:</strong>
            <p className="text-gray-700 text-sm mt-1">Set up a routine to process emails daily. This helps maintain an organized inbox and calendar.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;