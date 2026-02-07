import { Connections } from '../connections.js';
import { SchemaManager } from '../schema-manager.js';
export declare class InitMapper {
    private static instance;
    private connections;
    private schemaManager;
    private registeredSchemas;
    private constructor();
    static getInstance(): InitMapper;
    getConnections(): Connections;
    getDefaultConnection(): any;
    getSchemaManager(): SchemaManager;
    connect(name: string, type: any, config: any): this;
    schema(name: string): import("../schema-manager.js").SchemaBuilder;
    use(name: string): import("../schema-manager.js").SchemaQuery;
    loadSchemas(schemas: Record<string, any>): this;
    getSchemaDef(tableName: string): any;
}
