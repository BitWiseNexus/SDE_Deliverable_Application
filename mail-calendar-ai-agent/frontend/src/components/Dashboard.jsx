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
  RefreshCw,
  Lightbulb,
  Target,
  Repeat,
  Star
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 pb-24 md:pb-0">
      {/* Header / Actions */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-tr from-white via-slate-50 to-slate-100 p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
              Welcome back
            </h2>
            <p className="text-sm md:text-base text-slate-600 max-w-xl leading-relaxed">
              Overview of your automated email processing, calendar enrichment and agent activity.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              className="btn btn-primary relative group px-5 py-2.5 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              onClick={handleQuickProcess}
              disabled={processing.isProcessing}
            >
              <Bot className="w-5 h-5" />
              <span>{processing.isProcessing ? 'Processing…' : 'Quick Process'}</span>
              {processing.isProcessing && (
                <span className="absolute inset-0 rounded-md ring-1 ring-inset ring-primary-400/40 animate-pulse" aria-hidden="true" />
              )}
            </button>
            <button
              className="btn btn-secondary px-5 py-2.5 hover:bg-slate-100/70 cursor-pointer"
              onClick={loadDashboardData}
            >
              <RefreshCw className="w-5 h-5" />
              Refresh
            </button>
          </div>
        </div>
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gradient-to-br from-primary-200/40 to-primary-300/10 blur-3xl" />
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
        <div className="rounded-2xl border border-slate-200 bg-white/70 backdrop-blur-sm p-6 md:p-7">
          <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
            <h3 className="text-lg md:text-xl font-semibold text-slate-900 flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Last Processing Results
            </h3>
            {processing.lastProcessing && (
              <p className="text-xs md:text-sm text-slate-500 flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {new Date(processing.lastProcessing).toLocaleString()}
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-slate-50/60">
            <div className="flex flex-col items-center justify-center gap-1 py-5 px-2">
              <span className="text-2xl font-semibold text-slate-900 tracking-tight">{processing.results.summary.processedEmails}</span>
              <span className="text-xs font-medium text-slate-500 uppercase">Processed</span>
            </div>
            <div className="flex flex-col items-center justify-center gap-1 py-5 px-2">
              <span className="text-2xl font-semibold text-green-600 tracking-tight">{processing.results.summary.createdEvents}</span>
              <span className="text-xs font-medium text-slate-500 uppercase">Events</span>
            </div>
            <div className="flex flex-col items-center justify-center gap-1 py-5 px-2">
              <span className="text-2xl font-semibold text-slate-800 tracking-tight">{processing.results.summary.skippedEmails}</span>
              <span className="text-xs font-medium text-slate-500 uppercase">Skipped</span>
            </div>
            <div className="flex flex-col items-center justify-center gap-1 py-5 px-2">
              <span className="text-2xl font-semibold text-red-600 tracking-tight">{processing.results.summary.errors}</span>
              <span className="text-xs font-medium text-slate-500 uppercase">Errors</span>
            </div>
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Recent Emails */}
        <div className="rounded-2xl border border-slate-200 bg-white/70 backdrop-blur-sm p-6 md:p-7 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg md:text-xl font-semibold text-slate-900 flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Recent Processed Emails
            </h3>
            <span className="text-xs text-slate-500 font-medium">Latest {dashboardData.recentEmails.length}</span>
          </div>
          {dashboardData.recentEmails.length > 0 ? (
            <ul className="space-y-3">
              {dashboardData.recentEmails.map((email, index) => (
                <li
                  key={email.id || index}
                  className="group relative rounded-xl border border-slate-100 bg-white hover:border-slate-200 transition-colors px-4 py-3 flex flex-col gap-1"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900 truncate tracking-tight">
                        {email.subject || 'No Subject'}
                      </p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                        <span className="truncate max-w-[10rem]">{email.sender}</span>
                        <span className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 text-amber-500" />
                          {email.importanceScore || 0}/10
                        </span>
                        {email.hasCalendarEvent && (
                          <span className="flex items-center gap-1 text-green-600">
                            <Calendar className="w-3.5 h-3.5" />
                            Event
                          </span>
                        )}
                      </div>
                    </div>
                    <time className="text-[11px] whitespace-nowrap font-medium text-slate-400">
                      {new Date(email.processedAt).toLocaleDateString()}
                    </time>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 py-10 text-center">
              <Mail className="w-10 h-10 text-slate-300 mb-4" />
              <p className="text-slate-500 text-sm mb-4">No emails processed yet</p>
              <button
                className="btn btn-primary cursor-pointer"
                onClick={handleQuickProcess}
              >
                Process Some Emails
              </button>
            </div>
          )}
        </div>

        {/* Agent Logs */}
        <div className="rounded-2xl border border-slate-200 bg-white/70 backdrop-blur-sm p-6 md:p-7 flex flex-col">
          <h3 className="text-lg md:text-xl font-semibold text-slate-900 mb-6 flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Recent Agent Activity
          </h3>
          {dashboardData.recentLogs.length > 0 ? (
            <ul className="space-y-3">
              {dashboardData.recentLogs.map((log, index) => (
                <li
                  key={log.id || index}
                  className="flex items-start gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3" 
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium ${
                    log.status === 'success' ? 'bg-green-50 text-green-600 ring-1 ring-green-200' :
                    log.status === 'error' ? 'bg-red-50 text-red-600 ring-1 ring-red-200' :
                    'bg-slate-50 text-slate-600 ring-1 ring-slate-200'
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
                    <p className="text-sm font-medium text-slate-900 leading-snug truncate">
                      {log.action.replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{log.details}</p>
                    <p className="text-[10px] text-slate-400 mt-1 tracking-wide">
                      {new Date(log.created_at).toLocaleString()}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 py-10 text-center">
              <Activity className="w-10 h-10 text-slate-300 mb-4" />
              <p className="text-slate-500 text-sm">No recent activity</p>
            </div>
          )}
        </div>
      </div>

      {/* Optimization Tips */}
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-tr from-slate-50 via-white to-slate-100 p-6 md:p-8">
        <h3 className="text-lg md:text-xl font-semibold text-slate-900 mb-6 flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-amber-500" />
          Optimization Tips
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="group relative rounded-xl border border-slate-200 bg-white/90 p-4 transition-shadow hover:shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center ring-1 ring-blue-100">
                <Mail className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-900">Regular Processing</p>
                <p className="text-xs leading-relaxed text-slate-600">Run processing frequently to surface new deadlines when they are most actionable.</p>
              </div>
            </div>
          </div>
          <div className="group relative rounded-xl border border-slate-200 bg-white/90 p-4 transition-shadow hover:shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-md bg-green-50 text-green-600 flex items-center justify-center ring-1 ring-green-100">
                <Calendar className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-900">Calendar Sync</p>
                <p className="text-xs leading-relaxed text-slate-600">Enable event creation to capture important dates without manual effort.</p>
              </div>
            </div>
          </div>
          <div className="group relative rounded-xl border border-slate-200 bg-white/90 p-4 transition-shadow hover:shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center ring-1 ring-amber-100">
                <Target className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-900">Importance Focus</p>
                <p className="text-xs leading-relaxed text-slate-600">Review items scoring 7+ first to prioritize meaningful actions.</p>
              </div>
            </div>
          </div>
          <div className="group relative rounded-xl border border-slate-200 bg-white/90 p-4 transition-shadow hover:shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-md bg-purple-50 text-purple-600 flex items-center justify-center ring-1 ring-purple-100">
                <Repeat className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-900">Consistent Routine</p>
                <p className="text-xs leading-relaxed text-slate-600">Daily processing keeps the knowledge base fresh and organized.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;