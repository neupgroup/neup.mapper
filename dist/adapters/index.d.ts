export { MySQLAdapter, createMySQLAdapter, type MySQLConfig } from './mysql-adapter';
export { PostgreSQLAdapter, createPostgreSQLAdapter, type PostgreSQLConfig } from './postgres-adapter';
export { MongoDBAdapter, createMongoDBAdapter, type MongoDBConfig } from './mongodb-adapter';
export { APIAdapter, createAPIAdapter, type APIAdapterConfig } from './api-adapter';
import type { DbAdapter } from '../orm/types';
import { type MySQLConfig } from './mysql-adapter';
import { type PostgreSQLConfig } from './postgres-adapter';
import { type MongoDBConfig } from './mongodb-adapter';
import { type APIAdapterConfig } from './api-adapter';
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
