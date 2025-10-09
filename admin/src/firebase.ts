// Firebase Configuration for Mixmi Admin Web App
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';

// Your Firebase configuration (same project as mobile app)
const firebaseConfig = {
  apiKey: "AIzaSyDRV6l-1oJ7ZuwMHqcPWKe0dZ7NP-ua0iI",
  authDomain: "mixmi-66529.firebaseapp.com",
  projectId: "mixmi-66529",
  storageBucket: "mixmi-66529.firebasestorage.app",
  messagingSenderId: "563692319306",
  appId: "1:563692319306:web:1d851394a9d61583e8ecb3",
  databaseURL: "https://mixmi-66529-default-rtdb.firebaseio.com/"  // ← Realtime Database URL
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);        // For orders (Firestore)
export const rtdb = getDatabase(app);       // For users (Realtime Database)
export const storage = getStorage(app);

export default app;

