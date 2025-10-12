
'use server';

import { getDbConfig } from './orm/config';
import * as firestoreAdapter from './orm/firestore';
import * as apiAdapter from './orm/api';
import * as mysqlAdapter from './orm/mysql';
import { DocumentData } from 'firebase/firestore';

function getAdapter() {
  const config = getDbConfig();
  if (!config) {
    throw new Error('Database not configured. Please set up your .env file.');
  }
  switch (config.dbType) {
    case 'Firestore':
      return firestoreAdapter;
    case 'API':
      return apiAdapter;
    case 'SQL':
      return mysqlAdapter;
    case 'MongoDB':
      throw new Error('MongoDB not yet implemented.');
    default:
      throw new Error(`Unsupported database type: ${config.dbType}`);
  }
}

export async function getDocuments(
  collectionName: string,
  options: {
    filters: any[];
    limit: number | null;
    offset: number | null;
    sortBy: any | null;
    fields: string[];
  }
): Promise<DocumentData[]> {
  const adapter = getAdapter();
  return adapter.getDocuments({
    collectionName,
    ...options,
  });
}

export async function addDocument(collectionName: string, data: DocumentData): Promise<string> {
  const adapter = getAdapter();
  return adapter.addDocument(collectionName, data);
}

export async function updateDocument(collectionName: string, docId: string, data: DocumentData): Promise<void> {
  const adapter = getAdapter();
  return adapter.updateDocument(collectionName, docId, data);
}

export async function deleteDocument(collectionName: string, docId: string): Promise<void> {
  const adapter = getAdapter();
  return adapter.deleteDocument(collectionName, docId);
}
