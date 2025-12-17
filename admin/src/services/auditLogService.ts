import { collection, query, getDocs, orderBy, deleteDoc, doc, updateDoc, addDoc, Timestamp, where, limit, startAfter, QueryDocumentSnapshot, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';

export interface AuditLog {
  id: string;
  action: string;
  userId?: string;
  userEmail?: string;
  resourceType?: string;
  resourceId?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  createdAt: Timestamp | any;
  metadata?: any;
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(data: {
  action: string;
  userId?: string;
  userEmail?: string;
  resourceType?: string;
  resourceId?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
  metadata?: any;
}): Promise<string> {
  try {
    const currentUser = auth.currentUser;
    const auditLogsRef = collection(db, 'audit_logs');

    const logData = {
      action: data.action,
      userId: data.userId || currentUser?.uid || 'system',
      userEmail: data.userEmail || currentUser?.email || 'system',
      resourceType: data.resourceType,
      resourceId: data.resourceId,
      details: data.details,
      ipAddress: data.ipAddress || 'N/A',
      userAgent: data.userAgent || (typeof window !== 'undefined' ? window.navigator.userAgent : 'N/A'),
      createdAt: serverTimestamp(),
      metadata: data.metadata,
    };

    const docRef = await addDoc(auditLogsRef, logData);
    console.log('✅ Audit log created:', docRef.id);
    return docRef.id;
  } catch (error: any) {
    console.error('Error creating audit log:', error);
    throw new Error(`Failed to create audit log: ${error?.message || 'Unknown error'}`);
  }
}

/**
 * Fetch audit logs from Firestore
 */
export async function fetchAuditLogs(
  pageSize: number = 50,
  lastDoc?: QueryDocumentSnapshot
): Promise<{ logs: AuditLog[]; lastDoc?: QueryDocumentSnapshot }> {
  try {
    const auditLogsRef = collection(db, 'audit_logs');
    let q;

    try {
      // Try with orderBy first - check both createdAt and timestamp fields
      let orderByField = 'createdAt';
      if (lastDoc) {
        q = query(
          auditLogsRef,
          orderBy(orderByField, 'desc'),
          startAfter(lastDoc),
          limit(pageSize)
        );
      } else {
        q = query(
          auditLogsRef,
          orderBy(orderByField, 'desc'),
          limit(pageSize)
        );
      }

      const snapshot = await getDocs(q);
      const logs: AuditLog[] = [];

      snapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data();

        // Handle both old structure (admin_audit_logs) and new structure (audit_logs from cloud functions)
        const timestamp = data.createdAt?.toDate() ||
          data.timestamp?.toDate() ||
          (data.timestamp && typeof data.timestamp === 'string' ? new Date(data.timestamp) : new Date());

        logs.push({
          id: docSnapshot.id,
          action: data.action || 'Unknown',
          userId: data.userId,
          userEmail: data.userEmail || data.email || null,
          resourceType: data.resourceType || data.collection || null,
          resourceId: data.resourceId || data.documentId || null,
          details: data.details || data.newData || data.oldData || data.data || null,
          ipAddress: data.ipAddress || null,
          userAgent: data.userAgent || null,
          timestamp: timestamp,
          createdAt: data.createdAt || data.timestamp || Timestamp.now(),
          metadata: data.metadata || { source: data.source } || null,
        });
      });

      const lastDocument = snapshot.docs[snapshot.docs.length - 1];
      return {
        logs,
        lastDoc: lastDocument,
      };
    } catch (orderByError: any) {
      // If orderBy fails (no index or wrong field), try with timestamp or without orderBy
      if (orderByError?.code === 'failed-precondition' || orderByError?.message?.includes('index')) {
        console.warn('Index not found for createdAt, trying timestamp field:', orderByError);

        // Try with timestamp field instead
        try {
          if (lastDoc) {
            q = query(
              auditLogsRef,
              orderBy('timestamp', 'desc'),
              startAfter(lastDoc),
              limit(pageSize)
            );
          } else {
            q = query(
              auditLogsRef,
              orderBy('timestamp', 'desc'),
              limit(pageSize)
            );
          }

          const snapshot = await getDocs(q);
          const logs: AuditLog[] = [];

          snapshot.forEach((docSnapshot) => {
            const data = docSnapshot.data();

            // Handle both old structure (admin_audit_logs) and new structure (audit_logs from cloud functions)
            const timestamp = data.createdAt?.toDate() ||
              data.timestamp?.toDate() ||
              (data.timestamp && typeof data.timestamp === 'string' ? new Date(data.timestamp) : new Date());

            logs.push({
              id: docSnapshot.id,
              action: data.action || 'Unknown',
              userId: data.userId,
              userEmail: data.userEmail || data.email || null,
              resourceType: data.resourceType || data.collection || null,
              resourceId: data.resourceId || data.documentId || null,
              details: data.details || data.newData || data.oldData || data.data || null,
              ipAddress: data.ipAddress || null,
              userAgent: data.userAgent || null,
              timestamp: timestamp,
              createdAt: data.createdAt || data.timestamp || Timestamp.now(),
              metadata: data.metadata || { source: data.source } || null,
            });
          });

          const lastDocument = snapshot.docs[snapshot.docs.length - 1];
          return {
            logs,
            lastDoc: lastDocument,
          };
        } catch (timestampError: any) {
          // If timestamp also fails, fetch without orderBy and sort manually
          console.warn('Index not found for timestamp either, fetching without orderBy:', timestampError);
          q = query(auditLogsRef, limit(pageSize * 2)); // Get more to ensure we have enough after sorting
          const snapshot = await getDocs(q);
          const logs: AuditLog[] = [];

          snapshot.forEach((docSnapshot) => {
            const data = docSnapshot.data();

            // Handle both old structure (admin_audit_logs) and new structure (audit_logs from cloud functions)
            const timestamp = data.createdAt?.toDate() ||
              data.timestamp?.toDate() ||
              (data.timestamp && typeof data.timestamp === 'string' ? new Date(data.timestamp) : new Date());

            logs.push({
              id: docSnapshot.id,
              action: data.action || 'Unknown',
              userId: data.userId,
              userEmail: data.userEmail || data.email || null,
              resourceType: data.resourceType || data.collection || null,
              resourceId: data.resourceId || data.documentId || null,
              details: data.details || data.newData || data.oldData || data.data || null,
              ipAddress: data.ipAddress || null,
              userAgent: data.userAgent || null,
              timestamp: timestamp,
              createdAt: data.createdAt || data.timestamp || Timestamp.now(),
              metadata: data.metadata || { source: data.source } || null,
            });
          });

          // Sort manually by timestamp (newest first)
          logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

          // Limit to pageSize after sorting
          const limitedLogs = logs.slice(0, pageSize);

          return {
            logs: limitedLogs,
            lastDoc: undefined,
          };
        }
      }
      throw orderByError;
    }
  } catch (error: any) {
    console.error('Error fetching audit logs:', error);
    // Return empty array instead of throwing if it's a permission or collection doesn't exist
    if (error?.code === 'permission-denied' || error?.code === 'not-found') {
      console.warn('No audit logs found or permission denied, returning empty array');
      return { logs: [], lastDoc: undefined };
    }
    throw new Error(`Failed to fetch audit logs: ${error?.message || 'Unknown error'}`);
  }
}

