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
  User 
} from 'firebase/auth';
import { ref, get } from 'firebase/database';

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
          // Check if user is admin in Realtime Database
          const userRef = ref(rtdb, `users/${firebaseUser.uid}`);
          const snapshot = await get(userRef);
          const userData = snapshot.val();
          
          if (userData?.role === 'admin' || userData?.role === 'superadmin') {
            setUser({
              ...firebaseUser,
              isAdmin: true,
              role: userData.role
            } as AdminUser);
            setError(null);
          } else {
            // Not an admin, sign out
            await signOut(auth);
            setUser(null);
            setError('You do not have admin privileges');
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
          setError('Google Sign-In is not enabled. Please contact administrator.');
          break;
        case 'auth/unauthorized-domain':
          setError('This domain is not authorized for Google Sign-In.');
          break;
        case 'auth/popup-closed-by-user':
          setError('Sign-in was cancelled. Please try again.');
          break;
        case 'auth/popup-blocked':
          setError('Popup was blocked by browser. Please allow popups and try again.');
          break;
        case 'auth/network-request-failed':
          setError('Network error. Please check your internet connection.');
          break;
        default:
          setError(`Google Sign-In failed: ${err.message}`);
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
      setError(`Google Sign-In failed: ${err.message}`);
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

  return { user, loading, error, login, loginWithGoogle, loginWithGoogleRedirect, logout };
};

