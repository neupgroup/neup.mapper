import type { DbAdapter, QueryOptions } from './types.js';

export function createOrm(adapter: DbAdapter) {
  return {
    async get(options: QueryOptions) {
      if (adapter.get) return adapter.get(options);
      return adapter.getDocuments(options);
    },
    async getOne(options: QueryOptions) {
      if (adapter.getOne) return adapter.getOne(options);
      const arr = adapter.get ? await adapter.get(options) : await adapter.getDocuments(options);
      return (arr as any[])[0] ?? null;
    },
    async getDocuments(options: QueryOptions) {
      return adapter.getDocuments(options);
    },
    async addDocument(collectionName: string, data: Record<string, any>) {
      return adapter.addDocument(collectionName, data);
    },
    async updateDocument(collectionName: string, docId: string, data: Record<string, any>) {
      return adapter.updateDocument(collectionName, docId, data);
    },
    async deleteDocument(collectionName: string, docId: string) {
      return adapter.deleteDocument(collectionName, docId);
    },
  };
}

export type { DbAdapter, QueryOptions };

