import { ref, onValue, update, get, goOffline, goOnline } from 'firebase/database';
import { collection, query as firestoreQuery, where, getDocs, orderBy as firestoreOrderBy } from 'firebase/firestore';
import { rtdb, db, auth } from '../firebase';
import { getIdToken, getIdTokenResult } from 'firebase/auth';
import { createAuditLog } from './auditLogService';

export interface User {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role: 'buyer' | 'creator' | 'admin' | 'superadmin';
  status: 'active' | 'suspended' | 'banned';
  createdAt: number;
  lastLoginAt?: number;
  phoneNumber?: string;
  address?: string;
  suspendedReason?: string;
  suspendedAt?: number;
  bannedReason?: string;
  bannedAt?: number;
}

export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  bannedUsers: number;
  newToday: number;
  admins: number;
}

/**
 * Fetch all users from Realtime Database
 */
export async function fetchUsers(): Promise<User[]> {
  try {
    // Force token refresh to ensure we have latest custom claims
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User is not authenticated');
    }

    // Force token refresh - this is critical for custom claims to be updated
    try {
      // First, get a fresh token by forcing refresh
      await getIdToken(currentUser, true);
      console.log('✅ Token refreshed before fetching users');

      // Get token result to check claims
      const tokenResult = await getIdTokenResult(currentUser, true);
      console.log('📋 Token claims:', JSON.stringify(tokenResult.claims, null, 2));
      console.log('🔐 Has admin claim:', tokenResult.claims.admin === true);
      console.log('👤 Has role claim:', tokenResult.claims.role);

      // Check if user has admin claims
      const hasAdminClaim = tokenResult.claims.admin === true ||
        tokenResult.claims.role === 'admin' ||
        tokenResult.claims.role === 'superadmin';

      if (!hasAdminClaim) {
        console.warn('⚠️ User token does not have admin claims');
        console.warn('⚠️ Token claims present:', Object.keys(tokenResult.claims));
        // Still try to proceed in case database rules allow it, but log warning
      } else {
        console.log('✅ Token has valid admin claims for database access');
      }

      // Verify user's role in database
      try {
        const userRef = ref(rtdb, `users/${currentUser.uid}`);
        const userSnapshot = await get(userRef);
        const userData = userSnapshot.val();
        console.log('📊 User data from database:', userData);
        console.log('🎭 User role in database:', userData?.role);

        if (userData?.role === 'superadmin' || userData?.role === 'admin') {
          console.log('✅ User has admin role in database');
        }
      } catch (userCheckError: any) {
        console.warn('⚠️ Could not verify user role in database:', userCheckError);
        if (userCheckError?.code === 'PERMISSION_DENIED') {
          console.error('❌ Permission denied when checking own user record');
        }
      }
    } catch (tokenError: any) {
      console.error('❌ Could not refresh token:', tokenError);
      throw new Error('Failed to refresh authentication token. Please sign out and sign back in to get a fresh token with updated claims.');
    }

    // Now try to fetch all users
    console.log('🔍 Attempting to fetch all users from Realtime Database...');
    const usersRef = ref(rtdb, 'users');
    const snapshot = await get(usersRef);

    if (!snapshot.exists()) {
      console.log('No users found in Realtime Database');
      return [];
    }

    const usersData = snapshot.val();
    const users: User[] = [];

    Object.entries(usersData).forEach(([uid, userData]: [string, any]) => {
      users.push({
        uid,
        email: userData.email || '',
        displayName: userData.displayName || userData.username || 'Unknown',
        photoURL: userData.photoURL || userData.profilePicture,
        role: userData.role || 'buyer',
        status: userData.status || 'active',
        createdAt: userData.createdAt || Date.now(),
        lastLoginAt: userData.lastLoginAt,
        phoneNumber: userData.phoneNumber,
        address: userData.address,
        suspendedReason: userData.suspendedReason,
        suspendedAt: userData.suspendedAt,
        bannedReason: userData.bannedReason,
        bannedAt: userData.bannedAt,
      });
    });

    // Sort by creation date (newest first)
    users.sort((a, b) => b.createdAt - a.createdAt);

    console.log(`Successfully fetched ${users.length} users from Realtime Database`);
    return users;
  } catch (error: any) {
    console.error('❌ Error fetching users:', error);
    console.error('🔴 Error code:', error?.code);
    console.error('📝 Error message:', error?.message);
    console.error('🔍 Full error object:', error);

    // Get current user info for debugging
    const currentUser = auth.currentUser;
    if (currentUser) {
      try {
        const tokenResult = await getIdTokenResult(currentUser);
        console.error('🔐 Current token claims:', JSON.stringify(tokenResult.claims, null, 2));
        console.error('👤 Current user UID:', currentUser.uid);
        console.error('📧 Current user email:', currentUser.email);
      } catch (tokenErr) {
        console.error('⚠️ Could not get token info for debugging:', tokenErr);
      }
    }

    const errorMessage = error?.message || error?.code || 'Unknown error';
    let errorDetails = '';

    if (error?.code === 'PERMISSION_DENIED' || errorMessage?.toLowerCase().includes('permission denied')) {
      let hasAdminClaim = false;
      if (currentUser) {
        try {
          const tokenResult = await getIdTokenResult(currentUser);
          hasAdminClaim = tokenResult.claims.admin === true ||
            tokenResult.claims.role === 'admin' ||
            tokenResult.claims.role === 'superadmin';
        } catch (_) {
          /* ignore */
        }
      }

      if (hasAdminClaim) {
        errorDetails = '❌ PERMISSION DENIED (Realtime Database)\n\n' +
          'Your token has admin claims (Orders dashboard works). The User dashboard reads from Realtime Database; its rules are likely not deployed.\n\n' +
          '🔧 FIX: From the project root run:\n\n' +
          '   firebase deploy --only database\n\n' +
          'Then reload the User dashboard.';
      } else {
        errorDetails = '❌ PERMISSION DENIED\n\n' +
          'Your token does not have admin/superadmin claims.\n\n' +
          '🔧 FIX: Run ./scripts/grant-superadmin.sh <your-email>, then sign out and sign back in.';
      }
    } else {
      errorDetails = `Failed to fetch users: ${errorMessage}\n\n` +
        `Error code: ${error?.code || 'N/A'}\n` +
        `If this is a network error, check your internet connection.\n` +
        `If this persists, check the browser console (F12) for more details.`;
    }

    throw new Error(errorDetails);
  }
}

