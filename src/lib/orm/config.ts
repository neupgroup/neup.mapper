
'use client';

import {
  Firestore,
  initializeFirestore,
} from 'firebase/firestore';
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
  if (typeof window === 'undefined') {
    return null;
  }
  const configStr = localStorage.getItem('dbConfig');
  if (!configStr) {
    console.warn('Database configuration not found in local storage.');
    return null;
  }
  try {
    const parsedConfig = JSON.parse(configStr);
    dbConfig = parsedConfig;
    return parsedConfig;
  } catch (e) {
    console.error('Failed to parse database configuration.', e);
    return null;
  }
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
