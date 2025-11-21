import React, { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import Avatar from '../components/Avatar';
import StatusBadge, { getUserStatusVariant, getRoleVariant } from '../components/StatusBadge';
import DataTable, { Column } from '../components/DataTable';
import Modal from '../components/Modal';
import StatCard from '../components/StatCard';
import TopBar from '../components/TopBar';
import {
  User,
  fetchUsers,
  subscribeToUsers,
  updateUserRole,
  updateUserStatus,
  getUserOrders,
  calculateUserStats,
  exportUsersToCSV,
  downloadCSV,
} from '../services/userService';
import './Users.css';

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'suspended' | 'banned' | 'admins'>('all');
  
  // Modal states
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [showEditRole, setShowEditRole] = useState(false);
  const [showStatusChange, setShowStatusChange] = useState(false);
  
  // Form states
  const [newRole, setNewRole] = useState<'user' | 'admin' | 'superadmin'>('user');
  const [newStatus, setNewStatus] = useState<'active' | 'suspended' | 'banned'>('active');
  const [statusReason, setStatusReason] = useState('');
  const [userOrders, setUserOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const filterUsers = React.useCallback(() => {
    let filtered = [...users];

    // Apply status filter
    if (filter === 'active') {
      filtered = filtered.filter(u => u.status === 'active');
    } else if (filter === 'suspended') {
      filtered = filtered.filter(u => u.status === 'suspended');
    } else if (filter === 'banned') {
      filtered = filtered.filter(u => u.status === 'banned');
    } else if (filter === 'admins') {
      filtered = filtered.filter(u => u.role === 'admin' || u.role === 'superadmin');
    }

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(u =>
        u.email.toLowerCase().includes(term) ||
        (u.displayName && u.displayName.toLowerCase().includes(term)) ||
        u.uid.toLowerCase().includes(term)
      );
    }

    setFilteredUsers(filtered);
  }, [users, searchTerm, filter]);

  useEffect(() => {
    loadUsers();
    
    // Subscribe to real-time updates
    const unsubscribe = subscribeToUsers((updatedUsers) => {
      setUsers(updatedUsers);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [filterUsers]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const fetchedUsers = await fetchUsers();
      setUsers(fetchedUsers);
    } catch (error) {
      console.error('Error loading users:', error);
      alert('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleUserClick = async (user: User) => {
    setSelectedUser(user);
    setShowUserDetails(true);
    setLoadingOrders(true);
    
    try {
      const orders = await getUserOrders(user.email);
      setUserOrders(orders);
    } catch (error) {
      console.error('Error loading user orders:', error);
      setUserOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleEditRole = (user: User) => {
    setSelectedUser(user);
    setNewRole(user.role);
    setShowEditRole(true);
  };

  const handleChangeStatus = (user: User) => {
    setSelectedUser(user);
    setNewStatus(user.status);
    setStatusReason('');
    setShowStatusChange(true);
  };

  const handleSaveRole = async () => {
    if (!selectedUser) return;

    try {
      await updateUserRole(selectedUser.uid, newRole);
      alert('✅ User role updated successfully!');
      setShowEditRole(false);
      setSelectedUser(null);
      loadUsers();
    } catch (error) {
      console.error('Error updating role:', error);
      alert('❌ Failed to update user role');
    }
  };

  const handleSaveStatus = async () => {
    if (!selectedUser) return;

    if ((newStatus === 'suspended' || newStatus === 'banned') && !statusReason.trim()) {
      alert('Please provide a reason for this action');
      return;
    }

    try {
      await updateUserStatus(selectedUser.uid, newStatus, statusReason);
      alert('✅ User status updated successfully!');
      setShowStatusChange(false);
      setSelectedUser(null);
      setStatusReason('');
      loadUsers();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('❌ Failed to update user status');
    }
  };

  const handleExportCSV = () => {
    const csvContent = exportUsersToCSV(filteredUsers);
    downloadCSV(csvContent, `users-export-${new Date().toISOString().split('T')[0]}.csv`);
  };

  const stats = calculateUserStats(users);

  const columns: Column<User>[] = [
    {
      key: 'user',
      title: 'User',
      width: '250px',
      render: (user) => (
        <div className="user-cell">
          <Avatar name={user.displayName || user.email} photoURL={user.photoURL} size="small" />
          <div className="user-info">
            <div className="user-name">{user.displayName || 'Unknown'}</div>
            <div className="user-email">{user.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      title: 'Role',
      width: '120px',
      sortable: true,
      render: (user) => (
        <StatusBadge 
          status={user.role.charAt(0).toUpperCase() + user.role.slice(1)} 
          variant={getRoleVariant(user.role)}
        />
      ),
    },
    {
      key: 'status',
      title: 'Status',
      width: '120px',
      sortable: true,
      render: (user) => (
        <StatusBadge 
          status={user.status.charAt(0).toUpperCase() + user.status.slice(1)} 
          variant={getUserStatusVariant(user.status)}
          icon={user.status === 'active' ? '✅' : user.status === 'suspended' ? '⏸️' : '🚫'}
        />
      ),
    },
    {
      key: 'createdAt',
      title: 'Join Date',
      width: '150px',
      sortable: true,
      render: (user) => (
        <div className="date-cell">
          <div>{new Date(user.createdAt).toLocaleDateString()}</div>
          <div className="date-relative">{formatDistanceToNow(user.createdAt, { addSuffix: true })}</div>
        </div>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      width: '200px',
      render: (user) => (
        <div className="action-buttons">
          <button className="btn-small btn-primary" onClick={(e) => { e.stopPropagation(); handleUserClick(user); }}>
            👁️ View
          </button>
          <button className="btn-small btn-secondary" onClick={(e) => { e.stopPropagation(); handleEditRole(user); }}>
            👤 Role
          </button>
          <button className="btn-small btn-warning" onClick={(e) => { e.stopPropagation(); handleChangeStatus(user); }}>
            🔒 Status
          </button>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="users-container">
        <div className="loading-state">
          <div className="spinner-large"></div>
          <p>Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="users-container">
      <TopBar 
        title="User Management"
        subtitle={`${filteredUsers.length} users ${filter !== 'all' ? `(${filter})` : ''}`}
        searchPlaceholder="Search by name, email, or ID..."
        onSearch={setSearchTerm}
        actions={
          <>
            <button className="btn-outline" onClick={loadUsers}>
              🔄 Refresh
            </button>
            <button className="btn-primary" onClick={handleExportCSV}>
              📥 Export CSV
            </button>
          </>
        }
      />

      {/* Statistics Cards */}
      <div className="users-stats">
        <StatCard
          title="Total Users"
          value={stats.totalUsers}
          icon="👥"
          color="#3B82F6"
          trend={{ value: `${stats.newToday} today`, isPositive: true }}
        />
        <StatCard
          title="Active Users"
          value={stats.activeUsers}
          icon="✅"
          color="#10B981"
          subtitle="Currently active"
        />
        <StatCard
          title="Suspended"
          value={stats.suspendedUsers}
          icon="⏸️"
          color="#F59E0B"
          subtitle="Temporarily suspended"
        />
        <StatCard
          title="Banned"
          value={stats.bannedUsers}
          icon="🚫"
          color="#EF4444"
          subtitle="Permanently banned"
        />
        <StatCard
          title="Administrators"
          value={stats.admins}
          icon="👑"
          color="#8B5CF6"
          subtitle="Admin & Super Admin"
        />
        <StatCard
          title="New Today"
          value={stats.newToday}
          icon="🆕"
          color="#EC4899"
          subtitle="Registered in last 24h"
        />
      </div>

      {/* Filter Buttons */}
      <div className="users-filters">
        <button 
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          📋 All Users ({users.length})
        </button>
        <button 
          className={`filter-btn ${filter === 'active' ? 'active' : ''}`}
          onClick={() => setFilter('active')}
        >
          ✅ Active ({stats.activeUsers})
        </button>
        <button 
          className={`filter-btn ${filter === 'suspended' ? 'active' : ''}`}
          onClick={() => setFilter('suspended')}
        >
          ⏸️ Suspended ({stats.suspendedUsers})
        </button>
        <button 
          className={`filter-btn ${filter === 'banned' ? 'active' : ''}`}
          onClick={() => setFilter('banned')}
        >
          🚫 Banned ({stats.bannedUsers})
        </button>
        <button 
          className={`filter-btn ${filter === 'admins' ? 'active' : ''}`}
          onClick={() => setFilter('admins')}
        >
          👑 Admins ({stats.admins})
        </button>
      </div>

      {/* Users Table */}
      <DataTable
        columns={columns}
        data={filteredUsers}
        keyField="uid"
        onRowClick={handleUserClick}
        emptyMessage={searchTerm ? 'No users match your search' : 'No users found'}
      />

      {/* User Details Modal */}
      <Modal
        isOpen={showUserDetails}
        onClose={() => setShowUserDetails(false)}
        title={`User Details - ${selectedUser?.displayName || selectedUser?.email}`}
        size="large"
        footer={
          <button className="btn-secondary" onClick={() => setShowUserDetails(false)}>
            Close
          </button>
        }
      >
        {selectedUser && (
          <div className="user-details">
            <div className="user-details-header">
              <Avatar 
                name={selectedUser.displayName || selectedUser.email} 
                photoURL={selectedUser.photoURL}
                size="large"
              />
              <div className="user-details-info">
                <h3>{selectedUser.displayName || 'Unknown'}</h3>
                <p>{selectedUser.email}</p>
                <div className="user-details-badges">
                  <StatusBadge 
                    status={selectedUser.role.charAt(0).toUpperCase() + selectedUser.role.slice(1)} 
                    variant={getRoleVariant(selectedUser.role)}
                  />
                  <StatusBadge 
                    status={selectedUser.status.charAt(0).toUpperCase() + selectedUser.status.slice(1)} 
                    variant={getUserStatusVariant(selectedUser.status)}
                  />
                </div>
              </div>
            </div>

            <div className="user-details-grid">
              <div className="detail-item">
                <strong>User ID:</strong>
                <span>{selectedUser.uid}</span>
              </div>
              <div className="detail-item">
                <strong>Phone:</strong>
                <span>{selectedUser.phoneNumber || 'N/A'}</span>
              </div>
              <div className="detail-item">
                <strong>Join Date:</strong>
                <span>{new Date(selectedUser.createdAt).toLocaleString()}</span>
              </div>
              <div className="detail-item">
                <strong>Last Login:</strong>
                <span>{selectedUser.lastLoginAt ? new Date(selectedUser.lastLoginAt).toLocaleString() : 'Never'}</span>
              </div>
              {selectedUser.address && (
                <div className="detail-item full-width">
                  <strong>Address:</strong>
                  <span>{selectedUser.address}</span>
                </div>
              )}
              {selectedUser.suspendedReason && (
                <div className="detail-item full-width">
                  <strong>Suspended Reason:</strong>
                  <span className="reason-text">{selectedUser.suspendedReason}</span>
                </div>
              )}
              {selectedUser.bannedReason && (
                <div className="detail-item full-width">
                  <strong>Banned Reason:</strong>
                  <span className="reason-text">{selectedUser.bannedReason}</span>
                </div>
              )}
            </div>

            <div className="user-orders-section">
              <h4>📦 Order History</h4>
              {loadingOrders ? (
                <div className="loading-orders">Loading orders...</div>
              ) : userOrders.length > 0 ? (
                <div className="orders-list">
                  {userOrders.map((order) => (
                    <div key={order.id} className="order-item">
                      <div className="order-info">
                        <strong>{order.orderNumber}</strong>
                        <span className="order-date">
                          {order.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                      <div className="order-details">
                        <span className="order-total">₱{order.total?.toFixed(2) || '0.00'}</span>
                        <span className={`order-status status-${order.orderStatus}`}>
                          {order.orderStatus}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-orders">No orders found</p>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Role Modal */}
      <Modal
        isOpen={showEditRole}
        onClose={() => setShowEditRole(false)}
        title={`Edit Role - ${selectedUser?.email}`}
        size="small"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setShowEditRole(false)}>
              Cancel
            </button>
            <button className="btn-primary" onClick={handleSaveRole}>
              Save Changes
            </button>
          </>
        }
      >
        <div className="edit-role-form">
          <div className="form-group">
            <label>Select Role:</label>
            <select 
              value={newRole} 
              onChange={(e) => setNewRole(e.target.value as any)}
              className="form-select"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
              <option value="superadmin">Super Admin</option>
            </select>
          </div>
          <div className="form-help">
            <p><strong>User:</strong> Regular user with basic permissions</p>
            <p><strong>Admin:</strong> Can manage orders and view analytics</p>
            <p><strong>Super Admin:</strong> Full access to all features</p>
          </div>
        </div>
      </Modal>

      {/* Change Status Modal */}
      <Modal
        isOpen={showStatusChange}
        onClose={() => setShowStatusChange(false)}
        title={`Change Status - ${selectedUser?.email}`}
        size="medium"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setShowStatusChange(false)}>
              Cancel
            </button>
            <button className="btn-primary" onClick={handleSaveStatus}>
              Update Status
            </button>
          </>
        }
      >
        <div className="change-status-form">
          <div className="form-group">
            <label>Select Status:</label>
            <select 
              value={newStatus} 
              onChange={(e) => setNewStatus(e.target.value as any)}
              className="form-select"
            >
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="banned">Banned</option>
            </select>
          </div>
          
          {(newStatus === 'suspended' || newStatus === 'banned') && (
            <div className="form-group">
              <label>Reason (required):</label>
              <textarea
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                className="form-textarea"
                rows={4}
                placeholder="Please provide a reason for this action..."
                required
              />
            </div>
          )}

          <div className="form-help">
            <p><strong>Active:</strong> User can access all features normally</p>
            <p><strong>Suspended:</strong> Temporarily restrict user access</p>
            <p><strong>Banned:</strong> Permanently block user from platform</p>
          </div>
        </div>
      </Modal>
    </div>
  );
}

