
import { Firestore, initializeFirestore } from 'firebase/firestore';
import { initializeApp, getApp, getApps, FirebaseApp } from 'firebase/app';

// --- DATABASE CONFIGURATION ---
export interface DbConfig {
  dbType: 'Firestore' | 'MongoDB' | 'SQL' | 'API';
  [key: string]: any;
}

let firestoreInstance: Firestore | null = null;
let appInstance: FirebaseApp | null = null;
let dbConfig: DbConfig | null = null;

export function getDbConfig(): DbConfig | null {
  if (dbConfig) {
    return dbConfig;
  }

  const type = process.env.DB_TYPE;

  if (!type) {
    console.warn('DB_TYPE environment variable is not set.');
    return null;
  }

  let config: Partial<DbConfig> = { dbType: type as DbConfig['dbType'] };

  switch (type) {
    case 'Firestore':
      config = {
        ...config,
        apiKey: process.env.FIRESTORE_API_KEY,
        authDomain: process.env.FIRESTORE_AUTH_DOMAIN,
        projectId: process.env.FIRESTORE_PROJECT_ID,
        storageBucket: process.env.FIRESTORE_STORAGE_BUCKET,
        messagingSenderId: process.env.FIRESTORE_MESSAGING_SENDER_ID,
        appId: process.env.FIRESTORE_APP_ID,
      };
      break;
    case 'API':
      config = {
        ...config,
        basePath: process.env.API_BASE_PATH,
        apiKey: process.env.API_KEY,
      };
      break;
    case 'SQL':
      config = {
        ...config,
        host: process.env.SQL_HOST,
        port: process.env.SQL_PORT ? parseInt(process.env.SQL_PORT, 10) : undefined,
        user: process.env.SQL_USER,
        password: process.env.SQL_PASSWORD,
        database: process.env.SQL_DATABASE,
      };
      break;
    default:
      console.warn(`Unsupported DB_TYPE: ${type}`);
      return null;
  }
  
  dbConfig = config as DbConfig;
  return dbConfig;
}

export function getFirestoreInstance(): Firestore | null {
  if (firestoreInstance) {
    return firestoreInstance;
  }

  const config = getDbConfig();
  if (config?.dbType !== 'Firestore') {
    return null;
  }

  const firebaseConfig = {
    apiKey: config.apiKey,
    authDomain: config.authDomain,
    projectId: config.projectId,
    storageBucket: config.storageBucket,
    messagingSenderId: config.messagingSenderId,
    appId: config.appId,
  };

  if (!getApps().length) {
    try {
      appInstance = initializeApp(firebaseConfig);
    } catch (e) {
      console.error('Firebase initialization error:', e);
      return null;
    }
  } else {
    appInstance = getApp();
  }

  firestoreInstance = initializeFirestore(appInstance, {});
  return firestoreInstance;
}
