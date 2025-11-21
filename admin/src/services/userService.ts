import { ref, onValue, update, get } from 'firebase/database';
import { collection, query as firestoreQuery, where, getDocs, orderBy as firestoreOrderBy } from 'firebase/firestore';
import { rtdb, db } from '../firebase';

export interface User {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role: 'user' | 'admin' | 'superadmin';
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
    const usersRef = ref(rtdb, 'users');
    const snapshot = await get(usersRef);
    
    if (!snapshot.exists()) {
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
        role: userData.role || 'user',
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

    return users;
  } catch (error) {
    console.error('Error fetching users:', error);
    throw new Error('Failed to fetch users');
  }
}

/**
 * Listen to user updates in real-time
 */
export function subscribeToUsers(callback: (users: User[]) => void): () => void {
  const usersRef = ref(rtdb, 'users');
  
  const unsubscribe = onValue(usersRef, (snapshot) => {
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
        role: userData.role || 'user',
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
  });

  return unsubscribe;
}

/**
 * Update user role
 */
export async function updateUserRole(uid: string, role: 'user' | 'admin' | 'superadmin'): Promise<void> {
  try {
    const userRef = ref(rtdb, `users/${uid}`);
    await update(userRef, {
      role,
      updatedAt: Date.now(),
    });
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

