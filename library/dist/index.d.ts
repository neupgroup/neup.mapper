import type { DbAdapter, QueryOptions } from './orm';
export type ColumnType = 'string' | 'number' | 'boolean' | 'date' | 'int';
export type ConnectionType = 'mysql' | 'sql' | 'firestore' | 'mongodb' | 'api';
export interface Field {
    name: string;
    type: ColumnType;
    editable?: boolean;
    autoIncrement?: boolean;
    nullable?: boolean;
    defaultValue?: unknown;
}
export interface SchemaDef {
    name: string;
    connectionName: string;
    collectionName: string;
    fields: Field[];
    allowUndefinedFields?: boolean;
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
declare class SchemaBuilder {
    private manager;
    private name;
    private connectionName?;
    private collectionName?;
    private fields;
    private allowUndefinedFields;
    constructor(manager: SchemaManager, name: string);
    use(options: {
        connection: string;
        collection: string;
    }): this;
    setStructure(structure: Record<string, string> | Field[]): SchemaManager;
}
declare class SchemaQuery {
    private manager;
    private def;
    private filters;
    private rawWhere;
    private pendingUpdate;
    constructor(manager: SchemaManager, def: SchemaDef);
    where(fieldOrPair: string | [string, any], value?: any, operator?: string): this;
    whereComplex(raw: string): this;
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
export { createOrm } from './orm';
export type { DbAdapter, QueryOptions };
