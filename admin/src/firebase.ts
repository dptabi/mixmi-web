// Firebase Configuration for Mixmi Admin Web App
// This file uses environment variables for security
// For local development, use firebase-config.ts (not committed to Git)

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';

// Try to import local configuration first, fallback to environment variables
let firebaseConfig;

try {
  // This file should exist locally but is not committed to Git
  const localConfig = require('./firebase-config');
  firebaseConfig = localConfig.firebaseConfig;
} catch (error) {
  // Fallback to environment variables for production
  firebaseConfig = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_FIREBASE_APP_ID,
    databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL
  };
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);        // For orders (Firestore)
export const rtdb = getDatabase(app);       // For users (Realtime Database)
export const storage = getStorage(app);

export default app;

