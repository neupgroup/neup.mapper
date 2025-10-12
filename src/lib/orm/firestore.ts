
'use client';
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
} from 'firebase/firestore';
import { getFirestoreInstance } from './config';

interface QueryOptions {
  collectionName: string;
  filters: { field: string; operator: any; value: any }[];
  limit: number | null;
  offset: number | null;
  sortBy: { field: string; direction: 'asc' | 'desc' } | null;
  fields: string[];
}

function getDb(): Firestore {
  const db = getFirestoreInstance();
  if (!db) {
    throw new Error('Firestore is not initialized.');
  }
  return db;
}

export async function getDocuments(options: QueryOptions): Promise<DocumentData[]> {
  const db = getDb();
  const { collectionName, filters, limit: limitCount, offset: offsetCount, sortBy, fields } = options;

  let q = query(collection(db, collectionName));

  filters.forEach(f => {
    q = query(q, where(f.field, f.operator, f.value));
  });

  if (sortBy) {
    q = query(q, orderBy(sortBy.field, sortBy.direction));
  }

  if (limitCount !== null) {
    q = query(q, limit(limitCount));
  }

  if (offsetCount) {
    console.warn("Offset is not directly supported and has been ignored. Consider using cursor-based pagination.");
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

export async function addDocument(collectionName: string, data: DocumentData): Promise<string> {
  const db = getDb();
  const docRef = await addDoc(collection(db, collectionName), data);
  return docRef.id;
}

export async function updateDocument(collectionName: string, docId: string, data: DocumentData): Promise<void> {
  const db = getDb();
  const docRef = doc(db, collectionName, docId);
  await updateDoc(docRef, data);
}

export async function deleteDocument(collectionName: string, docId: string): Promise<void> {
  const db = getDb();
  await deleteDoc(doc(db, collectionName, docId));
}
