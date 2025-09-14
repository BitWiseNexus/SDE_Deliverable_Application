import React from 'react';
import { Loader2 } from 'lucide-react';

const LoadingSpinner = ({ message = 'Loading...', size = 'medium', className = '' }) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8', 
    large: 'w-12 h-12'
  };

  const containerSizeClasses = {
    small: 'gap-2 text-sm',
    medium: 'gap-3 text-base',
    large: 'gap-4 text-lg'
  };

  return (
    <div className={`flex flex-col items-center justify-center ${containerSizeClasses[size]} ${className}`}>
      <Loader2 className={`${sizeClasses[size]} animate-spin text-blue-600`} />
      {message && <span className="text-gray-600 font-medium">{message}</span>}
    </div>
  );
};

export default LoadingSpinner;