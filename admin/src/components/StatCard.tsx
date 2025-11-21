import React from 'react';
import './StatCard.css';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: string;
  subtitle?: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  color?: string;
  className?: string;
}

export default function StatCard({ 
  title, 
  value, 
  icon, 
  subtitle, 
  trend,
  color = '#3B82F6',
  className = '' 
}: StatCardProps) {
  return (
    <div className={`stat-card ${className}`}>
      <div className="stat-card-header">
        <div className="stat-card-icon" style={{ backgroundColor: `${color}20`, color }}>
          {icon}
        </div>
        {trend && (
          <span className={`stat-card-trend ${trend.isPositive ? 'positive' : 'negative'}`}>
            {trend.isPositive ? '↑' : '↓'} {trend.value}
          </span>
        )}
      </div>
      <div className="stat-card-content">
        <h3 className="stat-card-value">{value}</h3>
        <p className="stat-card-title">{title}</p>
        {subtitle && <p className="stat-card-subtitle">{subtitle}</p>}
      </div>
    </div>
  );
}

