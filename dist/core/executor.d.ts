export declare class Executor {
    private sql;
    private _bindings;
    private _connectionName;
    private _transaction;
    constructor(sql: string);
    bind(bindings: any[] | any): this;
    useConnection(name: string): this;
    useTransaction(transaction: any): this;
    execute(): Promise<any>;
}
