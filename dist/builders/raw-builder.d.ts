export declare class RawBuilder {
    private mapper;
    private sql;
    private _bindings;
    constructor(mapper: any, sql: string);
    bind(bindings: any[] | any): this;
    run(): Promise<any>;
}
