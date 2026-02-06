import type { DbAdapter, QueryOptions, DocumentData } from '../orm/types';
export interface MySQLConfig {
    host: string;
    port?: number;
    user: string;
    password: string;
    database: string;
    connectionLimit?: number;
    ssl?: boolean;
}
/**
 * MySQL Database Adapter
 * Requires: npm install mysql2
 */
export declare class MySQLAdapter implements DbAdapter {
    private pool;
    private mysql;
    constructor(config: MySQLConfig);
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
    raw(sql: string, values?: any[]): Promise<any>;
    /**
     * Begin a transaction
     */
    beginTransaction(): Promise<any>;
    /**
     * Commit a transaction
     */
    commitTransaction(connection: any): Promise<void>;
    /**
     * Rollback a transaction
     */
    rollbackTransaction(connection: any): Promise<void>;
}
/**
 * Factory function to create MySQL adapter
 */
export declare function createMySQLAdapter(config: MySQLConfig): MySQLAdapter;