/**
 * Fetch audit logs with filters
 */
export async function fetchAuditLogsWithFilters(
  filters: {
    action?: string;
    userId?: string;
    resourceType?: string;
    startDate?: Date;
    endDate?: Date;
  },
  pageSize: number = 50
): Promise<AuditLog[]> {
  try {
    const auditLogsRef = collection(db, 'audit_logs');
    let q = query(auditLogsRef, orderBy('createdAt', 'desc'), limit(pageSize));

    // Apply filters
    if (filters.action) {
      q = query(q, where('action', '==', filters.action));
    }
    if (filters.userId) {
      q = query(q, where('userId', '==', filters.userId));
    }
    if (filters.resourceType) {
      q = query(q, where('resourceType', '==', filters.resourceType));
    }

    const snapshot = await getDocs(q);
    const logs: AuditLog[] = [];

    snapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      const logDate = data.createdAt?.toDate() || new Date();

      // Apply date filters
      if (filters.startDate && logDate < filters.startDate) {
        return;
      }
      if (filters.endDate && logDate > filters.endDate) {
        return;
      }

      // Handle both old structure (admin_audit_logs) and new structure (audit_logs from cloud functions)
      const timestamp = data.createdAt?.toDate() ||
        data.timestamp?.toDate() ||
        (data.timestamp && typeof data.timestamp === 'string' ? new Date(data.timestamp) : logDate);

      logs.push({
        id: docSnapshot.id,
        action: data.action || 'Unknown',
        userId: data.userId,
        userEmail: data.userEmail || data.email || null,
        resourceType: data.resourceType || data.collection || null,
        resourceId: data.resourceId || data.documentId || null,
        details: data.details || data.newData || data.oldData || data.data || null,
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
        timestamp: timestamp,
        createdAt: data.createdAt || data.timestamp || Timestamp.now(),
        metadata: data.metadata || { source: data.source } || null,
      });
    });

    return logs;
  } catch (error: any) {
    console.error('Error fetching filtered audit logs:', error);
    throw new Error(`Failed to fetch audit logs: ${error?.message || 'Unknown error'}`);
  }
}

