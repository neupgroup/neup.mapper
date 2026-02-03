export declare class Executor {
    private sql;
    private _bindings;
    private _connectionName;
    constructor(sql: string);
    bind(bindings: any[] | any): this;
    useConnection(name: string): this;
    execute(): Promise<any>;
}
