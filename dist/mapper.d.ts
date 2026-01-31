import { Connections, SchemaManager, ConnectionType } from './index.js';
export declare class Mapper {
    private connections;
    private schemaManager;
    private static instance;
    private configured;
    constructor();
    static getInstance(): Mapper;
    autoConfigure(): this;
    private detectEnvironmentConfig;
    private inferConnectionType;
    private applyConfig;
    private applyDefaultConfig;
    private createSchema;
    connect(name: string, type: ConnectionType, config: Record<string, any>): this;
    schema(name: string): ReturnType<SchemaManager['create']>;
    use(schemaName: string): ReturnType<SchemaManager['use']>;
    get(schemaName: string, filters?: Record<string, any>): Promise<Record<string, any>[]>;
    getOne(schemaName: string, filters?: Record<string, any>): Promise<Record<string, any> | null>;
    add(schemaName: string, data: Record<string, any>): Promise<any>;
    update(schemaName: string, filters: Record<string, any>, data: Record<string, any>): Promise<void>;
    delete(schemaName: string, filters: Record<string, any>): Promise<void>;
    getConnections(): Connections;
    getSchemaManager(): SchemaManager;
}
export declare const createMapper: () => Mapper;
declare const _default: Mapper;
export default _default;