/**
 * Update audit log
 */
export async function updateAuditLog(logId: string, updates: Partial<AuditLog>): Promise<void> {
  try {
    const logRef = doc(db, 'audit_logs', logId);
    const updateData: any = {};

    if (updates.action !== undefined) updateData.action = updates.action;
    if (updates.userEmail !== undefined) updateData.userEmail = updates.userEmail;
    if (updates.resourceType !== undefined) updateData.resourceType = updates.resourceType;
    if (updates.resourceId !== undefined) updateData.resourceId = updates.resourceId;
    if (updates.details !== undefined) updateData.details = updates.details;
    if (updates.metadata !== undefined) updateData.metadata = updates.metadata;

    await updateDoc(logRef, updateData);
  } catch (error: any) {
    console.error('Error updating audit log:', error);
    throw new Error(`Failed to update audit log: ${error?.message || 'Unknown error'}`);
  }
}

/**
 * Delete audit log
 */
export async function deleteAuditLog(logId: string): Promise<void> {
  try {
    const logRef = doc(db, 'audit_logs', logId);
    await deleteDoc(logRef);
  } catch (error: any) {
    console.error('Error deleting audit log:', error);
    throw new Error(`Failed to delete audit log: ${error?.message || 'Unknown error'}`);
  }
}

/**
 * Delete multiple audit logs
 */
export async function deleteAuditLogs(logIds: string[]): Promise<void> {
  try {
    await Promise.all(logIds.map((id) => deleteAuditLog(id)));
  } catch (error: any) {
    console.error('Error deleting audit logs:', error);
    throw new Error(`Failed to delete audit logs: ${error?.message || 'Unknown error'}`);
  }
}

/**
 * Export audit logs to CSV
 */
export function exportAuditLogsToCSV(logs: AuditLog[]): string {
  const headers = ['ID', 'Action', 'User Email', 'Resource Type', 'Resource ID', 'IP Address', 'Timestamp', 'Details'];
  const rows = logs.map((log) => [
    log.id,
    log.action,
    log.userEmail || '',
    log.resourceType || '',
    log.resourceId || '',
    log.ipAddress || '',
    log.timestamp.toISOString(),
    JSON.stringify(log.details || {}),
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
  ].join('\n');

  return csvContent;
}


