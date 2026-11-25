import { initializeApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth';
import { doc, getDocFromServer, getFirestore, type Firestore } from 'firebase/firestore';

interface FirebaseAppletConfig extends FirebaseOptions {
  firestoreDatabaseId?: string;
}

const configModules = import.meta.glob<{ default?: FirebaseAppletConfig }>(
  '/firebase-applet-config.json',
  { eager: true }
);
const matchedConfig = Object.values(configModules)[0];
const firebaseConfig: FirebaseAppletConfig = matchedConfig?.default ?? (matchedConfig as FirebaseAppletConfig) ?? {};

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export const BOOTSTRAPPED_ADMIN_EMAIL = 'jatinkanara2006@gmail.com';

const hasRealConfig =
  Boolean(firebaseConfig?.projectId) &&
  firebaseConfig.projectId !== 'remixed-project-id' &&
  Boolean(firebaseConfig?.apiKey);

let appInstance: FirebaseApp | null = null;
let dbInstance: Firestore | null = null;
let authInstance: Auth | null = null;

if (hasRealConfig) {
  appInstance = initializeApp(firebaseConfig);
  dbInstance = firebaseConfig.firestoreDatabaseId
    ? getFirestore(appInstance, firebaseConfig.firestoreDatabaseId)
    : getFirestore(appInstance);
  authInstance = getAuth(appInstance);
}

export const firebaseAvailable = hasRealConfig;
export const db = dbInstance;
export const auth = authInstance;
export const googleProvider = new GoogleAuthProvider();
export const firebaseMeta = {
  projectId: firebaseConfig?.projectId || '',
  firestoreDatabaseId: firebaseConfig?.firestoreDatabaseId || '(default)',
};

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const currentUser = auth?.currentUser;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentUser?.uid,
      email: currentUser?.email,
      emailVerified: currentUser?.emailVerified,
      isAnonymous: currentUser?.isAnonymous,
      tenantId: currentUser?.tenantId,
      providerInfo:
        currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testFirestoreConnection(): Promise<boolean> {
  if (!db) return false;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
      return false;
    }
    // Permission denied on /test/connection still proves Firestore server is reachable
    return true;
  }
}

void testFirestoreConnection();
