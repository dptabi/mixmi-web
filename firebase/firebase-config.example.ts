// Firebase Configuration Example
// Copy this file to admin/src/firebase-config.ts and update with your values
// NEVER commit the actual firebase-config.ts with real credentials to version control

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';

// Firebase configuration - Replace with your actual values
const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_API_KEY_HERE",
  authDomain: "mixmi-66529.firebaseapp.com",
  projectId: "mixmi-66529",
  storageBucket: "mixmi-66529.firebasestorage.app",
  messagingSenderId: "563692319306",
  appId: "YOUR_FIREBASE_APP_ID_HERE",
  databaseURL: "https://mixmi-66529-default-rtdb.firebaseio.com/"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const rtdb = getDatabase(app);
export const storage = getStorage(app);

export default app;
