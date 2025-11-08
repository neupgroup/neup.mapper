import { initializeApp, getApp, getApps, FirebaseApp } from 'firebase/app';
import { Firestore, initializeFirestore } from 'firebase/firestore';

export type SupportedDbType = 'Firestore' | 'MongoDB' | 'SQL' | 'API';

export interface DbConfig {
  dbType: SupportedDbType;
  // Firestore
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
  // API
  basePath?: string;
  headers?: { key: string; value: string }[];
  // SQL
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
  // MongoDB
  connectionString?: string;
  dbName?: string;
}
// Named runtime configs, allowing multiple instances per session.
const runtimeConfigs = new Map<string, DbConfig>();

// Firestore instances keyed by connection name (to support multiple apps)
const firestoreInstances = new Map<string, Firestore>();
const appInstances = new Map<string, FirebaseApp>();

export function setDbConfig(config: DbConfig, name: string = 'default') {
  if (runtimeConfigs.has(name)) {
    throw new Error(`Connection name '${name}' already exists. Choose a different name.`);
  }
  runtimeConfigs.set(name, config);
  // Reset caches for this connection name to re-init with new config
  firestoreInstances.delete(name);
  appInstances.delete(name);
}

export function clearDbConfig(name?: string) {
  if (!name) {
    runtimeConfigs.clear();
    firestoreInstances.clear();
    appInstances.clear();
    return;
  }
  runtimeConfigs.delete(name);
  firestoreInstances.delete(name);
  appInstances.delete(name);
}

export function listRuntimeConfigs(): string[] {
  return Array.from(runtimeConfigs.keys());
}

export function getDbConfig(name: string = 'default'): DbConfig | null {
  const runtimeConfig = runtimeConfigs.get(name);
  if (runtimeConfig) return runtimeConfig;

  const type = process.env.DB_TYPE as SupportedDbType | undefined;
  if (!type) {
    console.warn('DB_TYPE environment variable is not set.');
    return null;
  }

  let config: Partial<DbConfig> = { dbType: type };
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
      const headers: { key: string; value: string }[] = [];
      for (let i = 1; i <= 3; i++) {
        const key = process.env[`API_HEADER_${i}_KEY` as const];
        const value = process.env[`API_HEADER_${i}_VALUE` as const];
        if (key && value) headers.push({ key, value });
      }
      config = {
        ...config,
        basePath: process.env.API_BASE_PATH,
        apiKey: process.env.API_KEY,
        headers,
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
    case 'MongoDB':
      config = {
        ...config,
        connectionString: process.env.MONGODB_CONNECTION_STRING,
        dbName: process.env.MONGODB_DB_NAME,
      };
      break;
    default:
      console.warn(`Unsupported DB_TYPE: ${type}`);
      return null;
  }
  return config as DbConfig;
}

export function getFirestoreInstance(name: string = 'default'): Firestore | null {
  const cached = firestoreInstances.get(name);
  if (cached) return cached;

  const config = getDbConfig(name);
  if (config?.dbType !== 'Firestore') return null;

  const firebaseConfig = {
    apiKey: config.apiKey,
    authDomain: config.authDomain,
    projectId: config.projectId,
    storageBucket: config.storageBucket,
    messagingSenderId: config.messagingSenderId,
    appId: config.appId,
  };

  let app: FirebaseApp;
  try {
    // Use isolated app name per connection to allow multiple apps
    const appName = name === 'default' ? undefined : name;
    if (appName) {
      app = initializeApp(firebaseConfig, appName);
    } else {
      if (!getApps().length) {
        app = initializeApp(firebaseConfig);
      } else {
        app = getApp();
      }
    }
  } catch (e) {
    try {
      app = getApp(name === 'default' ? undefined : name);
    } catch (err) {
      console.error('Firebase initialization error:', err);
      return null;
    }
  }

  appInstances.set(name, app);
  const fs = initializeFirestore(app, {});
  firestoreInstances.set(name, fs);
  return fs;
}

export function getApiHeaders(name: string = 'default'): Record<string, string> | null {
  const apiConfig = getDbConfig(name);
  if (!apiConfig || apiConfig.dbType !== 'API') return null;
  const { apiKey, headers: globalHeaders } = apiConfig;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) headers['Authorization'] = apiKey.startsWith('Bearer ') ? apiKey : `Bearer ${apiKey}`;
  if (globalHeaders && Array.isArray(globalHeaders)) {
    globalHeaders.forEach(h => {
      if (h.key && h.value) headers[h.key] = h.value;
    });
  }
  return headers;
}
