import type { DbAdapter, QueryOptions } from './types';

export function createOrm(adapter: DbAdapter) {
  return {
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