/**
 * Listen to user updates in real-time
 */
export function subscribeToUsers(callback: (users: User[]) => void): () => void {
  let unsubscribe: (() => void) | null = null;
  let cancelled = false;
  let retryCount = 0;
  const maxRetries = 1;

  const doUnsubscribe = () => {
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
  };

  // Refresh token and verify claims before subscribing
  const setupSubscription = async () => {
    if (cancelled) return;
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        console.error('❌ Cannot subscribe: User is not authenticated');
        callback([]);
        return;
      }

      // Force token refresh and reconnect RTDB so the persistent connection uses the new token
      try {
        await getIdToken(currentUser, true);
        console.log('✅ Token refreshed before subscribing to users');
        const tokenResult = await getIdTokenResult(currentUser, true);
        const hasAdminClaim = tokenResult.claims.admin === true ||
          tokenResult.claims.role === 'admin' ||
          tokenResult.claims.role === 'superadmin';
        if (!hasAdminClaim) {
          console.warn('⚠️ User token does not have admin claims for subscription');
        }
        // Force RTDB to reconnect so the connection is authenticated with the new token
        goOffline(rtdb);
        goOnline(rtdb);
        await new Promise((r) => setTimeout(r, 300));
      } catch (tokenError: any) {
        console.error('❌ Could not refresh token for subscription:', tokenError);
        callback([]);
        return;
      }

      if (cancelled) return;

      const usersRef = ref(rtdb, 'users');
      console.log('🔍 Setting up real-time subscription to users...');

      unsubscribe = onValue(
        usersRef,
        (snapshot) => {
          if (!snapshot.exists()) {
            callback([]);
            return;
          }
          const usersData = snapshot.val();
          const users: User[] = [];
          Object.entries(usersData).forEach(([uid, userData]: [string, any]) => {
            users.push({
              uid,
              email: userData.email || '',
              displayName: userData.displayName || userData.username || 'Unknown',
              photoURL: userData.photoURL || userData.profilePicture,
              role: userData.role || 'buyer',
              status: userData.status || 'active',
              createdAt: userData.createdAt || Date.now(),
              lastLoginAt: userData.lastLoginAt,
              phoneNumber: userData.phoneNumber,
              address: userData.address,
              suspendedReason: userData.suspendedReason,
              suspendedAt: userData.suspendedAt,
              bannedReason: userData.bannedReason,
              bannedAt: userData.bannedAt,
            });
          });
          users.sort((a, b) => b.createdAt - a.createdAt);
          callback(users);
        },
        async (error: any) => {
          console.error('❌ Error in real-time users subscription:', error?.code, error?.message);

          if (error?.code === 'PERMISSION_DENIED' && retryCount < maxRetries) {
            const currentUser = auth.currentUser;
            const hasClaims = currentUser
              ? await getIdTokenResult(currentUser).then((r) =>
                  r.claims.admin === true || r.claims.role === 'admin' || r.claims.role === 'superadmin'
                ).catch(() => false)
              : false;
            if (hasClaims) {
              retryCount += 1;
              console.log('🔄 Token has admin claims; forcing RTDB reconnect and retrying...');
              doUnsubscribe();
              await getIdToken(currentUser!, true);
              goOffline(rtdb);
              goOnline(rtdb);
              await new Promise((r) => setTimeout(r, 400));
              if (!cancelled) setupSubscription();
              return;
            }
          }

          if (error?.code === 'PERMISSION_DENIED') {
            console.error(
              '❌ PERMISSION DENIED at /users. Your token has admin claims (Orders work). Deploy Realtime Database rules: firebase deploy --only database'
            );
          }
          callback([]);
        }
      );

      console.log('✅ Real-time subscription to users established');
    } catch (error: any) {
      console.error('❌ Failed to set up real-time subscription:', error);
      callback([]);
    }
  };

  setupSubscription();

  return () => {
    cancelled = true;
    doUnsubscribe();
    console.log('🔌 Unsubscribed from real-time users updates');
  };
}

