import type { DbAdapter, QueryOptions, DocumentData } from '../orm/types';
export interface PostgreSQLConfig {
    host: string;
    port?: number;
    user: string;
    password: string;
    database: string;
    max?: number;
    ssl?: boolean | {
        rejectUnauthorized?: boolean;
    };
}
/**
 * PostgreSQL Database Adapter
 * Requires: npm install pg
 */
export declare class PostgreSQLAdapter implements DbAdapter {
    private pool;
    private pg;
    constructor(config: PostgreSQLConfig);
    private buildWhereClause;
    get(options: QueryOptions): Promise<DocumentData[]>;
    getOne(options: QueryOptions): Promise<DocumentData | null>;
    getDocuments(options: QueryOptions): Promise<DocumentData[]>;
    addDocument(collectionName: string, data: DocumentData): Promise<string>;
    updateDocument(collectionName: string, docId: string, data: DocumentData): Promise<void>;
    deleteDocument(collectionName: string, docId: string): Promise<void>;
    /**
     * Close all connections in the pool
     */
    close(): Promise<void>;
    /**
     * Execute a raw SQL query
     */
    raw(sql: string, values?: any[], options?: {
        transaction?: any;
    }): Promise<any>;
    /**
     * Begin a transaction
     */
    beginTransaction(): Promise<any>;
    /**
     * Commit a transaction
     */
    commitTransaction(client: any): Promise<void>;
    /**
     * Rollback a transaction
     */
    rollbackTransaction(client: any): Promise<void>;
}
/**
 * Factory function to create PostgreSQL adapter
 */
export declare function createPostgreSQLAdapter(config: PostgreSQLConfig): PostgreSQLAdapter;
