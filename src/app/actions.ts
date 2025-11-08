
'use server';

import type { DocumentData } from 'firebase/firestore';
import { createOrm, type DbAdapter, type QueryOptions } from '@neupgroup/mapper';
import { setDbConfig, listRuntimeConfigs, getDbConfig } from '@/lib/orm/config';
import {
  getDocuments as getDocumentsOrm,
  addDocument as addDocumentOrm,
  updateDocument as updateDocumentOrm,
  deleteDocument as deleteDocumentOrm,
} from '@/lib/orm';

const adapter: DbAdapter = {
  async getDocuments(options: QueryOptions) {
    const { collectionName, ...rest } = options as any;
    return getDocumentsOrm(collectionName, rest);
  },
  async addDocument(collectionName: string, data: DocumentData) {
    return addDocumentOrm(collectionName, data);
  },
  async updateDocument(collectionName: string, docId: string, data: DocumentData) {
    return updateDocumentOrm(collectionName, docId, data);
  },
  async deleteDocument(collectionName: string, docId: string) {
    return deleteDocumentOrm(collectionName, docId);
  },
};

const orm = createOrm(adapter);

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
  return orm.getDocuments({ collectionName, ...options } as QueryOptions);
}

export async function addDocument(collectionName: string, data: DocumentData): Promise<string> {
  return orm.addDocument(collectionName, data);
}

export async function updateDocument(collectionName: string, docId: string, data: DocumentData): Promise<void> {
  return orm.updateDocument(collectionName, docId, data);
}

export async function deleteDocument(collectionName: string, docId: string): Promise<void> {
  return orm.deleteDocument(collectionName, docId);
}

// Allow programmatic override of runtime DB config
export async function setRuntimeDbConfig(config: any, name?: string) {
  // Basic validation: require dbType
  if (!config || !config.dbType) {
    throw new Error('Invalid config: missing dbType');
  }
  setDbConfig(config, name ?? 'default');
}

// Named connection variants using local ORM directly
export async function getDocumentsWithConnection(
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
  return getDocumentsOrm(collectionName, options, connectionName);
}

export async function addDocumentWithConnection(
  collectionName: string,
  data: DocumentData,
  connectionName?: string
): Promise<string> {
  return addDocumentOrm(collectionName, data, connectionName);
}

export async function updateDocumentWithConnection(
  collectionName: string,
  docId: string,
  data: DocumentData,
  connectionName?: string
): Promise<void> {
  return updateDocumentOrm(collectionName, docId, data, connectionName);
}

export async function deleteDocumentWithConnection(
  collectionName: string,
  docId: string,
  connectionName?: string
): Promise<void> {
  return deleteDocumentOrm(collectionName, docId, connectionName);
}

export async function listConnections(): Promise<string[]> {
  return listRuntimeConfigs();
}

// Retrieve the current runtime configuration for a named connection
export async function getRuntimeDbConfig(name?: string): Promise<any | null> {
  return getDbConfig(name ?? 'default');
}
