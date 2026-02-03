import { Connections } from '../connections.js';
import { SchemaManager } from '../schema-manager.js';
export declare class InitMapper {
    private static instance;
    private connections;
    private schemaManager;
    private constructor();
    static getInstance(): InitMapper;
    getConnections(): Connections;
    getSchemaManager(): SchemaManager;
    connect(name: string, type: any, config: any): this;
    schema(name: string): import("../schema-manager.js").SchemaBuilder;
    use(name: string): import("../schema-manager.js").SchemaQuery;
}
