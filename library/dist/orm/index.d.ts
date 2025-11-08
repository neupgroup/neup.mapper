import type { DbAdapter, QueryOptions } from './types';
export declare function createOrm(adapter: DbAdapter): {
    get(options: QueryOptions): Promise<import("@firebase/firestore").DocumentData[]>;
    getOne(options: QueryOptions): Promise<any>;
    getDocuments(options: QueryOptions): Promise<import("@firebase/firestore").DocumentData[]>;
    addDocument(collectionName: string, data: Record<string, any>): Promise<string>;
    updateDocument(collectionName: string, docId: string, data: Record<string, any>): Promise<void>;
    deleteDocument(collectionName: string, docId: string): Promise<void>;
};
export type { DbAdapter, QueryOptions };
