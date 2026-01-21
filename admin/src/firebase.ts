// Firebase Configuration for Mixmi Admin Web App
// This file uses environment variables for security
// For local development, use firebase-config.ts (not committed to Git)

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

// Import the Firebase configuration directly
import { firebaseConfig } from './firebase-config';

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);        // For orders (Firestore)
export const rtdb = getDatabase(app);       // For users (Realtime Database)
export const storage = getStorage(app);
export const functions = getFunctions(app, 'us-central1');

export default app;

