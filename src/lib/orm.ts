
'use client';

import {
  collection,
  query,
  getDocs,
  where,
  limit,
  startAt,
  orderBy,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  DocumentData,
  Firestore,
  connectFirestoreEmulator,
  initializeFirestore,
} from 'firebase/firestore';
import { initializeApp, getApp, getApps, FirebaseApp } from 'firebase/app';

// --- DATABASE CONFIGURATION ---
interface DbConfig {
  dbType: 'Firestore' | 'MongoDB' | 'SQL';
  [key: string]: any;
}

let firestoreInstance: Firestore | null = null;
let appInstance: FirebaseApp | null = null;

function getDbConfig(): DbConfig | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const configStr = localStorage.getItem('dbConfig');
  if (!configStr) {
    console.warn('Database configuration not found in local storage.');
    return null;
  }
  try {
    return JSON.parse(configStr);
  } catch (e) {
    console.error('Failed to parse database configuration.', e);
    return null;
  }
}

function getFirestoreInstance(): Firestore | null {
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
            console.error("Firebase initialization error:", e);
            return null;
        }
    } else {
        appInstance = getApp();
    }
    
    firestoreInstance = initializeFirestore(appInstance, {});
    return firestoreInstance;
}


// --- QUERY BUILDER ---

class QueryBuilder {
  private collectionName: string;
  private db: Firestore | null;
  private filters: any[] = [];
  private limitCount: number | null = null;
  private offsetCount: number | null = null;
  private sorting: any | null = null;

  constructor(collectionName: string) {
    this.collectionName = collectionName;
    const config = getDbConfig();
    if (config?.dbType === 'Firestore') {
      this.db = getFirestoreInstance();
    } else {
      this.db = null;
    }
  }

  where(field: string, operator: any, value: any) {
    this.filters.push({ field, operator, value });
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  offset(count: number) {
    this.offsetCount = count;
    return this;
  }

  sortBy(field: string, direction: 'asc' | 'desc' = 'asc') {
    this.sorting = { field, direction };
    return this;
  }

  async getDocuments(...fields: string[]): Promise<DocumentData[]> {
    const config = getDbConfig();
    if (!config) {
      throw new Error('Database not configured');
    }

    switch (config.dbType) {
      case 'Firestore':
        return this.getFirestoreDocuments(fields);
      case 'MongoDB':
        // Placeholder for MongoDB logic
        throw new Error('MongoDB not yet implemented.');
      default:
        throw new Error(`Unsupported database type: ${config.dbType}`);
    }
  }

  private async getFirestoreDocuments(fields: string[]): Promise<DocumentData[]> {
    if (!this.db) {
      throw new Error('Firestore is not initialized.');
    }

    let q = query(collection(this.db, this.collectionName));

    // Apply filters
    this.filters.forEach(f => {
      q = query(q, where(f.field, f.operator, f.value));
    });

    // Apply sorting
    if (this.sorting) {
      q = query(q, orderBy(this.sorting.field, this.sorting.direction));
    }
    
    // Apply limit
    if (this.limitCount !== null) {
      q = query(q, limit(this.limitCount));
    }

    // Offset is not directly supported in Firestore in the same way as SQL.
    // It requires using `startAt` with a document snapshot, which is more complex
    // and would require a "last seen document" to be passed around.
    // For simplicity, we are omitting a direct offset implementation for now.
    if (this.offsetCount) {
        console.warn("Offset is not directly supported and has been ignored. Consider using cursor-based pagination.");
    }

    const querySnapshot = await getDocs(q);
    const docs = querySnapshot.docs.map(doc => {
      const data = doc.data();
      if (fields.length === 0) {
        return { id: doc.id, ...data };
      }
      const selectedData: DocumentData = { id: doc.id };
      fields.forEach(field => {
        if (data[field] !== undefined) {
          selectedData[field] = data[field];
        }
      });
      return selectedData;
    });

    return docs;
  }

  // CUD Operations
  async add(data: DocumentData) {
     if (!this.db) throw new Error('Firestore is not initialized.');
     const docRef = await addDoc(collection(this.db, this.collectionName), data);
     return docRef.id;
  }

  async update(docId: string, data: DocumentData) {
     if (!this.db) throw new Error('Firestore is not initialized.');
     const docRef = doc(this.db, this.collectionName, docId);
     await updateDoc(docRef, data);
  }

  async delete(docId: string) {
     if (!this.db) throw new Error('Firestore is not initialized.');
     await deleteDoc(doc(this.db, this.collectionName, docId));
  }
}

// --- TOP-LEVEL API ---

export const Database = {
  collection: (collectionName: string) => {
    return new QueryBuilder(collectionName);
  }
};
