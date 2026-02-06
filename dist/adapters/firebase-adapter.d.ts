import type { DbAdapter, QueryOptions, DocumentData } from '../orm/types.js';
export interface FirebaseConfig {
    /**
     * Path to service account JSON file or the object itself
     */
    serviceAccount?: string | Record<string, any>;
    /**
     * Project ID (optional if in serviceAccount)
     */
    projectId?: string;
    /**
     * Database URL (optional)
     */
    databaseURL?: string;
}
/**
 * Firebase (Firestore) Database Adapter
 * Requires: npm install firebase-admin
 */
export declare class FirebaseAdapter implements DbAdapter {
    private config;
    private admin;
    private db;
    private initialized;
    constructor(config: FirebaseConfig);
    private initialize;
    private buildQuery;
    get(options: QueryOptions): Promise<DocumentData[]>;
    getOne(options: QueryOptions): Promise<DocumentData | null>;
    getDocuments(options: QueryOptions): Promise<DocumentData[]>;
    addDocument(collectionName: string, data: DocumentData): Promise<string>;
    updateDocument(collectionName: string, docId: string, data: DocumentData): Promise<void>;
    deleteDocument(collectionName: string, docId: string): Promise<void>;
    /**
     * Execute a raw command or access internal instance
     * If query is 'instance', returns the Firestore instance.
     */
    raw(query: string, params?: any[]): Promise<any>;
    /**
     * Begin a transaction (WriteBatch)
     * Firestore transactions are callback-based, so we map this to a WriteBatch for atomic writes.
     * NOTE: This does not support read-modify-write patterns that require a real Transaction.
     */
    beginTransaction(): Promise<any>;
    /**
     * Commit a transaction (WriteBatch)
     */
    commitTransaction(batch: any): Promise<void>;
    /**
     * Rollback a transaction
     * For WriteBatch, we just discard it.
     */
    rollbackTransaction(batch: any): Promise<void>;
}
export declare function createFirebaseAdapter(config: FirebaseConfig): FirebaseAdapter;
