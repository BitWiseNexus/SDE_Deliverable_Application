import React from 'react';

const StatCard = ({ title, value, icon: Icon, color = 'blue', subtitle, trend, onClick }) => {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-900',
    green: 'bg-green-50 border-green-200 text-green-900',
    orange: 'bg-orange-50 border-orange-200 text-orange-900',
    purple: 'bg-purple-50 border-purple-200 text-purple-900',
    red: 'bg-red-50 border-red-200 text-red-900'
  };

  const iconColorClasses = {
    blue: 'text-blue-600 bg-blue-100',
    green: 'text-green-600 bg-green-100',
    orange: 'text-orange-600 bg-orange-100',
    purple: 'text-purple-600 bg-purple-100',
    red: 'text-red-600 bg-red-100'
  };

  const trendColorClasses = {
    up: 'text-green-600 bg-green-100',
    down: 'text-red-600 bg-red-100',
    neutral: 'text-gray-600 bg-gray-100'
  };

  return (
    <div 
      className={`relative p-6 rounded-xl border transition-all duration-200 ${colorClasses[color]} ${
        onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-1' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${iconColorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
        
        {trend && (
          <div className={`px-3 py-1 rounded-full text-xs font-semibold ${trendColorClasses[trend.direction]}`}>
            {trend.value} {trend.label}
          </div>
        )}
      </div>
      
      <div className="space-y-1">
        <div className="text-3xl font-bold">{value}</div>
        <div className="font-semibold text-lg">{title}</div>
        {subtitle && <div className="text-sm opacity-75">{subtitle}</div>}
      </div>
    </div>
  );
};

export default StatCard;