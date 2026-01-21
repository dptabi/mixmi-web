import { ref, onValue, update, get } from 'firebase/database';
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
      // Get token info for more detailed error message
      let tokenInfo = '';
      if (currentUser) {
        try {
          const tokenResult = await getIdTokenResult(currentUser);
          const hasAdminClaim = tokenResult.claims.admin === true ||
            tokenResult.claims.role === 'admin' ||
            tokenResult.claims.role === 'superadmin';
          
          tokenInfo = `\n📊 Current Token Status:\n` +
            `   - Has admin claim: ${tokenResult.claims.admin === true}\n` +
            `   - Role claim: ${tokenResult.claims.role || 'none'}\n` +
            `   - Valid admin access: ${hasAdminClaim}\n` +
            `   - User UID: ${currentUser.uid}\n` +
            `   - User email: ${currentUser.email || 'N/A'}\n`;
        } catch (tokenErr) {
          tokenInfo = '\n⚠️ Could not retrieve token information for debugging.\n';
        }
      }

      errorDetails = '❌ PERMISSION DENIED\n\n' +
        'Your authentication token does not have admin/superadmin custom claims.\n' +
        tokenInfo +
        '\n🔧 TO FIX THIS:\n\n' +
        '1. Run this command (from project root):\n' +
        '   ./scripts/grant-superadmin.sh hey@mixmi.co\n\n' +
        '2. Sign out completely from the admin panel (click Logout)\n\n' +
        '3. Sign back in with your Google account\n' +
        '   (This gets a fresh token with the updated claims)\n\n' +
        '4. Check browser console (F12) - look for "Token claims:" logs\n' +
        '   You should see: admin: true, role: "superadmin"\n\n' +
        'If issue persists:\n' +
        '- Verify database rules are deployed: firebase deploy --only database\n' +
        '- Check console for detailed token claim information\n' +
        '- Try clicking the "🔑 Refresh Token & Retry" button';
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

  // Refresh token and verify claims before subscribing
  const setupSubscription = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        console.error('❌ Cannot subscribe: User is not authenticated');
        callback([]);
        return;
      }

      // Force token refresh - this is critical for custom claims to be updated
      try {
        await getIdToken(currentUser, true);
        console.log('✅ Token refreshed before subscribing to users');

        // Get token result to check claims
        const tokenResult = await getIdTokenResult(currentUser, true);
        console.log('📋 Token claims (subscription):', JSON.stringify(tokenResult.claims, null, 2));
        console.log('🔐 Has admin claim:', tokenResult.claims.admin === true);
        console.log('👤 Has role claim:', tokenResult.claims.role);

        // Check if user has admin claims
        const hasAdminClaim = tokenResult.claims.admin === true ||
          tokenResult.claims.role === 'admin' ||
          tokenResult.claims.role === 'superadmin';

        if (!hasAdminClaim) {
          console.warn('⚠️ User token does not have admin claims for subscription');
          // Still try to proceed in case database rules allow it
        }

        // Verify user's role in database
        try {
          const userRef = ref(rtdb, `users/${currentUser.uid}`);
          const userSnapshot = await get(userRef);
          const userData = userSnapshot.val();
          console.log('📊 User data from database (subscription):', userData);
          console.log('🎭 User role in database:', userData?.role);

          if (userData?.role === 'superadmin' || userData?.role === 'admin') {
            console.log('✅ User has admin role in database (subscription)');
          }
        } catch (userCheckError: any) {
          console.warn('⚠️ Could not verify user role in database (subscription):', userCheckError);
          if (userCheckError?.code === 'PERMISSION_DENIED') {
            console.error('❌ Permission denied when checking own user record (subscription)');
          }
        }
      } catch (tokenError: any) {
        console.error('❌ Could not refresh token for subscription:', tokenError);
        const errorDetails = 'Failed to refresh authentication token for real-time subscription. ' +
          'Please sign out and sign back in to get a fresh token with updated claims.';
        console.error(errorDetails);
        callback([]);
        return;
      }

      // Now set up the real-time subscription
      const usersRef = ref(rtdb, 'users');
      console.log('🔍 Setting up real-time subscription to users...');

      unsubscribe = onValue(
        usersRef,
        (snapshot) => {
          if (!snapshot.exists()) {
            console.log('No users found in Realtime Database (real-time subscription)');
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
          console.log(`Real-time update: ${users.length} users`);
          callback(users);
        },
        (error: any) => {
          console.error('❌ Error in real-time users subscription:', error);
          console.error('🔴 Error code:', error?.code);
          console.error('📝 Error message:', error?.message);

          if (error?.code === 'PERMISSION_DENIED') {
            const errorDetails = '❌ PERMISSION DENIED (Real-time Subscription)\n\n' +
              'Your authentication token does not have admin/superadmin custom claims.\n\n' +
              '🔧 TO FIX THIS:\n\n' +
              '1. Run this command (from project root):\n' +
              '   ./scripts/grant-superadmin.sh hey@mixmi.co\n\n' +
              '2. Sign out completely from the admin panel (click Logout)\n\n' +
              '3. Sign back in with your Google account\n' +
              '   (This gets a fresh token with the updated claims)\n\n' +
              '4. Check browser console (F12) - look for "Token claims:" logs\n' +
              '   You should see: admin: true, role: "superadmin"\n\n' +
              'If issue persists:\n' +
              '- Verify database rules are deployed: firebase deploy --only database\n' +
              '- Check console for detailed token claim information';
            console.error(errorDetails);

            // Get current user info for debugging
            const currentUser = auth.currentUser;
            if (currentUser) {
              try {
                getIdTokenResult(currentUser).then((tokenResult) => {
                  console.error('🔐 Current token claims (subscription error):', JSON.stringify(tokenResult.claims, null, 2));
                  console.error('👤 Current user UID:', currentUser.uid);
                  console.error('📧 Current user email:', currentUser.email);
                }).catch((tokenErr) => {
                  console.error('⚠️ Could not get token info for debugging:', tokenErr);
                });
              } catch (tokenErr) {
                console.error('⚠️ Could not get token info for debugging:', tokenErr);
              }
            }
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

  // Start the async setup
  setupSubscription();

  // Return unsubscribe function
  return () => {
    if (unsubscribe) {
      unsubscribe();
      console.log('🔌 Unsubscribed from real-time users updates');
    }
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

