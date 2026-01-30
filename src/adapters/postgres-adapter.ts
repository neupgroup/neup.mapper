import type { DbAdapter, QueryOptions, DocumentData } from '../orm/types';

export interface PostgreSQLConfig {
    host: string;
    port?: number;
    user: string;
    password: string;
    database: string;
    max?: number; // Maximum pool size
    ssl?: boolean | { rejectUnauthorized?: boolean };
}

/**
 * PostgreSQL Database Adapter
 * Requires: npm install pg
 */
export class PostgreSQLAdapter implements DbAdapter {
    private pool: any;
    private pg: any;

    constructor(config: PostgreSQLConfig) {
        try {
            // Dynamically import pg to avoid bundling if not used
            this.pg = require('pg');
            this.pool = new this.pg.Pool({
                host: config.host,
                port: config.port || 5432,
                user: config.user,
                password: config.password,
                database: config.database,
                max: config.max || 10,
                ssl: config.ssl,
            });
        } catch (error: any) {
            throw new Error(
                `Failed to initialize PostgreSQL adapter: ${error.message}\n` +
                `Make sure to install pg: npm install pg`
            );
        }
    }

    private buildWhereClause(options: QueryOptions): { sql: string; values: any[] } {
        const values: any[] = [];
        const conditions: string[] = [];
        let paramIndex = 1;

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
                    conditions.push(`"${field}" ${operator} $${paramIndex}`);
                    values.push(value);
                    paramIndex++;
                    break;
                case 'LIKE':
                case 'ILIKE':
                    conditions.push(`"${field}" ${operator} $${paramIndex}`);
                    values.push(value);
                    paramIndex++;
                    break;
                case 'IN':
                    conditions.push(`"${field}" = ANY($${paramIndex})`);
                    values.push(Array.isArray(value) ? value : [value]);
                    paramIndex++;
                    break;
                default:
                    conditions.push(`"${field}" = $${paramIndex}`);
                    values.push(value);
                    paramIndex++;
            }
        }

        const sql = conditions.length > 0 ? conditions.join(' AND ') : '';
        return { sql, values };
    }

    async get(options: QueryOptions): Promise<DocumentData[]> {
        const client = await this.pool.connect();
        try {
            const fields = options.fields.length > 0
                ? options.fields.map(f => `"${f}"`).join(', ')
                : '*';

            let sql = `SELECT ${fields} FROM "${options.collectionName}"`;
            const values: any[] = [];

            // Add WHERE clause
            const { sql: whereSql, values: whereValues } = this.buildWhereClause(options);
            if (whereSql) {
                sql += ` WHERE ${whereSql}`;
                values.push(...whereValues);
            }

            let paramIndex = values.length + 1;

            // Add ORDER BY
            if (options.sortBy) {
                sql += ` ORDER BY "${options.sortBy.field}" ${options.sortBy.direction.toUpperCase()}`;
            }

            // Add LIMIT and OFFSET
            if (options.limit !== null) {
                sql += ` LIMIT $${paramIndex}`;
                values.push(options.limit);
                paramIndex++;
            }
            if (options.offset !== null) {
                sql += ` OFFSET $${paramIndex}`;
                values.push(options.offset);
                paramIndex++;
            }

            const result = await client.query(sql, values);
            return result.rows as DocumentData[];
        } finally {
            client.release();
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
        const client = await this.pool.connect();
        try {
            const fields = Object.keys(data);
            const values = Object.values(data);
            const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');

            const sql = `INSERT INTO "${collectionName}" (${fields.map(f => `"${f}"`).join(', ')}) VALUES (${placeholders}) RETURNING id`;
            const result = await client.query(sql, values);

            return String(result.rows[0]?.id || '');
        } finally {
            client.release();
        }
    }

    async updateDocument(collectionName: string, docId: string, data: DocumentData): Promise<void> {
        const client = await this.pool.connect();
        try {
            const fields = Object.keys(data);
            const values = Object.values(data);
            const setClause = fields.map((f, i) => `"${f}" = $${i + 1}`).join(', ');

            const sql = `UPDATE "${collectionName}" SET ${setClause} WHERE id = $${fields.length + 1}`;
            await client.query(sql, [...values, docId]);
        } finally {
            client.release();
        }
    }

    async deleteDocument(collectionName: string, docId: string): Promise<void> {
        const client = await this.pool.connect();
        try {
            const sql = `DELETE FROM "${collectionName}" WHERE id = $1`;
            await client.query(sql, [docId]);
        } finally {
            client.release();
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
    async raw(sql: string, values?: any[]): Promise<any> {
        const client = await this.pool.connect();
        try {
            const result = await client.query(sql, values || []);
            return result.rows;
        } finally {
            client.release();
        }
    }

    /**
     * Begin a transaction
     */
    async beginTransaction(): Promise<any> {
        const client = await this.pool.connect();
        await client.query('BEGIN');
        return client;
    }

    /**
     * Commit a transaction
     */
    async commitTransaction(client: any): Promise<void> {
        try {
            await client.query('COMMIT');
        } finally {
            client.release();
        }
    }

    /**
     * Rollback a transaction
     */
    async rollbackTransaction(client: any): Promise<void> {
        try {
            await client.query('ROLLBACK');
        } finally {
            client.release();
        }
    }
}

/**
 * Factory function to create PostgreSQL adapter
 */
export function createPostgreSQLAdapter(config: PostgreSQLConfig): PostgreSQLAdapter {
    return new PostgreSQLAdapter(config);
}
