import React from 'react';

const StatCard = ({ title, value, icon: Icon, color = 'blue', subtitle, trend, onClick }) => {
  const accentColors = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    orange: 'text-orange-600',
    purple: 'text-purple-600',
    red: 'text-red-600'
  };

  const trendColors = {
    up: 'text-green-600 bg-green-50 border-green-200',
    down: 'text-red-600 bg-red-50 border-red-200',
    neutral: 'text-slate-600 bg-slate-50 border-slate-200'
  };

  return (
    <div
      className={`relative p-5 rounded-xl border border-slate-200 bg-white/70 backdrop-blur-sm transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:shadow-sm hover:-translate-y-0.5' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center ${accentColors[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        {trend && (
          <div className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${trendColors[trend.direction]}`}>
            {trend.value} {trend.label}
          </div>
        )}
      </div>
      <div className="space-y-1">
        <div className="text-2xl font-semibold tracking-tight text-slate-900">{value}</div>
        <div className="text-sm font-medium text-slate-600 uppercase tracking-wide">{title}</div>
        {subtitle && <div className="text-xs text-slate-500">{subtitle}</div>}
      </div>
    </div>
  );
};

export default StatCard;