import { useState, useEffect } from 'react';
import { auth, rtdb } from '../firebase';
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User,
  getIdTokenResult,
  getIdToken
} from 'firebase/auth';
import { ref, get, set } from 'firebase/database';

interface AdminUser extends User {
  isAdmin: boolean;
  role: string;
}

export const useAuth = () => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check for redirect result first
    const checkRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          console.log('Redirect sign-in successful:', result);
        }
      } catch (err) {
        console.error('Redirect sign-in error:', err);
      }
    };

    checkRedirectResult();

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Force token refresh to get latest custom claims
          await getIdToken(firebaseUser, true);

          // Check custom claims first (set by grant_admin.ts script)
          const tokenResult = await getIdTokenResult(firebaseUser, true);
          console.log('Token claims:', tokenResult.claims);
          const hasAdminClaim = tokenResult.claims.admin === true ||
            tokenResult.claims.role === 'admin' ||
            tokenResult.claims.role === 'superadmin';

          // Also check Realtime Database for backward compatibility
          let userData = null;
          let hasDbAdminRole = false;

          try {
            const userRef = ref(rtdb, `users/${firebaseUser.uid}`);
            const snapshot = await get(userRef);
            userData = snapshot.val();
            hasDbAdminRole = userData?.role === 'admin' || userData?.role === 'superadmin';
          } catch (dbErr) {
            // If database check fails, continue with custom claims check
            console.warn('Could not check Realtime Database for admin role:', dbErr);
          }

          // Grant access if user has admin claim OR database admin role
          if (hasAdminClaim || hasDbAdminRole) {
            const role = hasDbAdminRole ? userData.role :
              (tokenResult.claims.role === 'superadmin' ? 'superadmin' : 'admin');

            // If user has admin claim but no DB entry, create one for consistency
            if (hasAdminClaim && !userData) {
              try {
                const userRef = ref(rtdb, `users/${firebaseUser.uid}`);
                await set(userRef, {
                  id: firebaseUser.uid,
                  email: firebaseUser.email || '',
                  displayName: firebaseUser.displayName || '',
                  role: role,
                  createdAt: Date.now()
                });
                console.log('Created admin user entry in Realtime Database');
              } catch (createErr) {
                console.warn('Could not create user entry in Realtime Database:', createErr);
                // Continue anyway since custom claims are valid
              }
            }

            setUser({
              ...firebaseUser,
              isAdmin: true,
              role: role
            } as AdminUser);
            setError(null);
          } else {
            // Not an admin, sign out
            await signOut(auth);
            setUser(null);
            setError('You do not have admin privileges. Please contact an administrator to grant you access.');
          }
        } catch (err) {
          console.error('Error checking admin status:', err);
          setError('Failed to verify admin status');
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setError(null);
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const loginWithGoogle = async () => {
    try {
      setError(null);
      const provider = new GoogleAuthProvider();

      // Add additional scopes if needed
      provider.addScope('email');
      provider.addScope('profile');

      // Set custom parameters
      provider.setCustomParameters({
        prompt: 'select_account'
      });

      const result = await signInWithPopup(auth, provider);
      console.log('Google Sign-In successful:', result);

    } catch (err: any) {
      console.error('Google Sign-In error:', err);

      // Handle specific error codes
      switch (err.code) {
        case 'auth/operation-not-allowed':
          setError('Google Sign-In is not enabled. Please contact administrator or enable it in Firebase Console > Authentication > Sign-in method.');
          break;
        case 'auth/unauthorized-domain':
          setError(`Domain "${window.location.hostname}" is not authorized. Please add it to Firebase Console > Authentication > Settings > Authorized domains.`);
          break;
        case 'auth/popup-closed-by-user':
          setError('Sign-in was cancelled. Please try again.');
          break;
        case 'auth/popup-blocked':
          setError('Popup was blocked by browser. Please allow popups for this site and try again, or use the redirect option.');
          break;
        case 'auth/network-request-failed':
          setError('Network error. Please check your internet connection and try again.');
          break;
        case 'auth/cancelled-popup-request':
          setError('Another sign-in attempt is already in progress. Please wait.');
          break;
        default:
          setError(`Google Sign-In failed: ${err.message || err.code || 'Unknown error'}. Please check the browser console for details.`);
      }

      throw err;
    }
  };

  const loginWithGoogleRedirect = async () => {
    try {
      setError(null);
      const provider = new GoogleAuthProvider();

      // Add additional scopes if needed
      provider.addScope('email');
      provider.addScope('profile');

      // Set custom parameters
      provider.setCustomParameters({
        prompt: 'select_account'
      });

      await signInWithRedirect(auth, provider);

    } catch (err: any) {
      console.error('Google Redirect Sign-In error:', err);

      // Handle specific error codes for redirect
      if (err.code === 'auth/unauthorized-domain') {
        setError(`Domain "${window.location.hostname}" is not authorized. Please add it to Firebase Console > Authentication > Settings > Authorized domains.`);
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('Google Sign-In is not enabled. Please contact administrator or enable it in Firebase Console > Authentication > Sign-in method.');
      } else {
        setError(`Google Sign-In failed: ${err.message || err.code || 'Unknown error'}. Please check the browser console for details.`);
      }

      throw err;
    }
  };

  const logout = async () => {
    try {
      setError(null);
      await signOut(auth);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const refreshToken = async () => {
    try {
      if (auth.currentUser) {
        await getIdToken(auth.currentUser, true);
        console.log('Token refreshed successfully');
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error refreshing token:', err);
      return false;
    }
  };

  return { user, loading, error, login, loginWithGoogle, loginWithGoogleRedirect, logout, refreshToken };
};

