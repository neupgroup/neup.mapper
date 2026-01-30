import type { DbAdapter, QueryOptions } from './types.js';
export declare function createOrm(adapter: DbAdapter): {
    get(options: QueryOptions): Promise<import("./types.js").DocumentData[]>;
    getOne(options: QueryOptions): Promise<any>;
    getDocuments(options: QueryOptions): Promise<import("./types.js").DocumentData[]>;
    addDocument(collectionName: string, data: Record<string, any>): Promise<string>;
    updateDocument(collectionName: string, docId: string, data: Record<string, any>): Promise<void>;
    deleteDocument(collectionName: string, docId: string): Promise<void>;
};
export type { DbAdapter, QueryOptions };
