import { readFileSync } from 'fs';
import { resolve } from 'path';
import { cert, initializeApp, getApps } from 'firebase-admin/app';
import type { ServiceAccount } from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getDatabase } from 'firebase-admin/database';

type AddAdminOptions = {
  email: string;
  serviceAccountPath: string;
  role?: 'admin' | 'superadmin';
};

const parseArguments = (): AddAdminOptions => {
  const [, , emailArg, roleArg, serviceAccountArg] = process.argv;
  const email = emailArg ?? process.env.ADMIN_TARGET_EMAIL;
  if (!email) {
    console.error('Missing target email. Pass it as the first argument or set ADMIN_TARGET_EMAIL.');
    process.exit(1);
  }
  const role = (roleArg ?? process.env.ADMIN_ROLE ?? 'admin') as 'admin' | 'superadmin';
  const serviceAccountPath = serviceAccountArg ?? process.env.FIREBASE_ADMIN_SA_PATH ?? '../mixmi-66529-firebase-adminsdk-fbsvc-d20953b0b9.json';
  return { email, role, serviceAccountPath };
};

const loadServiceAccount = (serviceAccountPath: string): ServiceAccount => {
  const resolvedPath = resolve(process.cwd(), serviceAccountPath);
  const buffer = readFileSync(resolvedPath, 'utf8');
  return JSON.parse(buffer) as ServiceAccount;
};

const initializeFirebaseApp = (serviceAccount: ServiceAccount): void => {
  if (getApps().length === 0) {
    initializeApp({ 
      credential: cert(serviceAccount),
      databaseURL: 'https://mixmi-66529-default-rtdb.firebaseio.com'
    });
  }
};

const addAdminToDatabase = async (email: string, role: 'admin' | 'superadmin'): Promise<void> => {
  const auth = getAuth();
  const db = getDatabase();
  
  // Get user by email
  const userRecord = await auth.getUserByEmail(email);
  const uid = userRecord.uid;
  
  // Create or update user entry in Realtime Database
  const userRef = db.ref(`users/${uid}`);
  const snapshot = await userRef.once('value');
  const existingData = snapshot.val();
  
  const userData = {
    id: uid,
    email: userRecord.email || email,
    displayName: userRecord.displayName || userRecord.email?.split('@')[0] || 'Admin User',
    role: role,
    createdAt: existingData?.createdAt || Date.now(),
    updatedAt: Date.now()
  };
  
  await userRef.set(userData);
  
  console.log(`✅ Successfully added ${email} (${uid}) to Realtime Database with role: ${role}`);
  console.log(`   User data:`, userData);
};

const executeAddAdmin = async (): Promise<void> => {
  const options = parseArguments();
  const serviceAccount = loadServiceAccount(options.serviceAccountPath);
  initializeFirebaseApp(serviceAccount);
  await addAdminToDatabase(options.email, options.role || 'admin');
};

executeAddAdmin().catch((error: unknown) => {
  console.error('❌ Failed to add admin to database:', error);
  process.exit(1);
});

