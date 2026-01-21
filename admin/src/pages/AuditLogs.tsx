import React, { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import DataTable, { Column } from '../components/DataTable';
import Modal from '../components/Modal';
import TopBar from '../components/TopBar';
import {
  AuditLog,
  fetchAuditLogs,
  createAuditLog,
  updateAuditLog,
  deleteAuditLog,
  exportAuditLogsToCSV,
} from '../services/auditLogService';
import { useAuth } from '../hooks/useAuth';
import './AuditLogs.css';

export default function AuditLogs() {
  const { user, refreshToken } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'create' | 'update' | 'delete' | 'read'>('all');

  // Modal states
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [showLogDetails, setShowLogDetails] = useState(false);
  const [showEditLog, setShowEditLog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Form states
  const [editAction, setEditAction] = useState('');
  const [editUserEmail, setEditUserEmail] = useState('');
  const [editResourceType, setEditResourceType] = useState('');
  const [editResourceId, setEditResourceId] = useState('');
  const [editDetails, setEditDetails] = useState('');

  const loadLogs = React.useCallback(async () => {
    try {
      setLoading(true);
      console.log('Loading audit logs...');
      
      // Refresh token to ensure we have latest claims
      if (user) {
        console.log('Refreshing authentication token...');
        await refreshToken();
        console.log('Current user:', {
          email: user.email,
          uid: user.uid,
          role: (user as any).role,
          isAdmin: (user as any).isAdmin
        });
      }
      
      const result = await fetchAuditLogs(100);
      console.log('Fetched audit logs:', result.logs.length, result.logs);
      setLogs(result.logs);
      setFilteredLogs(result.logs);

      if (result.logs.length === 0) {
        console.warn('No audit logs found. This could mean:');
        console.warn('1. The collection is empty (no logs have been created yet)');
        console.warn('2. Permission denied (check Firestore rules and token claims)');
        console.warn('3. Query failed (check browser console for errors)');
        console.warn('Try clicking "Create Test Log" to verify write permissions');
      }
    } catch (error: any) {
      console.error('Error loading audit logs:', error);
      console.error('Error details:', {
        code: error?.code,
        message: error?.message,
        stack: error?.stack
      });
      
      // Show user-friendly error message
      const errorMessage = error?.message || 'Unknown error';
      if (errorMessage.includes('permission') || errorMessage.includes('Permission')) {
        alert(`❌ Permission Denied: ${errorMessage}\n\nPlease ensure:\n1. Your account has admin/superadmin role\n2. Your token has been refreshed\n3. Firestore rules allow admin access`);
      } else {
        alert(`Failed to load audit logs: ${errorMessage}. Check browser console for details.`);
      }
    } finally {
      setLoading(false);
    }
  }, [user, refreshToken]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const filterLogs = React.useCallback(() => {
    let filtered = [...logs];

    // Apply action filter
    if (filter !== 'all') {
      filtered = filtered.filter((log) => log.action.toLowerCase() === filter.toLowerCase());
    }

    // Apply search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (log) =>
          log.action.toLowerCase().includes(term) ||
          log.userEmail?.toLowerCase().includes(term) ||
          log.resourceType?.toLowerCase().includes(term) ||
          log.resourceId?.toLowerCase().includes(term) ||
          log.ipAddress?.toLowerCase().includes(term) ||
          JSON.stringify(log.details || {}).toLowerCase().includes(term)
      );
    }

    setFilteredLogs(filtered);
  }, [logs, filter, searchTerm]);

  useEffect(() => {
    filterLogs();
  }, [filterLogs]);

  const handleViewDetails = (log: AuditLog) => {
    setSelectedLog(log);
    setShowLogDetails(true);
  };

  const handleEdit = (log: AuditLog) => {
    setSelectedLog(log);
    setEditAction(log.action);
    setEditUserEmail(log.userEmail || '');
    setEditResourceType(log.resourceType || '');
    setEditResourceId(log.resourceId || '');
    setEditDetails(JSON.stringify(log.details || {}, null, 2));
    setShowEditLog(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedLog) return;

    try {
      const updates: Partial<AuditLog> = {
        action: editAction,
        userEmail: editUserEmail || undefined,
        resourceType: editResourceType || undefined,
        resourceId: editResourceId || undefined,
        details: editDetails ? JSON.parse(editDetails) : undefined,
      };

      await updateAuditLog(selectedLog.id, updates);
      alert('✅ Audit log updated successfully!');
      setShowEditLog(false);
      setSelectedLog(null);
      loadLogs();
    } catch (error: any) {
      console.error('Error updating audit log:', error);
      if (error.message.includes('JSON')) {
        alert('❌ Invalid JSON in details field');
      } else {
        alert('❌ Failed to update audit log');
      }
    }
  };

  const handleDelete = (log: AuditLog) => {
    setSelectedLog(log);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedLog) return;

    try {
      await deleteAuditLog(selectedLog.id);
      alert('✅ Audit log deleted successfully!');
      setShowDeleteConfirm(false);
      setSelectedLog(null);
      loadLogs();
    } catch (error) {
      console.error('Error deleting audit log:', error);
      alert('❌ Failed to delete audit log');
    }
  };

  const handleExport = () => {
    try {
      const csv = exportAuditLogsToCSV(filteredLogs);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `audit-logs-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      alert('✅ Audit logs exported successfully!');
    } catch (error) {
      console.error('Error exporting audit logs:', error);
      alert('❌ Failed to export audit logs');
    }
  };

  const handleCreateTestLog = async () => {
    try {
      // Refresh token first to ensure we have latest claims
      if (user) {
        await refreshToken();
      }
      
      console.log('Creating test audit log...');
      const logId = await createAuditLog({
        action: 'test',
        resourceType: 'audit_log',
        resourceId: 'test',
        details: { message: 'Test audit log created from admin panel' },
        metadata: { source: 'admin_panel', test: true },
      });
      console.log('Test audit log created with ID:', logId);
      alert('✅ Test audit log created successfully! Refreshing list...');
      // Wait a moment for Firestore to sync, then reload
      setTimeout(() => {
        loadLogs();
      }, 1000);
    } catch (error: any) {
      console.error('Error creating test audit log:', error);
      const errorMessage = error?.message || 'Unknown error';
      if (errorMessage.includes('permission') || errorMessage.includes('Permission')) {
        alert(`❌ Permission Denied: ${errorMessage}\n\nYou may need to:\n1. Ensure your account has admin/superadmin role\n2. Sign out and sign back in\n3. Check Firestore rules`);
      } else {
        alert(`❌ Failed to create test audit log: ${errorMessage}`);
      }
    }
  };

  const columns: Column<AuditLog>[] = [
    {
      key: 'action',
      title: 'Action',
      sortable: true,
    },
    {
      key: 'userEmail',
      title: 'User',
      sortable: true,
      render: (log) => log.userEmail || log.userId || 'N/A',
    },
    {
      key: 'resourceType',
      title: 'Resource',
      sortable: true,
      render: (log) => {
        const resource = log.resourceType || 'N/A';
        const resourceId = log.resourceId ? ` (${log.resourceId.substring(0, 20)}${log.resourceId.length > 20 ? '...' : ''})` : '';
        return `${resource}${resourceId}`;
      },
    },
    {
      key: 'ipAddress',
      title: 'IP Address',
      sortable: true,
      render: (log) => log.ipAddress || 'N/A',
    },
    {
      key: 'timestamp',
      title: 'Timestamp',
      sortable: true,
      render: (log) => (
        <span title={log.timestamp.toLocaleString()}>
          {formatDistanceToNow(log.timestamp, { addSuffix: true })}
        </span>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      width: '120px',
      render: (log) => (
        <div className="table-actions">
          <button
            className="action-btn edit-btn"
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(log);
            }}
            title="Edit"
          >
            ✏️
          </button>
          <button
            className="action-btn delete-btn"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(log);
            }}
            title="Delete"
          >
            🗑️
          </button>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="audit-logs-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading audit logs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="audit-logs-container">
      <TopBar
        title="Audit Logs"
        subtitle={`${filteredLogs.length} logs ${filter !== 'all' ? `(${filter})` : ''}`}
        actions={
          <>
            <button className="btn-outline" onClick={handleCreateTestLog}>
              ➕ Create Test Log
            </button>
            <button className="btn-primary" onClick={handleExport}>
              📥 Export CSV
            </button>
          </>
        }
      />

      <div className="audit-logs-toolbar">
        <input
          type="text"
          placeholder="Search logs by action, user, resource, IP..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />

        <div className="filter-buttons">
        <button
          onClick={() => setFilter('all')}
            className={filter === 'all' ? 'active' : ''}
        >
          📋 All ({logs.length})
        </button>
        <button
          onClick={() => setFilter('create')}
            className={filter === 'create' ? 'active' : ''}
        >
          ➕ Create ({logs.filter((l) => l.action.toLowerCase() === 'create').length})
        </button>
        <button
          onClick={() => setFilter('update')}
            className={filter === 'update' ? 'active' : ''}
        >
          ✏️ Update ({logs.filter((l) => l.action.toLowerCase() === 'update').length})
        </button>
        <button
          onClick={() => setFilter('delete')}
            className={filter === 'delete' ? 'active' : ''}
        >
          🗑️ Delete ({logs.filter((l) => l.action.toLowerCase() === 'delete').length})
        </button>
        <button
          onClick={() => setFilter('read')}
            className={filter === 'read' ? 'active' : ''}
        >
          👁️ Read ({logs.filter((l) => l.action.toLowerCase() === 'read').length})
        </button>
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        data={filteredLogs}
        columns={columns}
        keyField="id"
        onRowClick={handleViewDetails}
        emptyMessage={searchTerm ? 'No logs match your search' : 'No audit logs found'}
      />

      {/* Log Details Modal */}
      <Modal
        isOpen={showLogDetails}
        onClose={() => {
          setShowLogDetails(false);
          setSelectedLog(null);
        }}
        title="Audit Log Details"
      >
        {selectedLog && (
          <div className="log-details">
            <div className="detail-row">
              <strong>ID:</strong>
              <span>{selectedLog.id}</span>
            </div>
            <div className="detail-row">
              <strong>Action:</strong>
              <span>{selectedLog.action}</span>
            </div>
            <div className="detail-row">
              <strong>User:</strong>
              <span>{selectedLog.userEmail || selectedLog.userId || 'N/A'}</span>
            </div>
            <div className="detail-row">
              <strong>Resource Type:</strong>
              <span>{selectedLog.resourceType || 'N/A'}</span>
            </div>
            <div className="detail-row">
              <strong>Resource ID:</strong>
              <span>{selectedLog.resourceId || 'N/A'}</span>
            </div>
            <div className="detail-row">
              <strong>IP Address:</strong>
              <span>{selectedLog.ipAddress || 'N/A'}</span>
            </div>
            <div className="detail-row">
              <strong>User Agent:</strong>
              <span>{selectedLog.userAgent || 'N/A'}</span>
            </div>
            <div className="detail-row">
              <strong>Timestamp:</strong>
              <span>{selectedLog.timestamp.toLocaleString()}</span>
            </div>
            {selectedLog.details && (
              <div className="detail-row full-width">
                <strong>Details:</strong>
                <pre className="details-json">{JSON.stringify(selectedLog.details, null, 2)}</pre>
              </div>
            )}
            {selectedLog.metadata && (
              <div className="detail-row full-width">
                <strong>Metadata:</strong>
                <pre className="details-json">{JSON.stringify(selectedLog.metadata, null, 2)}</pre>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Edit Log Modal */}
      <Modal
        isOpen={showEditLog}
        onClose={() => {
          setShowEditLog(false);
          setSelectedLog(null);
        }}
        title="Edit Audit Log"
      >
        <div className="edit-log-form">
          <div className="form-group">
            <label>Action:</label>
            <input
              type="text"
              value={editAction}
              onChange={(e) => setEditAction(e.target.value)}
              className="form-input"
            />
          </div>
          <div className="form-group">
            <label>User Email:</label>
            <input
              type="email"
              value={editUserEmail}
              onChange={(e) => setEditUserEmail(e.target.value)}
              className="form-input"
            />
          </div>
          <div className="form-group">
            <label>Resource Type:</label>
            <input
              type="text"
              value={editResourceType}
              onChange={(e) => setEditResourceType(e.target.value)}
              className="form-input"
            />
          </div>
          <div className="form-group">
            <label>Resource ID:</label>
            <input
              type="text"
              value={editResourceId}
              onChange={(e) => setEditResourceId(e.target.value)}
              className="form-input"
            />
          </div>
          <div className="form-group">
            <label>Details (JSON):</label>
            <textarea
              value={editDetails}
              onChange={(e) => setEditDetails(e.target.value)}
              className="form-textarea"
              rows={6}
              placeholder='{"key": "value"}'
            />
          </div>
          <div className="form-actions">
            <button className="btn-secondary" onClick={() => setShowEditLog(false)}>
              Cancel
            </button>
            <button className="btn-primary" onClick={handleSaveEdit}>
              Save Changes
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setSelectedLog(null);
        }}
        title="Delete Audit Log"
      >
        <div className="delete-confirm">
          <p>Are you sure you want to delete this audit log?</p>
          {selectedLog && (
            <div className="delete-preview">
              <strong>Action:</strong> {selectedLog.action}
              <br />
              <strong>User:</strong> {selectedLog.userEmail || selectedLog.userId || 'N/A'}
              <br />
              <strong>Timestamp:</strong> {selectedLog.timestamp.toLocaleString()}
            </div>
          )}
          <div className="form-actions">
            <button className="btn-secondary" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </button>
            <button className="btn-danger" onClick={handleConfirmDelete}>
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

