import React from 'react';

const StatCard = ({ title, value, icon: Icon, color = 'blue', subtitle, trend, onClick }) => {
  const colorClasses = {
    blue: 'stat-card-blue',
    green: 'stat-card-green', 
    orange: 'stat-card-orange',
    purple: 'stat-card-purple',
    red: 'stat-card-red'
  };

  return (
    <div 
      className={`stat-card ${colorClasses[color]} ${onClick ? 'clickable' : ''}`}
      onClick={onClick}
    >
      <div className="stat-card-header">
        <div className="stat-card-icon">
          <Icon className="icon" />
        </div>
        {trend && (
          <div className={`stat-trend ${trend.direction}`}>
            <span className="trend-value">{trend.value}</span>
            <span className="trend-label">{trend.label}</span>
          </div>
        )}
      </div>
      
      <div className="stat-card-content">
        <div className="stat-value">{value}</div>
        <div className="stat-title">{title}</div>
        {subtitle && <div className="stat-subtitle">{subtitle}</div>}
      </div>
    </div>
  );
};

export default StatCard;