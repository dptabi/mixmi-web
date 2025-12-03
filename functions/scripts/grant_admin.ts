import { readFileSync } from 'fs';
import { resolve } from 'path';
import { cert, initializeApp } from 'firebase-admin/app';
import type { ServiceAccount } from 'firebase-admin';
import { getAuth, UserRecord } from 'firebase-admin/auth';

type GrantAdminOptions = {
  email: string;
  serviceAccountPath: string;
};

const parseArguments = (): GrantAdminOptions => {
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
  initializeApp({ credential: cert(serviceAccount) });
};

const grantAdminClaim = async (email: string): Promise<void> => {
  const auth = getAuth();
  const userRecord: UserRecord = await auth.getUserByEmail(email);
  const existingClaims = userRecord.customClaims ?? {};
  await auth.setCustomUserClaims(userRecord.uid, { ...existingClaims, admin: true });
  console.log(`Granted admin claim to ${email}. Sign out/in to refresh console access.`);
};

const executeGrantAdmin = async (): Promise<void> => {
  const options = parseArguments();
  const serviceAccount = loadServiceAccount(options.serviceAccountPath);
  initializeFirebaseApp(serviceAccount);
  await grantAdminClaim(options.email);
};

executeGrantAdmin().catch((error: unknown) => {
  console.error('Failed to grant admin claim:', error);
  process.exit(1);
});

