
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
  dbType: 'Firestore' | 'MongoDB' | 'SQL' | 'API';
  [key: string]: any;
}

let firestoreInstance: Firestore | null = null;
let appInstance: FirebaseApp | null = null;
let apiConfig: any = null;

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
    const parsedConfig = JSON.parse(configStr);
    if(parsedConfig.dbType === 'API') {
      apiConfig = parsedConfig;
    }
    return parsedConfig;
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
       case 'API':
        return this.getApiDocuments(fields);
      default:
        throw new Error(`Unsupported database type: ${config.dbType}`);
    }
  }

   private async getApiDocuments(fields: string[]): Promise<DocumentData[]> {
    if (!apiConfig) {
      throw new Error('API is not configured.');
    }
    
    const { basePath, getEndpoint, apiKey } = apiConfig;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    // For simplicity, this example assumes a GET request to a collection endpoint.
    // A full implementation would need to handle path parameters like {id}.
    const url = new URL(`${basePath}${getEndpoint}`);
    
    // Append filters as query parameters
    this.filters.forEach(f => url.searchParams.append(f.field, f.value));

    // Append sorting
    if (this.sorting) {
      url.searchParams.append('_sort', this.sorting.field);
      url.searchParams.append('_order', this.sorting.direction);
    }
    
    // Append limit
    if (this.limitCount) {
      url.searchParams.append('_limit', this.limitCount.toString());
    }

    // Append offset (page for json-server like APIs)
    if (this.offsetCount && this.limitCount) {
       url.searchParams.append('_page', (Math.floor(this.offsetCount / this.limitCount) + 1).toString());
    }

    const response = await fetch(url.toString(), { headers });
    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    let data = await response.json();

    // If API returns an array of objects
    if (Array.isArray(data) && fields.length > 0) {
      return data.map(item => {
        const selectedData: DocumentData = { id: item.id };
         fields.forEach(field => {
          if (item[field] !== undefined) {
            selectedData[field] = item[field];
          }
        });
        return selectedData;
      });
    }

    return Array.isArray(data) ? data : [data];
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
     const config = getDbConfig();
     if (!config) throw new Error('Database not configured');

     switch (config.dbType) {
        case 'Firestore':
            if (!this.db) throw new Error('Firestore is not initialized.');
            const docRef = await addDoc(collection(this.db, this.collectionName), data);
            return docRef.id;
        case 'API':
             if (!apiConfig) throw new Error('API is not configured.');
             const { basePath, createEndpoint, apiKey } = apiConfig;
             const headers: Record<string, string> = { 'Content-Type': 'application/json' };
             if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
             
             const response = await fetch(`${basePath}${createEndpoint}`, {
                method: 'POST',
                headers,
                body: JSON.stringify(data),
             });
             if (!response.ok) throw new Error(`API create failed: ${response.statusText}`);
             const result = await response.json();
             return result.id; // Assumes API returns the new object with an id
        default:
            throw new Error(`Unsupported database type for add: ${config.dbType}`);
     }
  }

  async update(docId: string, data: DocumentData) {
     const config = getDbConfig();
     if (!config) throw new Error('Database not configured');

     switch (config.dbType) {
        case 'Firestore':
            if (!this.db) throw new Error('Firestore is not initialized.');
            const docRef = doc(this.db, this.collectionName, docId);
            await updateDoc(docRef, data);
            break;
        case 'API':
             if (!apiConfig) throw new Error('API is not configured.');
             const { basePath, updateEndpoint, apiKey } = apiConfig;
             const headers: Record<string, string> = { 'Content-Type': 'application/json' };
             if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
             
             const url = `${basePath}${updateEndpoint.replace('{id}', docId)}`;
             
             const response = await fetch(url, {
                method: 'PUT', // or PATCH
                headers,
                body: JSON.stringify(data),
             });
             if (!response.ok) throw new Error(`API update failed: ${response.statusText}`);
             break;
        default:
            throw new Error(`Unsupported database type for update: ${config.dbType}`);
     }
  }

  async delete(docId: string) {
      const config = getDbConfig();
      if (!config) throw new Error('Database not configured');

      switch (config.dbType) {
        case 'Firestore':
            if (!this.db) throw new Error('Firestore is not initialized.');
            await deleteDoc(doc(this.db, this.collectionName, docId));
            break;
        case 'API':
             if (!apiConfig) throw new Error('API is not configured.');
             const { basePath, deleteEndpoint, apiKey } = apiConfig;
             const headers: Record<string, string> = {};
             if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
             
             const url = `${basePath}${deleteEndpoint.replace('{id}', docId)}`;
             
             const response = await fetch(url, { method: 'DELETE', headers });
             if (!response.ok) throw new Error(`API delete failed: ${response.statusText}`);
             break;
        default:
            throw new Error(`Unsupported database type for delete: ${config.dbType}`);
      }
  }
}

// --- TOP-LEVEL API ---

export const Database = {
  collection: (collectionName: string) => {
    return new QueryBuilder(collectionName);
  }
};

    