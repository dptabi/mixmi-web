import React from 'react';
import './Avatar.css';

interface AvatarProps {
  name: string;
  photoURL?: string;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export default function Avatar({ name, photoURL, size = 'medium', className = '' }: AvatarProps) {
  const getInitials = (name: string): string => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const getColorFromName = (name: string): string => {
    const colors = [
      '#3B82F6', // blue
      '#10B981', // green
      '#F59E0B', // amber
      '#EF4444', // red
      '#8B5CF6', // purple
      '#EC4899', // pink
      '#06B6D4', // cyan
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <div className={`avatar avatar-${size} ${className}`}>
      {photoURL ? (
        <img src={photoURL} alt={name} className="avatar-image" />
      ) : (
        <div 
          className="avatar-initials" 
          style={{ backgroundColor: getColorFromName(name) }}
        >
          {getInitials(name)}
        </div>
      )}
    </div>
  );
}

