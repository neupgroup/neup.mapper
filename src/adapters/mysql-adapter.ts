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
export class MySQLAdapter implements DbAdapter {
    private pool: any;
    private mysql: any;

    constructor(config: MySQLConfig) {
        try {
            // Dynamically import mysql2 to avoid bundling if not used
            this.mysql = require('mysql2/promise');
            this.pool = this.mysql.createPool({
                host: config.host,
                port: config.port || 3306,
                user: config.user,
                password: config.password,
                database: config.database,
                waitForConnections: true,
                connectionLimit: config.connectionLimit || 10,
                queueLimit: 0,
                ssl: config.ssl,
            });
        } catch (error: any) {
            throw new Error(
                `Failed to initialize MySQL adapter: ${error.message}\n` +
                `Make sure to install mysql2: npm install mysql2`
            );
        }
    }

    private buildWhereClause(options: QueryOptions): { sql: string; values: any[] } {
        const values: any[] = [];
        const conditions: string[] = [];

        // Handle raw WHERE clause
        if (options.rawWhere) {
            return { sql: options.rawWhere, values: [] };
        }

        // Build WHERE conditions from filters
        for (const filter of options.filters) {
            const { field, operator, value } = filter;

            switch (operator) {
                case '=':
                case '>':
                case '<':
                case '>=':
                case '<=':
                case '!=':
                    conditions.push(`\`${field}\` ${operator} ?`);
                    values.push(value);
                    break;
                case 'LIKE':
                    conditions.push(`\`${field}\` LIKE ?`);
                    values.push(value);
                    break;
                case 'IN':
                    conditions.push(`\`${field}\` IN (?)`);
                    values.push(value);
                    break;
                default:
                    conditions.push(`\`${field}\` = ?`);
                    values.push(value);
            }
        }

        const sql = conditions.length > 0 ? conditions.join(' AND ') : '';
        return { sql, values };
    }

    async get(options: QueryOptions): Promise<DocumentData[]> {
        const connection = await this.pool.getConnection();
        try {
            const fields = options.fields.length > 0
                ? options.fields.map(f => `\`${f}\``).join(', ')
                : '*';

            let sql = `SELECT ${fields} FROM \`${options.collectionName}\``;
            const values: any[] = [];

            // Add WHERE clause
            const { sql: whereSql, values: whereValues } = this.buildWhereClause(options);
            if (whereSql) {
                sql += ` WHERE ${whereSql}`;
                values.push(...whereValues);
            }

            // Add ORDER BY
            if (options.sortBy) {
                sql += ` ORDER BY \`${options.sortBy.field}\` ${options.sortBy.direction.toUpperCase()}`;
            }

            // Add LIMIT and OFFSET
            if (options.limit !== null) {
                sql += ` LIMIT ?`;
                values.push(options.limit);
            }
            if (options.offset !== null) {
                sql += ` OFFSET ?`;
                values.push(options.offset);
            }

            const [rows] = await connection.execute(sql, values);
            return rows as DocumentData[];
        } finally {
            connection.release();
        }
    }

    async getOne(options: QueryOptions): Promise<DocumentData | null> {
        const results = await this.get({ ...options, limit: 1 });
        return results[0] || null;
    }

    async getDocuments(options: QueryOptions): Promise<DocumentData[]> {
        return this.get(options);
    }

    async addDocument(collectionName: string, data: DocumentData): Promise<string> {
        const connection = await this.pool.getConnection();
        try {
            const fields = Object.keys(data);
            const placeholders = fields.map(() => '?').join(', ');
            const values = Object.values(data);

            const sql = `INSERT INTO \`${collectionName}\` (${fields.map(f => `\`${f}\``).join(', ')}) VALUES (${placeholders})`;
            const [result] = await connection.execute(sql, values);

            return String((result as any).insertId);
        } finally {
            connection.release();
        }
    }

    async updateDocument(collectionName: string, docId: string, data: DocumentData): Promise<void> {
        const connection = await this.pool.getConnection();
        try {
            const fields = Object.keys(data);
            const setClause = fields.map(f => `\`${f}\` = ?`).join(', ');
            const values = [...Object.values(data), docId];

            const sql = `UPDATE \`${collectionName}\` SET ${setClause} WHERE id = ?`;
            await connection.execute(sql, values);
        } finally {
            connection.release();
        }
    }

    async deleteDocument(collectionName: string, docId: string): Promise<void> {
        const connection = await this.pool.getConnection();
        try {
            const sql = `DELETE FROM \`${collectionName}\` WHERE id = ?`;
            await connection.execute(sql, [docId]);
        } finally {
            connection.release();
        }
    }

    /**
     * Close all connections in the pool
     */
    async close(): Promise<void> {
        await this.pool.end();
    }

    /**
     * Execute a raw SQL query
     */
    async raw(sql: string, values?: any[], options?: { transaction?: any }): Promise<any> {
        const connection = options?.transaction || await this.pool.getConnection();
        try {
            const [results] = await connection.execute(sql, values || []);
            return results;
        } finally {
            if (!options?.transaction) {
                connection.release();
            }
        }
    }

    /**
     * Begin a transaction
     */
    async beginTransaction(): Promise<any> {
        const connection = await this.pool.getConnection();
        await connection.beginTransaction();
        return connection;
    }

    /**
     * Commit a transaction
     */
    async commitTransaction(connection: any): Promise<void> {
        try {
            await connection.commit();
        } finally {
            connection.release();
        }
    }

    /**
     * Rollback a transaction
     */
    async rollbackTransaction(connection: any): Promise<void> {
        try {
            await connection.rollback();
        } finally {
            connection.release();
        }
    }
}

/**
 * Factory function to create MySQL adapter
 */
export function createMySQLAdapter(config: MySQLConfig): MySQLAdapter {
    return new MySQLAdapter(config);
}
