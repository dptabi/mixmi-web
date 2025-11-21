import React from 'react';
import './StatusBadge.css';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface StatusBadgeProps {
  status: string;
  variant?: BadgeVariant;
  icon?: string;
  className?: string;
}

export default function StatusBadge({ status, variant = 'neutral', icon, className = '' }: StatusBadgeProps) {
  return (
    <span className={`status-badge status-badge-${variant} ${className}`}>
      {icon && <span className="status-badge-icon">{icon}</span>}
      <span className="status-badge-text">{status}</span>
    </span>
  );
}

// Helper function to get badge variant based on user status
export function getUserStatusVariant(status: string): BadgeVariant {
  switch (status.toLowerCase()) {
    case 'active':
      return 'success';
    case 'suspended':
      return 'warning';
    case 'banned':
      return 'danger';
    default:
      return 'neutral';
  }
}

// Helper function to get badge variant based on role
export function getRoleVariant(role: string): BadgeVariant {
  switch (role.toLowerCase()) {
    case 'superadmin':
      return 'danger';
    case 'admin':
      return 'warning';
    case 'user':
      return 'info';
    default:
      return 'neutral';
  }
}

