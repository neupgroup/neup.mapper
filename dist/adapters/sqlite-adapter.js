/**
 * SQLite Database Adapter
 * Requires: npm install sqlite3
 */
export class SQLiteAdapter {
    constructor(config) {
        try {
            // Dynamically import sqlite3 to avoid bundling if not used
            this.sqlite3 = require('sqlite3').verbose();
            this.db = new this.sqlite3.Database(config.filename, config.mode);
        }
        catch (error) {
            throw new Error(`Failed to initialize SQLite adapter: ${error.message}\n` +
                `Make sure to install sqlite3: npm install sqlite3`);
        }
    }
    run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function (err) {
                if (err)
                    reject(err);
                else
                    resolve(this);
            });
        });
    }
    all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err)
                    reject(err);
                else
                    resolve(rows);
            });
        });
    }
    getRow(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err)
                    reject(err);
                else
                    resolve(row);
            });
        });
    }
    buildWhereClause(options) {
        const values = [];
        const conditions = [];
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
                    }
                    else {
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
    async get(options) {
        const fields = options.fields && options.fields.length > 0
            ? options.fields.map(f => `"${f}"`).join(', ')
            : '*';
        let sql = `SELECT ${fields} FROM "${options.collectionName}"`;
        const values = [];
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
    async getOne(options) {
        const results = await this.get({ ...options, limit: 1 });
        return results[0] || null;
    }
    async getDocuments(options) {
        return this.get(options);
    }
    async addDocument(collectionName, data) {
        const fields = Object.keys(data);
        const placeholders = fields.map(() => '?').join(', ');
        const values = Object.values(data);
        const sql = `INSERT INTO "${collectionName}" (${fields.map(f => `"${f}"`).join(', ')}) VALUES (${placeholders})`;
        const result = await this.run(sql, values);
        return String(result.lastID);
    }
    async updateDocument(collectionName, docId, data) {
        const fields = Object.keys(data);
        const setClause = fields.map(f => `"${f}" = ?`).join(', ');
        const values = [...Object.values(data), docId];
        const sql = `UPDATE "${collectionName}" SET ${setClause} WHERE id = ?`;
        await this.run(sql, values);
    }
    async deleteDocument(collectionName, docId) {
        const sql = `DELETE FROM "${collectionName}" WHERE id = ?`;
        await this.run(sql, [docId]);
    }
    /**
     * Close the database connection
     */
    async close() {
        return new Promise((resolve, reject) => {
            this.db.close((err) => {
                if (err)
                    reject(err);
                else
                    resolve();
            });
        });
    }
    /**
     * Execute a raw SQL query
     */
    async raw(sql, values) {
        if (sql.trim().toUpperCase().startsWith('SELECT')) {
            return this.all(sql, values || []);
        }
        else {
            return this.run(sql, values || []);
        }
    }
}
/**
 * Factory function to create SQLite adapter
 */
export function createSQLiteAdapter(config) {
    return new SQLiteAdapter(config);
}
