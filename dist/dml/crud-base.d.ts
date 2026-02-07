export declare class CrudBase {
    private table;
    constructor(table: string);
    select(fields?: string[]): SelectBuilder;
    insert(data: Record<string, any>): InsertBuilder;
    update(data: Record<string, any>): UpdateBuilder;
    delete(): DeleteBuilder;
}
export declare class SelectBuilder {
    private table;
    private _where;
    private _bindings;
    private _limit;
    private _offset;
    private _select;
    private _connection;
    constructor(table: string, fields: string[]);
    useConnection(name: string): this;
    where(field: string, value: any, operator?: string): this;
    limit(limit: number): this;
    offset(offset: number): this;
    get(): Promise<any[]>;
    getOne(): Promise<any>;
    exec(): Promise<any[]>;
}
export declare class InsertBuilder {
    private table;
    private data;
    private _connection;
    constructor(table: string, data: Record<string, any>);
    useConnection(name: string): this;
    exec(): Promise<any>;
}
export declare class UpdateBuilder {
    private table;
    private data;
    private _where;
    private _bindings;
    private _connection;
    constructor(table: string, data: Record<string, any>);
    useConnection(name: string): this;
    where(field: string, value: any, operator?: string): this;
    exec(): Promise<any>;
}
export declare class DeleteBuilder {
    private table;
    private _where;
    private _bindings;
    private _connection;
    constructor(table: string);
    useConnection(name: string): this;
    where(field: string, value: any, operator?: string): this;
    exec(): Promise<any>;
}
