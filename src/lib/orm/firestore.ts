
'use server';
import {
  collection,
  query,
  getDocs,
  where,
  limit,
  orderBy,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  DocumentData,
  Firestore,
  startAfter,
  getDoc,
} from 'firebase/firestore';
import { getFirestoreInstance } from './config';

interface QueryOptions {
  collectionName: string;
  filters: { field: string; operator: any; value: any }[];
  limit: number | null;
  offset: number | null;
  sortBy: { field: string; direction: 'asc' | 'desc' } | null;
  fields: string[];
  connectionName?: string;
}

function getDb(connectionName?: string): Firestore {
  const db = getFirestoreInstance(connectionName ?? 'default');
  if (!db) {
    throw new Error('Firestore is not initialized. Check your .env file for Firestore credentials.');
  }
  return db;
}

export async function getDocuments(options: QueryOptions): Promise<DocumentData[]> {
  const db = getDb(options.connectionName);
  const { collectionName, filters, limit: limitCount, offset: offsetCount, sortBy, fields } = options;

  let q = query(collection(db, collectionName));

  filters.forEach(f => {
    q = query(q, where(f.field, f.operator, f.value));
  });

  if (sortBy) {
    q = query(q, orderBy(sortBy.field, sortBy.direction));
  }
  
  if (offsetCount && sortBy) {
      const lastVisibleDocSnapshot = await getDocs(query(collection(db, collectionName), orderBy(sortBy.field, sortBy.direction), limit(offsetCount)));
      if (lastVisibleDocSnapshot.docs.length > 0) {
        const lastDoc = lastVisibleDocSnapshot.docs[lastVisibleDocSnapshot.docs.length - 1];
        q = query(q, startAfter(lastDoc));
      }
  } else if (offsetCount) {
    console.warn("Offset without sortBy is not recommended and may lead to unexpected results. The query will proceed without an offset.");
  }


  if (limitCount !== null) {
    q = query(q, limit(limitCount));
  }

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => {
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
}

export async function addDocument(collectionName: string, data: DocumentData, connectionName?: string): Promise<string> {
  const db = getDb(connectionName);
  const docRef = await addDoc(collection(db, collectionName), data);
  return docRef.id;
}

export async function updateDocument(collectionName: string, docId: string, data: DocumentData, connectionName?: string): Promise<void> {
  const db = getDb(connectionName);
  const docRef = doc(db, collectionName, docId);
  await updateDoc(docRef, data);
}

export async function deleteDocument(collectionName: string, docId: string, connectionName?: string): Promise<void> {
  const db = getDb(connectionName);
  await deleteDoc(doc(db, collectionName, docId));
}
