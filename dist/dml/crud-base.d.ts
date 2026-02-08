export declare class CrudBase {
    private table;
    constructor(table: string);
    select(fields?: string[]): SelectBuilder;
    insert(data: Record<string, any>): InsertBuilder;
    update(data: Record<string, any>): UpdateBuilder;
    delete(): DeleteBuilder;
}
/**
 * Base class for query builders to share connection resolution logic.
 */
declare class BaseBuilder {
    protected table: string;
    protected _connection: string | null;
    protected _transaction: any;
    constructor(table: string);
    protected resolveConnectionName(): Promise<string>;
}
export declare class SelectBuilder extends BaseBuilder {
    private _where;
    private _bindings;
    private _limit;
    private _offset;
    private _select;
    constructor(table: string, fields: string[]);
    useTransaction(transaction: any): this;
    useConnection(name: string): this;
    where(field: string, value: any, operator?: string): this;
    limit(limit: number): this;
    offset(offset: number): this;
    get(): Promise<any[]>;
    getOne(): Promise<any>;
    exec(): Promise<any[]>;
}
export declare class InsertBuilder extends BaseBuilder {
    private data;
    constructor(table: string, data: Record<string, any>);
    useConnection(name: string): this;
    useTransaction(transaction: any): this;
    exec(): Promise<any>;
}
export declare class UpdateBuilder extends BaseBuilder {
    private data;
    private _where;
    private _bindings;
    constructor(table: string, data: Record<string, any>);
    useConnection(name: string): this;
    useTransaction(transaction: any): this;
    where(field: string, value: any, operator?: string): this;
    exec(): Promise<any>;
}
export declare class DeleteBuilder extends BaseBuilder {
    private _where;
    private _bindings;
    constructor(table: string);
    useConnection(name: string): this;
    useTransaction(transaction: any): this;
    where(field: string, value: any, operator?: string): this;
    exec(): Promise<any>;
}
export {};
