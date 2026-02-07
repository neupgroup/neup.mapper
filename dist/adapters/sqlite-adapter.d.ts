import type { DbAdapter, QueryOptions, DocumentData } from '../orm/types.js';
export interface SQLiteConfig {
    filename: string;
    mode?: number;
}
/**
 * SQLite Database Adapter
 * Requires: npm install sqlite3
 */
export declare class SQLiteAdapter implements DbAdapter {
    private db;
    private sqlite3;
    constructor(config: SQLiteConfig);
    private run;
    private all;
    private getRow;
    private buildWhereClause;
    get(options: QueryOptions): Promise<DocumentData[]>;
    getOne(options: QueryOptions): Promise<DocumentData | null>;
    getDocuments(options: QueryOptions): Promise<DocumentData[]>;
    addDocument(collectionName: string, data: DocumentData): Promise<string>;
    updateDocument(collectionName: string, docId: string, data: DocumentData): Promise<void>;
    deleteDocument(collectionName: string, docId: string): Promise<void>;
    /**
     * Close the database connection
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
    commitTransaction(transaction: any): Promise<void>;
    /**
     * Rollback a transaction
     */
    rollbackTransaction(transaction: any): Promise<void>;
}
/**
 * Factory function to create SQLite adapter
 */
export declare function createSQLiteAdapter(config: SQLiteConfig): SQLiteAdapter;