/**
 * Update user role
 */
export async function updateUserRole(uid: string, role: 'buyer' | 'creator' | 'admin' | 'superadmin'): Promise<void> {
  try {
    const userRef = ref(rtdb, `users/${uid}`);
    const userSnapshot = await get(userRef);
    const oldRole = userSnapshot.val()?.role;

    await update(userRef, {
      role,
      updatedAt: Date.now(),
    });

    // Create audit log
    try {
      await createAuditLog({
        action: 'update',
        resourceType: 'user',
        resourceId: uid,
        details: {
          field: 'role',
          oldValue: oldRole,
          newValue: role,
        },
      });
    } catch (auditError) {
      console.warn('Failed to create audit log:', auditError);
      // Don't fail the operation if audit log fails
    }
  } catch (error) {
    console.error('Error updating user role:', error);
    throw new Error('Failed to update user role');
  }
}

/**
 * Update user status (suspend, ban, activate)
 */
export async function updateUserStatus(
  uid: string,
  status: 'active' | 'suspended' | 'banned',
  reason?: string
): Promise<void> {
  try {
    const userRef = ref(rtdb, `users/${uid}`);
    const userSnapshot = await get(userRef);
    const oldStatus = userSnapshot.val()?.status;

    const updateData: any = {
      status,
      updatedAt: Date.now(),
    };

    if (status === 'suspended') {
      updateData.suspendedReason = reason || 'No reason provided';
      updateData.suspendedAt = Date.now();
    } else if (status === 'banned') {
      updateData.bannedReason = reason || 'No reason provided';
      updateData.bannedAt = Date.now();
    } else if (status === 'active') {
      // Clear suspension/ban data when activating
      updateData.suspendedReason = null;
      updateData.suspendedAt = null;
      updateData.bannedReason = null;
      updateData.bannedAt = null;
    }

    await update(userRef, updateData);

    // Create audit log
    try {
      await createAuditLog({
        action: 'update',
        resourceType: 'user',
        resourceId: uid,
        details: {
          field: 'status',
          oldValue: oldStatus,
          newValue: status,
          reason: reason,
        },
      });
    } catch (auditError) {
      console.warn('Failed to create audit log:', auditError);
      // Don't fail the operation if audit log fails
    }
  } catch (error) {
    console.error('Error updating user status:', error);
    throw new Error('Failed to update user status');
  }
}

/**
 * Get user's orders from Firestore
 */
export async function getUserOrders(userEmail: string): Promise<any[]> {
  try {
    const ordersRef = collection(db, 'orders');
    const q = firestoreQuery(
      ordersRef,
      where('customerEmail', '==', userEmail),
      firestoreOrderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    const orders: any[] = [];

    snapshot.forEach((doc) => {
      orders.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return orders;
  } catch (error) {
    console.error('Error fetching user orders:', error);
    throw new Error('Failed to fetch user orders');
  }
}

/**
 * Calculate user statistics
 */
export function calculateUserStats(users: User[]): UserStats {
  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;

  return {
    totalUsers: users.length,
    activeUsers: users.filter(u => u.status === 'active').length,
    suspendedUsers: users.filter(u => u.status === 'suspended').length,
    bannedUsers: users.filter(u => u.status === 'banned').length,
    newToday: users.filter(u => u.createdAt >= oneDayAgo).length,
    admins: users.filter(u => u.role === 'admin' || u.role === 'superadmin').length,
  };
}

/**
 * Export users to CSV format
 */
export function exportUsersToCSV(users: User[]): string {
  const headers = ['UID', 'Email', 'Display Name', 'Role', 'Status', 'Created At', 'Last Login'];
  const rows = users.map(user => [
    user.uid,
    user.email,
    user.displayName || '',
    user.role,
    user.status,
    new Date(user.createdAt).toLocaleDateString(),
    user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n');

  return csvContent;
}

/**
 * Download CSV file
 */
export function downloadCSV(csvContent: string, filename: string = 'users.csv'): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

