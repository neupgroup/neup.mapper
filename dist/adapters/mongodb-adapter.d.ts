import type { DbAdapter, QueryOptions, DocumentData } from '../orm/types';
export interface MongoDBConfig {
    uri: string;
    database: string;
    options?: {
        maxPoolSize?: number;
        minPoolSize?: number;
        serverSelectionTimeoutMS?: number;
    };
}
/**
 * MongoDB Database Adapter
 * Requires: npm install mongodb
 */
export declare class MongoDBAdapter implements DbAdapter {
    private config;
    private client;
    private db;
    private mongodb;
    constructor(config: MongoDBConfig);
    /**
     * Connect to MongoDB
     */
    connect(): Promise<void>;
    /**
     * Ensure connection is established
     */
    private ensureConnected;
    private buildMongoQuery;
    get(options: QueryOptions): Promise<DocumentData[]>;
    getOne(options: QueryOptions): Promise<DocumentData | null>;
    getDocuments(options: QueryOptions): Promise<DocumentData[]>;
    addDocument(collectionName: string, data: DocumentData): Promise<string>;
    updateDocument(collectionName: string, docId: string, data: DocumentData): Promise<void>;
    deleteDocument(collectionName: string, docId: string): Promise<void>;
    /**
     * Close the MongoDB connection
     */
    close(): Promise<void>;
    /**
     * Execute aggregation pipeline
     */
    aggregate(collectionName: string, pipeline: any[]): Promise<DocumentData[]>;
    /**
     * Create an index
     */
    createIndex(collectionName: string, fields: any, options?: any): Promise<string>;
    /**
     * Get collection statistics
     */
    getStats(collectionName: string): Promise<any>;
    raw(query: string, params?: any[], options?: {
        transaction?: any;
    }): Promise<any>;
    /**
     * Begin a transaction
     */
    beginTransaction(): Promise<any>;
    /**
     * Commit a transaction
     */
    commitTransaction(session: any): Promise<void>;
    /**
     * Rollback a transaction
     */
    rollbackTransaction(session: any): Promise<void>;
}
/**
 * Factory function to create MongoDB adapter
 */
export declare function createMongoDBAdapter(config: MongoDBConfig): MongoDBAdapter;
