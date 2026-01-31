import { SelectBuilder, InsertBuilder, UpdateBuilder, DeleteBuilder } from './dml-builders.js';
export declare class BaseDispatcher {
    private mapper;
    private target;
    constructor(mapper: any, target: string);
    select(fields?: string[]): SelectBuilder;
    insert(data: any): InsertBuilder;
    update(data: any): UpdateBuilder;
    delete(): DeleteBuilder;
}
