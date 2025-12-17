import { readFileSync } from 'fs';
import { resolve } from 'path';
import { cert, initializeApp, getApps } from 'firebase-admin/app';
import type { ServiceAccount } from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getDatabase } from 'firebase-admin/database';

type GrantSuperAdminOptions = {
  email: string;
  serviceAccountPath: string;
};

const parseArguments = (): GrantSuperAdminOptions => {
  const [, , emailArg, serviceAccountArg] = process.argv;
  const email = emailArg ?? process.env.ADMIN_TARGET_EMAIL;
  if (!email) {
    console.error('Missing target email. Pass it as the first argument or set ADMIN_TARGET_EMAIL.');
    process.exit(1);
  }
  const serviceAccountPath = serviceAccountArg ?? process.env.FIREBASE_ADMIN_SA_PATH ?? '../mixmi-66529-firebase-adminsdk-fbsvc-d20953b0b9.json';
  return { email, serviceAccountPath };
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

const grantSuperAdminAccess = async (email: string): Promise<void> => {
  const auth = getAuth();
  const db = getDatabase();
  
  // Get user by email
  const userRecord = await auth.getUserByEmail(email);
  const uid = userRecord.uid;
  
  console.log(`\n🔐 Granting superadmin access to ${email} (${uid})...\n`);
  
  // Step 1: Set custom claims (admin: true, role: 'superadmin')
  const existingClaims = userRecord.customClaims ?? {};
  await auth.setCustomUserClaims(uid, { 
    ...existingClaims, 
    admin: true,
    role: 'superadmin' 
  });
  console.log('✅ Set custom claims: admin=true, role=superadmin');
  
  // Step 2: Add/update user in Realtime Database
  const userRef = db.ref(`users/${uid}`);
  const snapshot = await userRef.once('value');
  const existingData = snapshot.val();
  
  const userData = {
    id: uid,
    email: userRecord.email || email,
    displayName: userRecord.displayName || userRecord.email?.split('@')[0] || 'Super Admin',
    role: 'superadmin',
    status: existingData?.status || 'active',
    createdAt: existingData?.createdAt || Date.now(),
    updatedAt: Date.now()
  };
  
  await userRef.set(userData);
  console.log('✅ Added/updated user in Realtime Database with role: superadmin');
  console.log(`   User data:`, userData);
  
  console.log(`\n✅ Successfully granted superadmin access to ${email}`);
  console.log(`\n⚠️  IMPORTANT: User must sign out and sign back in for the changes to take effect!`);
  console.log(`   The custom claims are now set, but the user's current session token needs to be refreshed.\n`);
};

const executeGrantSuperAdmin = async (): Promise<void> => {
  const options = parseArguments();
  const serviceAccount = loadServiceAccount(options.serviceAccountPath);
  initializeFirebaseApp(serviceAccount);
  await grantSuperAdminAccess(options.email);
};

executeGrantSuperAdmin().catch((error: unknown) => {
  console.error('❌ Failed to grant superadmin access:', error);
  process.exit(1);
});

