import React, { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import Avatar from '../components/Avatar';
import StatusBadge, { getUserStatusVariant, getRoleVariant } from '../components/StatusBadge';
import { Column } from '../components/DataTable';
import Modal from '../components/Modal';
import TopBar from '../components/TopBar';
import { useAuth } from '../hooks/useAuth';
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
  const { user: currentUser, refreshToken } = useAuth();
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
  const [newRole, setNewRole] = useState<'buyer' | 'creator' | 'admin' | 'superadmin'>('buyer');
  const [newStatus, setNewStatus] = useState<'active' | 'suspended' | 'banned'>('active');
  const [statusReason, setStatusReason] = useState('');
  const [userOrders, setUserOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    let unsubscribe: (() => void) | null = null;
    let isMounted = true;

    // Load users first, then set up real-time subscription
    // The subscribeToUsers function now handles token refresh internally
    const initializeUsers = async () => {
      try {
        // First, try to load users with token refresh
        if (isMounted) {
          await loadUsers(false);
        }

        // Then set up real-time subscription (which also refreshes token)
        // This ensures we have a valid token before subscribing
        if (isMounted) {
          unsubscribe = subscribeToUsers((updatedUsers) => {
            if (isMounted) {
              setUsers(updatedUsers);
              setLoading(false);
              setError(null); // Clear any previous errors on successful update
            }
          });
        }
      } catch (err) {
        console.error('Error initializing users:', err);
        // Error is already handled in loadUsers
      }
    };

    initializeUsers();

    return () => {
      isMounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    filterUsers();
  }, [filterUsers]);

  const loadUsers = async (forceTokenRefresh: boolean = false) => {
    setLoading(true);
    setError(null); // Clear previous errors
    try {
      // If forcing token refresh, refresh the token first
      if (forceTokenRefresh) {
        console.log('🔄 Refreshing token before fetching users...');
        const refreshed = await refreshToken();
        if (refreshed) {
          console.log('✅ Token refreshed successfully, retrying fetch users...');
          // Wait a moment for the token to propagate
          await new Promise(resolve => setTimeout(resolve, 500));
        } else {
          console.warn('⚠️ Token refresh failed, continuing anyway...');
        }
      }

      const fetchedUsers = await fetchUsers();
      setUsers(fetchedUsers);
      setError(null); // Clear any previous errors on success
      if (fetchedUsers.length === 0) {
        console.warn('No users found. This could mean: 1) No users exist in the database, 2) Database rules not deployed, or 3) Permission issue');
      }
    } catch (error: any) {
      console.error('❌ Error loading users:', error);
      const errorMessage = error?.message || 'Failed to load users';

      // Set error state for UI display
      setError(errorMessage);

      let detailedMessage = errorMessage;
      if (errorMessage?.toLowerCase().includes('permission denied') || error?.code === 'PERMISSION_DENIED') {
        if (!errorMessage?.includes('firebase deploy')) {
          const grantEmail = currentUser?.email || 'hey@mixmi.co';
          detailedMessage = `❌ PERMISSION DENIED\n\nYour token doesn't have admin/superadmin claims.\n\n🔧 TO FIX:\n1. Run: ./scripts/grant-superadmin.sh ${grantEmail}\n2. Sign out, then sign back in.`;
        }
      }
      alert(`Error: ${detailedMessage}`);
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

    // Only superadmins can change roles to admin or superadmin
    const isSuperAdmin = currentUser?.role === 'superadmin';
    if ((newRole === 'admin' || newRole === 'superadmin') && !isSuperAdmin) {
      alert('❌ Only superadmins can assign admin or superadmin roles.');
      return;
    }

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
          <button className="btn-small btn-action" onClick={(e) => { e.stopPropagation(); handleUserClick(user); }}>
            👁️ View
          </button>
          <button className="btn-small btn-action" onClick={(e) => { e.stopPropagation(); handleEditRole(user); }}>
            👤 Role
          </button>
          <button className="btn-small btn-action" onClick={(e) => { e.stopPropagation(); handleChangeStatus(user); }}>
            🔒 Status
          </button>
        </div>
      ),
    },
  ];

  if (loading && users.length === 0) {
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
        actions={
          <>
            <button className="btn-outline" onClick={() => loadUsers(true)} title="Refresh token and retry">
              🔑 Refresh Token & Retry
            </button>
            <button className="btn-primary" onClick={handleExportCSV}>
              📥 Export CSV
            </button>
          </>
        }
      />

      {/* Error Display */}
      {error && (
        <div className="error-banner" style={{
          padding: '16px',
          margin: '16px 0',
          backgroundColor: '#FEE2E2',
          border: '1px solid #FCA5A5',
          borderRadius: '8px',
          color: '#991B1B'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span>❌</span>
            <strong>Error Loading Users</strong>
          </div>
          <div style={{ fontSize: '14px', whiteSpace: 'pre-wrap' }}>{error}</div>
          <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
            <button
              className="btn-small btn-primary"
              onClick={() => loadUsers(false)}
              style={{ fontSize: '12px' }}
            >
              🔄 Retry
            </button>
            <button
              className="btn-small btn-secondary"
              onClick={() => loadUsers(true)}
              style={{ fontSize: '12px' }}
            >
              🔑 Refresh Token & Retry
            </button>
          </div>
        </div>
      )}

      {/* Search and Filter Toolbar */}
      <div className="users-toolbar">
        <input
          type="text"
          placeholder="Search by name, email, or ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <div className="filter-buttons">
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
            🔥 Admins ({stats.admins})
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="users-table-body">
        {filteredUsers.length === 0 ? (
          <div className="users-table-empty">
            <p>{searchTerm ? 'No users match your search' : 'No users found'}</p>
          </div>
        ) : (
          <table className="users-table">
            <thead>
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    style={{ width: column.width }}
                  >
                    {column.title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr
                  key={user.uid}
                  onClick={() => handleUserClick(user)}
                  className="clickable"
                >
                  {columns.map((column) => (
                    <td key={column.key} style={{ width: column.width }}>
                      {column.render ? column.render(user) : (user as any)[column.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

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
              <option value="buyer">Buyer</option>
              <option value="creator">Creator</option>
              <option value="admin" disabled={currentUser?.role !== 'superadmin'}>
                Admin {currentUser?.role !== 'superadmin' && '(Superadmin only)'}
              </option>
              <option value="superadmin" disabled={currentUser?.role !== 'superadmin'}>
                Super Admin {currentUser?.role !== 'superadmin' && '(Superadmin only)'}
              </option>
            </select>
          </div>
          <div className="form-help">
            <p><strong>Buyer:</strong> Regular buyer with basic permissions</p>
            <p><strong>Creator:</strong> Creator account type with specialized permissions</p>
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

