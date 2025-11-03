
'use server';

import type { DocumentData } from 'firebase/firestore';
import { createOrm, type DbAdapter, type QueryOptions } from '@neupgroup/mapper';
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
