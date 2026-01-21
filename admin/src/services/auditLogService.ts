import { collection, query, getDocs, orderBy, deleteDoc, doc, updateDoc, addDoc, Timestamp, where, limit, startAfter, QueryDocumentSnapshot, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { getIdToken } from 'firebase/auth';

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
    // Ensure token is fresh and check claims for debugging
    if (auth.currentUser) {
      try {
        await getIdToken(auth.currentUser, true);
        const tokenResult = await auth.currentUser.getIdTokenResult(true);
        console.log('Token claims for audit log creation:', {
          admin: tokenResult.claims.admin,
          role: tokenResult.claims.role,
          uid: auth.currentUser.uid,
          email: auth.currentUser.email
        });
      } catch (tokenError) {
        console.error('Error refreshing token:', tokenError);
      }
    }

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
    console.error('Error code:', error?.code);
    console.error('Error message:', error?.message);

    if (error?.code === 'permission-denied') {
      const errorMsg = `Permission denied: You do not have permission to create audit logs. Please ensure your account has admin/superadmin privileges. Error: ${error?.message || 'Unknown error'}`;
      console.error('PERMISSION DENIED:', errorMsg);
      throw new Error(errorMsg);
    }

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
    // Ensure token is fresh and check claims for debugging
    if (auth.currentUser) {
      try {
        await getIdToken(auth.currentUser, true);
        const tokenResult = await auth.currentUser.getIdTokenResult(true);
        console.log('Token claims for audit logs access:', {
          admin: tokenResult.claims.admin,
          role: tokenResult.claims.role,
          uid: auth.currentUser.uid,
          email: auth.currentUser.email
        });
      } catch (tokenError) {
        console.error('Error refreshing token:', tokenError);
      }
    }

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
    console.error('Error code:', error?.code);
    console.error('Error message:', error?.message);

    // Check for permission denied specifically
    if (error?.code === 'permission-denied') {
      console.error('PERMISSION DENIED: User does not have access to audit_logs collection');
      console.error('Please verify:');
      console.error('1. User has admin/superadmin role in custom claims');
      console.error('2. Token has been refreshed (should have admin=true or role=admin/superadmin)');
      console.error('3. Firestore rules allow isAdmin() access');

      // Still throw so UI can show proper error
      throw new Error(`Permission denied: You do not have access to audit logs. Please ensure your account has admin privileges. Error: ${error?.message || 'Unknown error'}`);
    }

    // Return empty array only for not-found (collection doesn't exist yet)
    if (error?.code === 'not-found') {
      console.warn('Collection not found, returning empty array');
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






