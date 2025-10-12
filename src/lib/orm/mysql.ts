
'use client';
import { DocumentData } from 'firebase/firestore';

interface QueryOptions {
  collectionName: string;
  filters: { field: string; operator: any; value: any }[];
  limit: number | null;
  offset: number | null;
  sortBy: { field: string; direction: 'asc' | 'desc' } | null;
  fields: string[];
}

const notImplementedError = 'Direct client-side SQL connection is not secure. This operation should be handled by a backend API.';

export async function getDocuments(options: QueryOptions): Promise<DocumentData[]> {
  console.error(notImplementedError, options);
  throw new Error(notImplementedError);
}

export async function addDocument(collectionName: string, data: DocumentData): Promise<string> {
  console.error(notImplementedError, { collectionName, data });
  throw new Error(notImplementedError);
}

export async function updateDocument(collectionName: string, docId: string, data: DocumentData): Promise<void> {
  console.error(notImplementedError, { collectionName, docId, data });
  throw new Error(notImplementedError);
}

export async function deleteDocument(collectionName: string, docId: string): Promise<void> {
  console.error(notImplementedError, { collectionName, docId });
  throw new Error(notImplementedError);
}
