import { SchemaManager, ConnectionType } from './index.js';
import { TableMigrator } from './migrator.js';
export declare class FluentQueryBuilder {
    private mapper;
    private schemaName;
    private query;
    constructor(mapper: any, schemaName: string);
    where(field: string, value: any, operator?: string): this;
    whereComplex(raw: string): this;
    limit(n: number): this;
    offset(n: number): this;
    to(update: Record<string, any>): this;
    get(...fields: string[]): any;
    then(onfulfilled?: ((value: any) => any) | null, onrejected?: ((reason: any) => any) | null): Promise<any>;
    getOne(): Promise<Record<string, any> | null>;
    add(data: Record<string, any>): Promise<any>;
    insert(data: Record<string, any>): Promise<any>;
    update(): Promise<void>;
    delete(): Promise<void>;
    deleteOne(): Promise<void>;
    updateOne(): Promise<void>;
}
export declare class FluentConnectionBuilder {
    private mapper;
    private connectionName;
    private connectionType;
    private connectionConfig;
    constructor(mapper: any, connectionName: string, connectionType: string, config: Record<string, any>);
    schema(schemaName: string): FluentSchemaBuilder;
    query(schemaName: string): FluentQueryBuilder;
    useConnection(connectionName: string): FluentConnectionSelector;
}
export declare class FluentSchemaBuilder {
    private mapper;
    private schemaName;
    private connectionName;
    constructor(mapper: any, schemaName: string, connectionName: string);
    collection(collectionName: string): FluentSchemaCollectionBuilder;
}
export declare class FluentSchemaCollectionBuilder {
    private mapper;
    private schemaName;
    private connectionName;
    private collectionName;
    constructor(mapper: any, schemaName: string, connectionName: string, collectionName: string);
    structure(structure: Record<string, string> | Array<{
        name: string;
        type: string;
        [key: string]: any;
    }>): FluentMapper;
}
export declare class FluentApiRequestBuilder {
    private mapper;
    private connectionName;
    private _path;
    private _headers;
    constructor(mapper: any, connectionName: string, path?: string);
    path(p: string): this;
    header(key: string | Record<string, string | string[]>, value?: string | string[]): this;
    headers(h: Record<string, string | string[]> | any[]): this;
    get(): Promise<any>;
    post(data?: any): Promise<any>;
    put(data?: any): Promise<any>;
    patch(data?: any): Promise<any>;
    delete(): Promise<any>;
    private execute;
}
export declare class FluentConnectionSelector {
    private mapper;
    private connectionName;
    constructor(mapper: any, connectionName: string);
    schema(schemaName: string): FluentSchemaBuilder;
    query(schemaName: string): FluentQueryBuilder;
    table(tableName: string): FluentQueryBuilder;
    collection(collectionName: string): FluentQueryBuilder;
    schemas(schemaName: string): FluentSchemaWrapper;
    path(path: string): FluentApiRequestBuilder;
    header(key: string | Record<string, string | string[]>, value?: string | string[]): FluentApiRequestBuilder;
    headers(headers: Record<string, string> | any[]): FluentApiRequestBuilder;
    get(): Promise<any>;
    post(data?: any): Promise<any>;
    put(data?: any): Promise<any>;
    patch(data?: any): Promise<any>;
    delete(): Promise<any>;
}
export declare class FluentMapper {
    private mapper;
    constructor(mapper: any);
    query(schemaName: string): FluentQueryBuilder;
    makeConnection(name: string, type: ConnectionType, config: Record<string, any>): FluentConnectionBuilder;
    useConnection(connectionName: string): FluentConnectionSelector;
    connection(connectionOrConfig: string | Record<string, any>): FluentConnectionSelector;
    makeTempConnection(type: ConnectionType, config: Record<string, any>): FluentConnectionBuilder;
    get(schemaName: string, filters?: Record<string, any>): Promise<Record<string, any>[]>;
    getOne(schemaName: string, filters?: Record<string, any>): Promise<Record<string, any> | null>;
    add(schemaName: string, data: Record<string, any>): Promise<any>;
    update(schemaName: string, filters: Record<string, any>, data: Record<string, any>): Promise<void>;
    delete(schemaName: string, filters: Record<string, any>): Promise<void>;
}
export declare class StaticMapper {
    private static instance;
    private static getFluentMapper;
    static makeConnection(name: string, type: ConnectionType, config: Record<string, any>): FluentConnectionBuilder;
    static makeTempConnection(type: ConnectionType, config: Record<string, any>): FluentConnectionBuilder;
    static query(schemaName: string): FluentQueryBuilder;
    static connection(connectionOrConfig: string | Record<string, any>): FluentConnectionSelector;
    static useConnection(connectionName: string): FluentConnectionSelector;
    static schemas(name?: string): FluentSchemaWrapper | SchemaManagerWrapper;
    static get(schemaName: string, filters?: Record<string, any>): Promise<Record<string, any>[]>;
    static getOne(schemaName: string, filters?: Record<string, any>): Promise<Record<string, any> | null>;
    static add(schemaName: string, data: Record<string, any>): Promise<any>;
    static update(schemaName: string, filters: Record<string, any>, data: Record<string, any>): Promise<void>;
    static delete(schemaName: string, filters: Record<string, any>): Promise<void>;
}
export declare const Mapper: typeof StaticMapper;
export default Mapper;
export declare class FluentSchemaWrapper {
    private manager;
    private name;
    private connectionName?;
    constructor(manager: SchemaManager, name: string, connectionName?: string | undefined);
    private getDef;
    set fields(config: any);
    set insertableFields(val: string[]);
    set updatableFields(val: string[]);
    set deleteType(val: 'softDelete' | 'hardDelete');
    set massDeleteAllowed(val: boolean);
    set massEditAllowed(val: boolean);
    get(...fields: string[]): any;
    limit(n: number): FluentQueryBuilder;
    offset(n: number): FluentQueryBuilder;
    insert(data: Record<string, any>): Promise<any>;
}
export declare class SchemaManagerWrapper {
    private manager;
    constructor(manager: SchemaManager);
    table(name: string): TableMigrator;
}
