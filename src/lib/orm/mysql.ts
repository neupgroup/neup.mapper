
'use server';
import { DocumentData } from 'firebase/firestore';
import { getDbConfig } from './config';
import mysql from 'mysql2/promise';

interface QueryOptions {
  collectionName: string;
  filters: { field: string; operator: string; value: any }[];
  limit: number | null;
  offset: number | null;
  sortBy: { field: string; direction: 'asc' | 'desc' } | null;
  fields: string[];
  connectionName?: string;
}

async function getConnection(connectionName?: string) {
    const config = getDbConfig(connectionName ?? 'default');
    if (config?.dbType !== 'SQL') {
        throw new Error('SQL database is not configured in environment variables.');
    }
    return await mysql.createConnection({
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password,
        database: config.database,
    });
}

export async function getDocuments(options: QueryOptions): Promise<DocumentData[]> {
    const connection = await getConnection(options.connectionName);
    try {
        const { collectionName, filters, limit, offset, sortBy, fields } = options;
        const selectFields = fields.length > 0 ? fields.join(', ') : '*';
        
        let sql = `SELECT ${selectFields} FROM \`${collectionName}\``;
        const queryParams: any[] = [];

        if (filters.length > 0) {
            sql += ' WHERE ';
            sql += filters.map(f => {
                queryParams.push(f.value);
                return `\`${f.field}\` ${f.operator} ?`;
            }).join(' AND ');
        }

        if (sortBy) {
            sql += ` ORDER BY \`${sortBy.field}\` ${sortBy.direction.toUpperCase()}`;
        }

        if (limit !== null) {
            sql += ' LIMIT ?';
            queryParams.push(limit);
        }

        if (offset !== null) {
            sql += ' OFFSET ?';
            queryParams.push(offset);
        }
        
        const [rows] = await connection.execute(sql, queryParams);
        return rows as DocumentData[];
    } finally {
        await connection.end();
    }
}

export async function addDocument(collectionName: string, data: DocumentData, connectionName?: string): Promise<string> {
    const connection = await getConnection(connectionName);
    try {
        const fields = Object.keys(data);
        const placeholders = fields.map(() => '?').join(', ');
        const values = Object.values(data);
        const sql = `INSERT INTO \`${collectionName}\` (\`${fields.join('`, `')}\`) VALUES (${placeholders})`;

        const [result] = await connection.execute(sql, values);
        return (result as any).insertId.toString();
    } finally {
        await connection.end();
    }
}

export async function updateDocument(collectionName: string, docId: string, data: DocumentData, connectionName?: string): Promise<void> {
    const connection = await getConnection(connectionName);
    try {
        const fields = Object.keys(data);
        const setClauses = fields.map(field => `\`${field}\` = ?`).join(', ');
        const values = [...Object.values(data), docId];
        const sql = `UPDATE \`${collectionName}\` SET ${setClauses} WHERE id = ?`;

        await connection.execute(sql, values);
    } finally {
        await connection.end();
    }
}

export async function deleteDocument(collectionName: string, docId: string, connectionName?: string): Promise<void> {
    const connection = await getConnection(connectionName);
    try {
        const sql = `DELETE FROM \`${collectionName}\` WHERE id = ?`;
        await connection.execute(sql, [docId]);
    } finally {
        await connection.end();
    }
}
