
'use server';

import type { DocumentData } from 'firebase/firestore';
import { createOrm, type DbAdapter, type QueryOptions } from '@neupgroup/mapper';
import { setDbConfig, listRuntimeConfigs, getDbConfig, clearDbConfig } from '@/lib/orm/config';
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

// Update an existing runtime DB config (override in-place)
export async function updateRuntimeDbConfig(config: any, name?: string) {
  if (!config || !config.dbType) {
    throw new Error('Invalid config: missing dbType');
  }
  const key = name ?? 'default';
  clearDbConfig(key);
  setDbConfig(config, key);
}

// Delete a named runtime DB config
export async function deleteRuntimeDbConfig(name: string) {
  if (!name) return;
  clearDbConfig(name);
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
    query?: Record<string, string>;
  },
  connectionName?: string
): Promise<DocumentData[]> {
  return getDocumentsOrm(collectionName, options, connectionName);
}

// New naming: get/getOne with connection
export async function getWithConnection(
  collectionName: string,
  options: {
    filters: any[];
    limit: number | null;
    offset: number | null;
    sortBy: any | null;
    fields: string[];
    query?: Record<string, string>;
  },
  connectionName?: string
): Promise<DocumentData[]> {
  // Internally delegates to existing implementation for now
  return getDocumentsOrm(collectionName, options, connectionName);
}

export async function getOneWithConnection(
  collectionName: string,
  options: {
    filters: any[];
    limit: number | null;
    offset: number | null;
    sortBy: any | null;
    fields: string[];
  },
  connectionName?: string
): Promise<DocumentData | null> {
  const results = await getDocumentsOrm(collectionName, options, connectionName);
  return Array.isArray(results) && results.length > 0 ? results[0] : null;
}

export async function addDocumentWithConnection(
  collectionName: string,
  data: DocumentData,
  connectionName?: string,
  requestOptions?: { bodyType?: 'json' | 'form' | 'urlencoded'; query?: Record<string, string> }
): Promise<string> {
  return addDocumentOrm(collectionName, data, connectionName, requestOptions as any);
}

export async function updateDocumentWithConnection(
  collectionName: string,
  docId: string,
  data: DocumentData,
  connectionName?: string,
  requestOptions?: { bodyType?: 'json' | 'form' | 'urlencoded'; query?: Record<string, string>; method?: 'PUT' | 'PATCH' }
): Promise<void> {
  return updateDocumentOrm(collectionName, docId, data, connectionName, requestOptions as any);
}

export async function deleteDocumentWithConnection(
  collectionName: string,
  docId: string,
  connectionName?: string,
  requestOptions?: { query?: Record<string, string> }
): Promise<void> {
  return deleteDocumentOrm(collectionName, docId, connectionName, requestOptions as any);
}

export async function listConnections(): Promise<string[]> {
  // Include runtime-registered connections and add 'default' when env config exists
  const names = listRuntimeConfigs();
  const defaultCfg = getDbConfig('default');
  if (defaultCfg && !names.includes('default')) {
    return ['default', ...names];
  }
  return names;
}

// Retrieve the current runtime configuration for a named connection
export async function getRuntimeDbConfig(name?: string): Promise<any | null> {
  return getDbConfig(name ?? 'default');
}
