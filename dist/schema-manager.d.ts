import { Connections } from './connections.js';
import type { DbAdapter } from './orm/index.js';
import { Field, SchemaDef } from './types-core.js';
export declare function parseDescriptorStructure(struct: Record<string, string | any[]>): {
    fields: Field[];
    allowUndefinedFields: boolean;
};
export declare class SchemaBuilder {
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
export declare class SchemaQuery {
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
export declare function schema(conns?: Connections): SchemaManager;
