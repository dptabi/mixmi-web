import React from 'react';
import Avatar from './Avatar';
import './Sidebar.css';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  user: {
    email: string | null;
    displayName?: string | null;
    photoURL?: string | null;
  };
  onLogout: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon: string;
}

const menuItems: MenuItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'orders', label: 'Orders', icon: '📦' },
  { id: 'users', label: 'Users', icon: '👥' },
  { id: 'analytics', label: 'Analytics', icon: '📈' },
];

export default function Sidebar({ 
  activeTab, 
  onTabChange, 
  user, 
  onLogout,
  isCollapsed,
  onToggleCollapse 
}: SidebarProps) {
  const userName = user.displayName || user.email?.split('@')[0] || 'Admin';

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-content">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <span className="logo-icon">🎨</span>
            {!isCollapsed && <span className="logo-text">Mixmi Admin</span>}
          </div>
          <button 
            className="sidebar-toggle"
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? '→' : '←'}
          </button>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <button
              key={item.id}
              className={`sidebar-nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => onTabChange(item.id)}
              title={isCollapsed ? item.label : undefined}
            >
              <span className="nav-item-icon">{item.icon}</span>
              {!isCollapsed && <span className="nav-item-label">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <Avatar 
              name={userName} 
              photoURL={user.photoURL || undefined}
              size="medium"
            />
            {!isCollapsed && (
              <div className="sidebar-user-info">
                <p className="sidebar-user-name">{userName}</p>
                <p className="sidebar-user-email">{user.email}</p>
              </div>
            )}
          </div>
          {!isCollapsed && (
            <button className="sidebar-logout" onClick={onLogout}>
              <span className="logout-icon">🚪</span>
              <span>Logout</span>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}

