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
    <div className="settings-section">
      <h3>Account Information</h3>
      
      <div className="account-info">
        <div className="info-group">
          <label>Email Address:</label>
          <div className="info-value">{auth.email}</div>
        </div>
        
        <div className="info-group">
          <label>Authentication Status:</label>
          <div className={`info-value status ${auth.authenticated ? 'success' : 'error'}`}>
            {auth.authenticated ? (
              <>
                <CheckCircle className="icon" />
                Authenticated
              </>
            ) : (
              <>
                <AlertCircle className="icon" />
                Not Authenticated
              </>
            )}
          </div>
        </div>
        
        <div className="info-group">
          <label>Google Services:</label>
          <div className="services-list">
            <div className="service-item">
              <span>Gmail API</span>
              <CheckCircle className="icon success" />
            </div>
            <div className="service-item">
              <span>Calendar API</span>
              <CheckCircle className="icon success" />
            </div>
          </div>
        </div>
      </div>

      <div className="account-actions">
        <button className="btn btn-secondary" onClick={auth.logout}>
          <Shield className="icon" />
          Logout
        </button>
        
        <a
          href="https://myaccount.google.com/permissions"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-ghost"
        >
          <ExternalLink className="icon" />
          Manage Google Permissions
        </a>
      </div>
    </div>
  );

  const renderPrivacySection = () => (
    <div className="settings-section">
      <h3>Privacy & Data Management</h3>
      
      <div className="privacy-info">
        <div className="privacy-item">
          <h4>Data Storage</h4>
          <p>Your email processing data is stored locally and securely. We only store email metadata, summaries, and analysis results.</p>
        </div>
        
        <div className="privacy-item">
          <h4>Google Account Access</h4>
          <p>We access your Gmail for reading emails and Google Calendar for creating events. We never send emails or modify existing events without your permission.</p>
        </div>
        
        <div className="privacy-item">
          <h4>AI Processing</h4>
          <p>Email content is processed by Google's Gemini AI to extract insights and deadlines. No email content is permanently stored by external AI services.</p>
        </div>
      </div>

      <div className="data-actions">
        <div className="action-group">
          <h4>Data Management</h4>
          
          <button className="btn btn-secondary" onClick={exportData}>
            <Download className="icon" />
            Export My Data
          </button>
          
          <button className="btn btn-danger" onClick={clearAllData}>
            <Trash2 className="icon" />
            Clear All Data
          </button>
        </div>
      </div>
    </div>
  );

  const renderSystemSection = () => (
    <div className="settings-section">
      <h3>System Information</h3>
      
      {loadingSystem ? (
        <LoadingSpinner message="Loading system info..." />
      ) : systemInfo ? (
        <div className="system-info">
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Application:</span>
              <span className="info-value">{systemInfo.name}</span>
            </div>
            
            <div className="info-item">
              <span className="info-label">Version:</span>
              <span className="info-value">{systemInfo.version}</span>
            </div>
            
            <div className="info-item">
              <span className="info-label">Environment:</span>
              <span className="info-value">{systemInfo.environment || 'development'}</span>
            </div>
          </div>

          <div className="endpoints-info">
            <h4>Available Endpoints:</h4>
            <div className="endpoints-list">
              {systemInfo.endpoints && Object.entries(systemInfo.endpoints).map(([key, value]) => (
                <div key={key} className="endpoint-item">
                  <span className="endpoint-name">{key}:</span>
                  <span className="endpoint-path">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="error-state">
          <AlertCircle className="icon" />
          <p>Failed to load system information</p>
          <button className="btn btn-secondary" onClick={loadSystemInfo}>
            <RefreshCw className="icon" />
            Retry
          </button>
        </div>
      )}
    </div>
  );

  const renderTestingSection = () => (
    <div className="settings-section">
      <h3>System Testing</h3>
      
      <div className="testing-info">
        <p>Run comprehensive tests to ensure all services are working correctly.</p>
        
        <button 
          className="btn btn-primary"
          onClick={runSystemTests}
          disabled={testing || !auth.email}
        >
          <TestTube className="icon" />
          {testing ? 'Running Tests...' : 'Run System Tests'}
        </button>
      </div>

      {testResults && (
        <div className="test-results">
          <h4>Test Results:</h4>
          
          <div className="results-list">
            {Object.entries(testResults).map(([service, result]) => (
              <div key={service} className={`test-result ${result.success ? 'success' : 'error'}`}>
                <div className="result-header">
                  {result.success ? (
                    <CheckCircle className="icon success" />
                  ) : (
                    <AlertCircle className="icon error" />
                  )}
                  <span className="service-name">{service.charAt(0).toUpperCase() + service.slice(1)} Service</span>
                </div>
                
                {result.error && (
                  <div className="result-error">{result.error}</div>
                )}
                
                {result.response && (
                  <div className="result-details">
                    Response: {result.response}
                  </div>
                )}
              </div>
            ))}
          </div>
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
    <div className="settings-container">
      <div className="settings-sidebar">
        <div className="settings-nav">
          {sections.map(section => (
            <button
              key={section.id}
              className={`settings-nav-item ${activeSection === section.id ? 'active' : ''}`}
              onClick={() => setActiveSection(section.id)}
            >
              <section.icon className="icon" />
              {section.name}
            </button>
          ))}
        </div>
      </div>

      <div className="settings-content">
        {renderContent()}
      </div>
    </div>
  );
};

export default Settings;