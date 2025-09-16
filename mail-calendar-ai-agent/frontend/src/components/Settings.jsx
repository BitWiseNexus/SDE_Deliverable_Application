import React, { useState, useEffect } from 'react';
import { useAuth, useUI } from '../hooks/useApi.js';
import { agentService, healthService } from '../services/api.js';
import { 
  Settings as SettingsIcon, 
  User, 
  Shield, 
  Database,
  Bot,
  Trash2,
  RefreshCw,
  ExternalLink,
  TestTube,
  AlertCircle,
  CheckCircle,
  Download
} from 'lucide-react';
import LoadingSpinner from './LoadingSpinner.jsx';

const Settings = () => {
  const auth = useAuth();
  const ui = useUI();
  const [activeSection, setActiveSection] = useState('account');
  const [testResults, setTestResults] = useState(null);
  const [testing, setTesting] = useState(false);
  const [systemInfo, setSystemInfo] = useState(null);
  const [loadingSystem, setLoadingSystem] = useState(false);

  useEffect(() => {
    loadSystemInfo();
  }, []);

  const loadSystemInfo = async () => {
    try {
      setLoadingSystem(true);
      const response = await healthService.getInfo();
      setSystemInfo(response.data);
    } catch (error) {
      console.error('Failed to load system info:', error);
    } finally {
      setLoadingSystem(false);
    }
  };

  const runSystemTests = async () => {
    if (!auth.email) return;

    try {
      setTesting(true);
      ui.addNotification({
        type: 'info',
        message: 'Running system tests...',
        duration: 3000
      });

      const response = await agentService.testServices(auth.email);
      setTestResults(response.data.results);

      const allPassed = Object.values(response.data.results).every(test => test.success);
      ui.addNotification({
        type: allPassed ? 'success' : 'warning',
        message: allPassed ? 'All tests passed!' : 'Some tests failed - check results',
        duration: 5000
      });
    } catch (error) {
      console.error('Tests failed:', error);
      ui.addNotification({
        type: 'error',
        message: 'Failed to run system tests'
      });
    } finally {
      setTesting(false);
    }
  };

  const exportData = async () => {
    try {
      // This would typically call an export endpoint
      ui.addNotification({
        type: 'info',
        message: 'Data export functionality would be implemented here',
        duration: 3000
      });
    } catch (error) {
      ui.addNotification({
        type: 'error',
        message: 'Export failed'
      });
    }
  };

  const clearAllData = async () => {
    const confirmed = confirm(
      'Are you sure you want to clear all processed email data? This action cannot be undone.'
    );
    
    if (!confirmed) return;

    try {
      ui.addNotification({
        type: 'info',
        message: 'Data clearing functionality would be implemented here',
        duration: 3000
      });
    } catch (error) {
      ui.addNotification({
        type: 'error',
        message: 'Failed to clear data'
      });
    }
  };

  const sections = [
    { id: 'account', name: 'Account', icon: User },
    { id: 'privacy', name: 'Privacy & Data', icon: Shield },
    { id: 'system', name: 'System Info', icon: Database },
    { id: 'testing', name: 'Testing', icon: TestTube },
  ];

  const renderAccountSection = () => (
    <div className="space-y-8">
      <div className="space-y-2">
        <h3 className="text-sm font-semibold tracking-wide text-slate-700 uppercase">Account</h3>
        <p className="text-xs text-slate-500">Your authentication status and connected Google services.</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="rounded-xl border border-slate-200 bg-white/70 backdrop-blur-sm p-5 space-y-4">
          <div>
            <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-1">Email</div>
            <div className="text-sm font-medium text-slate-800 break-all">{auth.email}</div>
          </div>
          <div>
            <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-1">Status</div>
            <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium ${auth.authenticated ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {auth.authenticated ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
              {auth.authenticated ? 'Authenticated' : 'Not Authenticated'}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <button className="btn btn-secondary text-xs" onClick={auth.logout}>Logout</button>
            <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" className="btn btn-ghost text-xs"><ExternalLink className="w-3.5 h-3.5" />Permissions</a>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white/70 backdrop-blur-sm p-5 space-y-3">
          <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">Google Services</div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50 border border-slate-200"><span className="font-medium text-slate-700">Gmail API</span><CheckCircle className="w-4 h-4 text-green-600" /></div>
            <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50 border border-slate-200"><span className="font-medium text-slate-700">Calendar API</span><CheckCircle className="w-4 h-4 text-green-600" /></div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white/70 backdrop-blur-sm p-5 space-y-3">
          <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">Data Export</div>
          <p className="text-xs leading-relaxed text-slate-600">Download your processed email summaries and event metadata.</p>
          <button className="btn btn-secondary text-xs w-fit" onClick={exportData}><Download className="w-3.5 h-3.5" />Export</button>
        </div>
      </div>
    </div>
  );

  const renderPrivacySection = () => (
    <div className="space-y-8">
      <div className="space-y-2">
        <h3 className="text-sm font-semibold tracking-wide text-slate-700 uppercase">Privacy & Data</h3>
        <p className="text-xs text-slate-500">Understand how your data is used and manage retention.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[
          { title:'Data Storage', body:'We store only email metadata, summaries, and analysis results locally.'},
          { title:'Google Access', body:'Read-only Gmail access & Calendar event creation with your permission.'},
          { title:'AI Processing', body:'Gemini AI extracts insights; raw content is not stored externally.'}
        ].map(item => (
          <div key={item.title} className="rounded-xl border border-slate-200 bg-white/70 backdrop-blur-sm p-5">
            <h4 className="font-semibold text-slate-800 mb-1">{item.title}</h4>
            <p className="text-xs leading-relaxed text-slate-600">{item.body}</p>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-slate-200 bg-white/70 backdrop-blur-sm p-5 space-y-4">
        <h4 className="font-semibold text-slate-800">Data Management</h4>
        <div className="flex flex-col sm:flex-row gap-3">
          <button className="btn btn-secondary" onClick={exportData}><Download className="w-4 h-4" />Export Data</button>
          <button className="btn btn-danger" onClick={clearAllData}><Trash2 className="w-4 h-4" />Clear All Data</button>
        </div>
      </div>
    </div>
  );

  const renderSystemSection = () => (
    <div className="space-y-8">
      <div className="space-y-2">
        <h3 className="text-sm font-semibold tracking-wide text-slate-700 uppercase">System</h3>
        <p className="text-xs text-slate-500">Runtime and service endpoint metadata.</p>
      </div>
      {loadingSystem ? (
        <div className="rounded-xl border border-slate-200 bg-white/70 p-6"><LoadingSpinner message="Loading system info..." /></div>
      ) : systemInfo ? (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white/70 p-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div><div className="text-[11px] font-medium text-slate-500 uppercase mb-1">Application</div><div className="font-medium text-slate-800">{systemInfo.name}</div></div>
              <div><div className="text-[11px] font-medium text-slate-500 uppercase mb-1">Version</div><div className="font-medium text-slate-800">{systemInfo.version}</div></div>
              <div><div className="text-[11px] font-medium text-slate-500 uppercase mb-1">Environment</div><div className="font-medium text-slate-800">{systemInfo.environment || 'development'}</div></div>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white/70 p-5">
            <h4 className="font-semibold text-slate-800 mb-3">Endpoints</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {systemInfo.endpoints && Object.entries(systemInfo.endpoints).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-slate-700 font-medium text-sm">{key}</span>
                  <span className="text-slate-600 font-mono text-[11px] break-all ml-3">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white/70 p-6 text-center space-y-3">
          <AlertCircle className="w-6 h-6 text-red-600 mx-auto" />
          <p className="text-sm text-slate-600">Failed to load system information</p>
          <button className="btn btn-secondary mx-auto" onClick={loadSystemInfo}><RefreshCw className="w-4 h-4" />Retry</button>
        </div>
      )}
    </div>
  );

  const renderTestingSection = () => (
    <div className="space-y-8">
      <div className="space-y-2">
        <h3 className="text-sm font-semibold tracking-wide text-slate-700 uppercase">Testing</h3>
        <p className="text-xs text-slate-500">Run service connectivity and health diagnostics.</p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white/70 p-5 space-y-4">
        <p className="text-sm text-slate-600">Execute a suite of checks across Gmail, Calendar, AI processing, and database connectivity.</p>
        <button className="btn btn-primary w-fit" onClick={runSystemTests} disabled={testing || !auth.email}>
          <TestTube className="w-4 h-4" />{testing ? 'Running...' : 'Run Tests'}
        </button>
      </div>
      {testResults && (
        <div className="rounded-xl border border-slate-200 bg-white/70 p-5 space-y-3">
          <h4 className="font-semibold text-slate-800 mb-1">Results</h4>
            {Object.entries(testResults).map(([service, result]) => (
              <div key={service} className={`p-3 rounded-lg border text-sm ${result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <div className="flex items-center gap-2 mb-1">
                  {result.success ? <CheckCircle className="w-4 h-4 text-green-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
                  <span className="font-medium text-slate-800">{service.charAt(0).toUpperCase() + service.slice(1)}</span>
                </div>
                {result.error && <div className="text-xs text-red-700">{result.error}</div>}
                {result.response && <div className="text-xs text-slate-700">Response: {result.response}</div>}
              </div>
            ))}
        </div>
      )}
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'account':
        return renderAccountSection();
      case 'privacy':
        return renderPrivacySection();
      case 'system':
        return renderSystemSection();
      case 'testing':
        return renderTestingSection();
      default:
        return renderAccountSection();
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 pb-24 md:pb-0">
      <aside className="lg:w-60 xl:w-64 flex-shrink-0">
        <div className="rounded-xl border border-slate-200 bg-white/70 backdrop-blur-sm p-3 sticky top-4">
          <nav className="space-y-1">
            {sections.map(section => (
              <button
                key={section.id}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 border ${
                  activeSection === section.id
                    ? 'bg-slate-900 text-white shadow-sm border-transparent'
                    : 'text-slate-600 hover:bg-slate-100 border-transparent'
                }`}
                onClick={() => setActiveSection(section.id)}
                onMouseUp={(e) => e.currentTarget.blur()}
              >
                <section.icon className="w-4 h-4" />
                {section.name}
              </button>
            ))}
          </nav>
        </div>
      </aside>
      <section className="flex-1 min-w-0 space-y-10">
        {renderContent()}
      </section>
    </div>
  );
};

export default Settings;