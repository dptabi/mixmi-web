import React, { useState } from 'react';
import './TopBar.css';

interface TopBarProps {
  title: string;
  subtitle?: string;
  searchPlaceholder?: string;
  onSearch?: (term: string) => void;
  actions?: React.ReactNode;
}

export default function TopBar({ 
  title, 
  subtitle, 
  searchPlaceholder = 'Search...', 
  onSearch,
  actions 
}: TopBarProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    if (onSearch) {
      onSearch(value);
    }
  };

  return (
    <div className="topbar">
      <div className="topbar-left">
        <div className="topbar-title-section">
          <h1 className="topbar-title">{title}</h1>
          {subtitle && <p className="topbar-subtitle">{subtitle}</p>}
        </div>
      </div>

      <div className="topbar-right">
        {onSearch && (
          <div className="topbar-search">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="search-input"
            />
          </div>
        )}
        
        {actions && (
          <div className="topbar-actions">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

