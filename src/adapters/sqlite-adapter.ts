import type { DbAdapter, QueryOptions, DocumentData } from '../orm/types';

export interface SQLiteConfig {
    filename: string;
    mode?: number;
}

/**
 * SQLite Database Adapter
 * Requires: npm install sqlite3
 */
export class SQLiteAdapter implements DbAdapter {
    private db: any;
    private sqlite3: any;

    constructor(config: SQLiteConfig) {
        try {
            // Dynamically import sqlite3 to avoid bundling if not used
            this.sqlite3 = require('sqlite3').verbose();
            this.db = new this.sqlite3.Database(config.filename, config.mode);
        } catch (error: any) {
            throw new Error(
                `Failed to initialize SQLite adapter: ${error.message}\n` +
                `Make sure to install sqlite3: npm install sqlite3`
            );
        }
    }

    private run(sql: string, params: any[] = []): Promise<any> {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function (this: any, err: any) {
                if (err) reject(err);
                else resolve(this);
            });
        });
    }

    private all(sql: string, params: any[] = []): Promise<any[]> {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err: any, rows: any[]) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    private getRow(sql: string, params: any[] = []): Promise<any> {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err: any, row: any) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
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
                    conditions.push(`"${field}" ${operator} ?`);
                    values.push(value);
                    break;
                case 'LIKE':
                    conditions.push(`"${field}" LIKE ?`);
                    values.push(value);
                    break;
                case 'IN':
                    const placeholders = Array.isArray(value) ? value.map(() => '?').join(', ') : '?';
                    conditions.push(`"${field}" IN (${placeholders})`);
                    if (Array.isArray(value)) {
                        values.push(...value);
                    } else {
                        values.push(value);
                    }
                    break;
                default:
                    conditions.push(`"${field}" = ?`);
                    values.push(value);
            }
        }

        const sql = conditions.length > 0 ? conditions.join(' AND ') : '';
        return { sql, values };
    }

    async get(options: QueryOptions): Promise<DocumentData[]> {
        const fields = options.fields && options.fields.length > 0
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

        // Add ORDER BY
        if (options.sortBy) {
            sql += ` ORDER BY "${options.sortBy.field}" ${options.sortBy.direction.toUpperCase()}`;
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

        return this.all(sql, values);
    }

    async getOne(options: QueryOptions): Promise<DocumentData | null> {
        const results = await this.get({ ...options, limit: 1 });
        return results[0] || null;
    }

    async getDocuments(options: QueryOptions): Promise<DocumentData[]> {
        return this.get(options);
    }

    async addDocument(collectionName: string, data: DocumentData): Promise<string> {
        const fields = Object.keys(data);
        const placeholders = fields.map(() => '?').join(', ');
        const values = Object.values(data);

        const sql = `INSERT INTO "${collectionName}" (${fields.map(f => `"${f}"`).join(', ')}) VALUES (${placeholders})`;
        const result = await this.run(sql, values);

        return String(result.lastID);
    }

    async updateDocument(collectionName: string, docId: string, data: DocumentData): Promise<void> {
        const fields = Object.keys(data);
        const setClause = fields.map(f => `"${f}" = ?`).join(', ');
        const values = [...Object.values(data), docId];

        const sql = `UPDATE "${collectionName}" SET ${setClause} WHERE id = ?`;
        await this.run(sql, values);
    }

    async deleteDocument(collectionName: string, docId: string): Promise<void> {
        const sql = `DELETE FROM "${collectionName}" WHERE id = ?`;
        await this.run(sql, [docId]);
    }

    /**
     * Close the database connection
     */
    async close(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.db.close((err: any) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    /**
     * Execute a raw SQL query
     */
    async raw(sql: string, values?: any[]): Promise<any> {
        if (sql.trim().toUpperCase().startsWith('SELECT')) {
            return this.all(sql, values || []);
        } else {
            return this.run(sql, values || []);
        }
    }
}

/**
 * Factory function to create SQLite adapter
 */
export function createSQLiteAdapter(config: SQLiteConfig): SQLiteAdapter {
    return new SQLiteAdapter(config);
}
