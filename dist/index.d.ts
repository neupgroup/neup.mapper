import type { DbAdapter, QueryOptions } from './orm/index.js';
export type ColumnType = 'string' | 'number' | 'boolean' | 'date' | 'int';
export type ConnectionType = 'mysql' | 'sql' | 'firestore' | 'mongodb' | 'postgres' | 'api' | 'sqlite';
export interface Field {
    name: string;
    type: ColumnType;
    editable?: boolean;
    autoIncrement?: boolean;
    nullable?: boolean;
    defaultValue?: any;
    isUnique?: boolean;
    isForeignKey?: boolean;
    foreignRef?: string;
    enumValues?: any[];
    config?: any[];
}
export interface SchemaDef {
    name: string;
    connectionName: string;
    collectionName: string;
    fields: Field[];
    fieldsMap: Map<string, Field>;
    allowUndefinedFields?: boolean;
    insertableFields?: string[];
    updatableFields?: string[];
    deleteType: 'softDelete' | 'hardDelete';
    massDeleteAllowed: boolean;
    massEditAllowed: boolean;
}
interface ConnectionConfig {
    name: string;
    type: ConnectionType;
    key: Record<string, any>;
}
declare class ConnectionBuilder {
    private manager;
    private name;
    private type;
    constructor(manager: Connections, name: string, type: ConnectionType);
    key(config: Record<string, any>): Connections;
}
export declare class Connections {
    private connections;
    private adapters;
    create(name: string, type: ConnectionType): ConnectionBuilder;
    register(config: ConnectionConfig): this;
    attachAdapter(name: string, adapter: DbAdapter): this;
    get(name: string): ConnectionConfig | undefined;
    getAdapter(name: string): DbAdapter | undefined;
    list(): ConnectionConfig[];
}
export declare function parseDescriptorStructure(struct: Record<string, string | any[]>): {
    fields: Field[];
    allowUndefinedFields: boolean;
};
declare class SchemaBuilder {
    private manager;
    private name;
    private connectionName?;
    private collectionName?;
    private fields;
    private allowUndefinedFields;
    private insertableFields?;
    private updatableFields?;
    private deleteType;
    private massDeleteAllowed;
    private massEditAllowed;
    constructor(manager: SchemaManager, name: string);
    use(options: {
        connection: string;
        collection: string;
    }): this;
    setOptions(options: {
        insertableFields?: string[];
        updatableFields?: string[];
        deleteType?: 'softDelete' | 'hardDelete';
        massDeleteAllowed?: boolean;
        massEditAllowed?: boolean;
    }): this;
    setStructure(structure: Record<string, any> | Field[]): SchemaManager;
}
declare class SchemaQuery {
    private manager;
    private def;
    private filters;
    private rawWhere;
    private pendingUpdate;
    private cachedAdapter;
    private cachedFieldNames;
    private allowedFields;
    private _limit;
    private _offset;
    constructor(manager: SchemaManager, def: SchemaDef);
    limit(n: number): this;
    offset(n: number): this;
    selectFields(fields: string[]): this;
    where(fieldOrPair: string | [string, any], value?: any, operator?: string): this;
    whereComplex(raw: string): this;
    private buildOptions;
    private getAdapter;
    to(update: Record<string, any>): this;
    get(): Promise<Record<string, any>[]>;
    getOne(): Promise<Record<string, any> | null>;
    add(data: Record<string, any>): Promise<string>;
    delete(): Promise<void>;
    deleteOne(): Promise<void>;
    update(): Promise<void>;
    updateOne(): Promise<void>;
}
export declare class SchemaManager {
    private connections;
    private schemas;
    constructor(connections: Connections);
    create(name: string): SchemaBuilder;
    register(def: SchemaDef): this;
    use(name: string): SchemaQuery;
    getAdapter(connectionName: string): DbAdapter | undefined;
    list(): SchemaDef[];
}
export declare function connection(): Connections;
export declare function schema(conns?: Connections): SchemaManager;
export declare const schemas: SchemaManager;
export { createOrm } from './orm/index.js';
export type { DbAdapter, QueryOptions };
export { parseConnectionsDsl, toNormalizedConnections } from './env.js';
export type { EnvDslConnections, NormalizedConnection } from './env.js';
export { documentationMd, markdownToHtml, getDocumentationHtml } from './docs.js';
export { Mapper, createMapper } from './mapper.js';
export { default } from './mapper.js';
export { StaticMapper, RawBuilder, BaseDispatcher } from './fluent-mapper.js';
export type { FluentConnectionBuilder, FluentConnectionSelector, FluentMapper } from './fluent-mapper.js';
export { ConfigBasedMapper, ConfigLoader, createConfigMapper, getConfigMapper, createDefaultMapper } from './config.js';
export type { MapperConfig, ConnectionConfig, DatabaseConnectionConfig, ApiConnectionConfig, SqliteConnectionConfig, ConfigSchema } from './config.js';
export { MySQLAdapter, createMySQLAdapter, PostgreSQLAdapter, createPostgreSQLAdapter, MongoDBAdapter, createMongoDBAdapter, APIAdapter, createAPIAdapter, SQLiteAdapter, createSQLiteAdapter, createAdapter, createAdapterFromUrl, autoAttachAdapter } from './adapters/index.js';
export type { MySQLConfig, PostgreSQLConfig, MongoDBConfig, APIAdapterConfig, SQLiteConfig, AdapterConfig } from './adapters/index.js';
export { MapperError, AdapterMissingError, UpdatePayloadMissingError, DocumentMissingIdError, ConnectionExistingError, ConnectionUnknownError, SchemaExistingError, SchemaMissingError, SchemaConfigurationError, } from './errors.js';
export { Connector, mapper } from './connector.js';
export { TableMigrator, ColumnBuilder } from './migrator.js';
