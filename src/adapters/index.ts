// Export all adapters
export { MySQLAdapter, createMySQLAdapter, type MySQLConfig } from './mysql-adapter.js';
export { PostgreSQLAdapter, createPostgreSQLAdapter, type PostgreSQLConfig } from './postgres-adapter.js';
export { MongoDBAdapter, createMongoDBAdapter, type MongoDBConfig } from './mongodb-adapter.js';
export { APIAdapter, createAPIAdapter, type APIAdapterConfig } from './api-adapter.js';
export { SQLiteAdapter, createSQLiteAdapter, type SQLiteConfig } from './sqlite-adapter.js';

import type { DbAdapter } from '../orm/types.js';
import { createMySQLAdapter, type MySQLConfig } from './mysql-adapter.js';
import { createPostgreSQLAdapter, type PostgreSQLConfig } from './postgres-adapter.js';
import { createMongoDBAdapter, type MongoDBConfig } from './mongodb-adapter.js';
import { createAPIAdapter, type APIAdapterConfig } from './api-adapter.js';
import { createSQLiteAdapter, type SQLiteConfig } from './sqlite-adapter.js';

export type AdapterConfig =
    | { type: 'mysql'; config: MySQLConfig }
    | { type: 'postgres' | 'postgresql' | 'sql'; config: PostgreSQLConfig }
    | { type: 'mongodb' | 'mongo'; config: MongoDBConfig }
    | { type: 'api' | 'rest'; config: APIAdapterConfig }
    | { type: 'sqlite' | 'sqlite3'; config: SQLiteConfig };

/**
 * Auto-create adapter based on connection type
 */
export function createAdapter(adapterConfig: AdapterConfig): DbAdapter {
    switch (adapterConfig.type) {
        case 'mysql':
            return createMySQLAdapter(adapterConfig.config);

        case 'postgres':
        case 'postgresql':
        case 'sql':
            return createPostgreSQLAdapter(adapterConfig.config);

        case 'mongodb':
        case 'mongo':
            return createMongoDBAdapter(adapterConfig.config);

        case 'api':
        case 'rest':
            return createAPIAdapter(adapterConfig.config);

        case 'sqlite':
        case 'sqlite3':
            return createSQLiteAdapter(adapterConfig.config as any);

        default:
            throw new Error(`Unknown adapter type: ${(adapterConfig as any).type}`);
    }
}

/**
 * Create adapter from connection URL
 */
export function createAdapterFromUrl(url: string): DbAdapter {
    // Handle shorthand SQLite local files
    if (url.endsWith('.db') || url.endsWith('.sqlite')) {
        return createSQLiteAdapter({ filename: url });
    }

    const urlObj = new URL(url);
    const protocol = urlObj.protocol.replace(':', '');

    switch (protocol) {
        case 'mysql':
            return createMySQLAdapter({
                host: urlObj.hostname,
                port: urlObj.port ? parseInt(urlObj.port) : 3306,
                user: urlObj.username,
                password: urlObj.password,
                database: urlObj.pathname.replace('/', ''),
            });

        case 'postgres':
        case 'postgresql':
            return createPostgreSQLAdapter({
                host: urlObj.hostname,
                port: urlObj.port ? parseInt(urlObj.port) : 5432,
                user: urlObj.username,
                password: urlObj.password,
                database: urlObj.pathname.replace('/', ''),
            });

        case 'mongodb':
            return createMongoDBAdapter({
                uri: url,
                database: urlObj.pathname.replace('/', ''),
            });

        case 'http':
        case 'https':
            return createAPIAdapter({
                baseUrl: url,
            });

        case 'sqlite':
        case 'sqlite3':
            return createSQLiteAdapter({
                filename: url.replace('sqlite://', '').replace('sqlite3://', ''),
            });

        default:
            throw new Error(`Unsupported protocol: ${protocol}`);
    }
}

/**
 * Helper to auto-attach adapter to connection
 */
export function autoAttachAdapter(
    connections: any,
    connectionName: string,
    connectionType: string,
    connectionKey: any
): void {
    try {
        let adapter: DbAdapter;

        // If connectionKey has a URL, use it
        if (connectionKey.url) {
            adapter = createAdapterFromUrl(connectionKey.url);
        } else {
            // Create adapter based on type
            adapter = createAdapter({
                type: connectionType as any,
                config: connectionKey,
            });
        }

        connections.attachAdapter(connectionName, adapter);
    } catch (error: any) {
        console.warn(`Failed to auto-attach adapter for ${connectionName}:`, error.message);
    }
}
