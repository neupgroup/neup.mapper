export { MySQLAdapter, createMySQLAdapter, type MySQLConfig } from './mysql-adapter.js';
export { PostgreSQLAdapter, createPostgreSQLAdapter, type PostgreSQLConfig } from './postgres-adapter.js';
export { MongoDBAdapter, createMongoDBAdapter, type MongoDBConfig } from './mongodb-adapter.js';
export { APIAdapter, createAPIAdapter, type APIAdapterConfig } from './api-adapter.js';
import type { DbAdapter } from '../orm/types.js';
import { type MySQLConfig } from './mysql-adapter.js';
import { type PostgreSQLConfig } from './postgres-adapter.js';
import { type MongoDBConfig } from './mongodb-adapter.js';
import { type APIAdapterConfig } from './api-adapter.js';
export type AdapterConfig = {
    type: 'mysql';
    config: MySQLConfig;
} | {
    type: 'postgres' | 'postgresql' | 'sql';
    config: PostgreSQLConfig;
} | {
    type: 'mongodb' | 'mongo';
    config: MongoDBConfig;
} | {
    type: 'api' | 'rest';
    config: APIAdapterConfig;
};
/**
 * Auto-create adapter based on connection type
 */
export declare function createAdapter(adapterConfig: AdapterConfig): DbAdapter;
/**
 * Create adapter from connection URL
 */
export declare function createAdapterFromUrl(url: string): DbAdapter;
/**
 * Helper to auto-attach adapter to connection
 */
export declare function autoAttachAdapter(connections: any, connectionName: string, connectionType: string, connectionKey: any): void;
