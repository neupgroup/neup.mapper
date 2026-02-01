import { ConnectionType } from './types-core.js';
import { BaseDispatcher } from './builders/base-dispatcher.js';
import { RawBuilder } from './builders/raw-builder.js';
import { SchemaDispatcher } from './builders/schema-builders.js';
export { BaseDispatcher, RawBuilder, SchemaDispatcher };
export * from './builders/dml-builders.js';
export * from './builders/schema-builders.js';
export * from './builders/raw-builder.js';
export * from './builders/clause-builder.js';
export declare class FluentConnectionBuilder {
    private name;
    private type;
    private mapper;
    constructor(mapper: any, name: string, type: ConnectionType, config: Record<string, any>);
    base(target: string): BaseDispatcher;
    query(target: string): BaseDispatcher;
}
export declare class FluentConnectionSelector {
    private mapper;
    private name;
    constructor(mapper: any, name: string);
    base(target: string): BaseDispatcher;
    query(target: string): BaseDispatcher;
}
export declare class FluentMapper {
    private mapper;
    constructor(mapper: any);
    base(target: string): BaseDispatcher;
    query(target: string): BaseDispatcher;
    schema(name: string): SchemaDispatcher;
    raw(sql: string): RawBuilder;
    makeConnection(name: string, type: ConnectionType, config: Record<string, any>): FluentConnectionBuilder;
    connection(configOrName: string | any): FluentConnectionSelector;
    get(target: string): Promise<any>;
    add(target: string, data: any): Promise<any>;
    update(target: string, filter: any, data: any): Promise<any>;
    delete(target: string, filter: any): Promise<any>;
}
export declare class StaticMapper {
    private static instance;
    private static getFluentMapper;
    static base(target: string): BaseDispatcher;
    static query(target: string): BaseDispatcher;
    static schema(name: string): SchemaDispatcher;
    static raw(sql: string): RawBuilder;
    static connection(arg: any): FluentConnectionSelector;
    static makeConnection(n: string, t: ConnectionType, c: any): FluentConnectionBuilder;
    static discover(): Promise<void>;
    static get(t: string): Promise<any>;
    static add(t: string, d: any): Promise<any>;
}
export declare const Mapper: typeof StaticMapper;
export default Mapper;
