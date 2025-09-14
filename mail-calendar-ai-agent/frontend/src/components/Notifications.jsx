import React from 'react';
import { useUI } from '../hooks/useApi.js';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

const Notifications = () => {
  const ui = useUI();

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success':
        return CheckCircle;
      case 'error':
        return AlertCircle;
      case 'warning':
        return AlertTriangle;
      case 'info':
      default:
        return Info;
    }
  };

  const getNotificationClasses = (type) => {
    const baseClasses = "flex items-start gap-3 p-4 rounded-lg shadow-lg border backdrop-blur-sm transition-all duration-300";
    
    switch (type) {
      case 'success':
        return `${baseClasses} bg-green-50 border-green-200 text-green-800`;
      case 'error':
        return `${baseClasses} bg-red-50 border-red-200 text-red-800`;
      case 'warning':
        return `${baseClasses} bg-yellow-50 border-yellow-200 text-yellow-800`;
      case 'info':
      default:
        return `${baseClasses} bg-blue-50 border-blue-200 text-blue-800`;
    }
  };

  const getIconClasses = (type) => {
    const baseClasses = "w-5 h-5 flex-shrink-0 mt-0.5";
    
    switch (type) {
      case 'success':
        return `${baseClasses} text-green-600`;
      case 'error':
        return `${baseClasses} text-red-600`;
      case 'warning':
        return `${baseClasses} text-yellow-600`;
      case 'info':
      default:
        return `${baseClasses} text-blue-600`;
    }
  };

  if (ui.notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 max-w-sm">
      {ui.notifications.map((notification) => {
        const Icon = getNotificationIcon(notification.type);
        
        return (
          <div
            key={notification.id}
            className={`${getNotificationClasses(notification.type)} fade-in`}
          >
            <Icon className={getIconClasses(notification.type)} />
            
            <div className="flex-1 min-w-0">
              {notification.title && (
                <div className="font-semibold text-sm mb-1">{notification.title}</div>
              )}
              <div className="text-sm leading-relaxed">{notification.message}</div>
            </div>
            
            <button
              className="flex-shrink-0 p-1 hover:bg-black/10 rounded transition-colors"
              onClick={() => ui.removeNotification(notification.id)}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default Notifications;