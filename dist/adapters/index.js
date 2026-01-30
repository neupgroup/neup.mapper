// Export all adapters
export { MySQLAdapter, createMySQLAdapter } from './mysql-adapter';
export { PostgreSQLAdapter, createPostgreSQLAdapter } from './postgres-adapter';
export { MongoDBAdapter, createMongoDBAdapter } from './mongodb-adapter';
export { APIAdapter, createAPIAdapter } from './api-adapter';
import { createMySQLAdapter } from './mysql-adapter';
import { createPostgreSQLAdapter } from './postgres-adapter';
import { createMongoDBAdapter } from './mongodb-adapter';
import { createAPIAdapter } from './api-adapter';
/**
 * Auto-create adapter based on connection type
 */
export function createAdapter(adapterConfig) {
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
        default:
            throw new Error(`Unknown adapter type: ${adapterConfig.type}`);
    }
}
/**
 * Create adapter from connection URL
 */
export function createAdapterFromUrl(url) {
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
        default:
            throw new Error(`Unsupported protocol: ${protocol}`);
    }
}
/**
 * Helper to auto-attach adapter to connection
 */
export function autoAttachAdapter(connections, connectionName, connectionType, connectionKey) {
    try {
        let adapter;
        // If connectionKey has a URL, use it
        if (connectionKey.url) {
            adapter = createAdapterFromUrl(connectionKey.url);
        }
        else {
            // Create adapter based on type
            adapter = createAdapter({
                type: connectionType,
                config: connectionKey,
            });
        }
        connections.attachAdapter(connectionName, adapter);
    }
    catch (error) {
        console.warn(`Failed to auto-attach adapter for ${connectionName}:`, error.message);
    }
}
