
'use server';

import { getDbConfig } from './orm/config';
import * as firestoreAdapter from './orm/firestore';
import * as apiAdapter from './orm/api';
import * as mysqlAdapter from './orm/mysql';
import * as mongoAdapter from './orm/mongodb';
import { DocumentData } from 'firebase/firestore';

function getAdapter(connectionName?: string) {
  const config = getDbConfig(connectionName ?? 'default');
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
      return mongoAdapter;
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
  },
  connectionName?: string
): Promise<DocumentData[]> {
  const adapter = getAdapter(connectionName);
  return adapter.getDocuments({
    collectionName,
    ...options,
    connectionName,
  });
}

export async function addDocument(collectionName: string, data: DocumentData, connectionName?: string): Promise<string> {
  const adapter = getAdapter(connectionName);
  return adapter.addDocument(collectionName, data, connectionName);
}

export async function updateDocument(
  collectionName: string,
  docId: string,
  data: DocumentData,
  connectionName?: string
): Promise<void> {
  const adapter = getAdapter(connectionName);
  return adapter.updateDocument(collectionName, docId, data, connectionName);
}

export async function deleteDocument(collectionName: string, docId: string, connectionName?: string): Promise<void> {
  const adapter = getAdapter(connectionName);
  return adapter.deleteDocument(collectionName, docId, connectionName);
}
