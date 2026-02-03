export declare class Executor {
    private sql;
    private _bindings;
    constructor(sql: string);
    bind(bindings: any[] | any): this;
    execute(): Promise<any>;
}
