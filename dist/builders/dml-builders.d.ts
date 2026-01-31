import { ClauseBuilder } from './clause-builder.js';
export declare class SelectBuilder extends ClauseBuilder {
    fields: string[];
    constructor(mapper: any, target: string, fields?: string[]);
    get(): Promise<any[]>;
    getOne(): Promise<any | null>;
}
export declare class InsertBuilder {
    private mapper;
    private target;
    private data;
    private query;
    constructor(mapper: any, target: string, data: any);
    private ensureSchema;
    run(): Promise<any>;
}
export declare class UpdateBuilder extends ClauseBuilder {
    private data;
    constructor(mapper: any, target: string, data: any);
    run(): Promise<void>;
}
export declare class DeleteBuilder extends ClauseBuilder {
    constructor(mapper: any, target: string);
    run(): Promise<void>;
}
