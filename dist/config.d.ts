import { Connections, SchemaManager, ConnectionType } from './index.js';
import { ConfigLoader, MapperConfig, ConnectionConfig, ConfigSchema, ApiConnectionConfig, DatabaseConnectionConfig, SqliteConnectionConfig } from './config-loader.js';
export { ConfigLoader, MapperConfig, ConnectionConfig, ConfigSchema, ApiConnectionConfig, DatabaseConnectionConfig, SqliteConnectionConfig };
export declare class ConfigBasedMapper {
    private mapper;
    private configLoader;
    private initialized;
    constructor();
    configure(config: MapperConfig): this;
    configureFromFile(path: string): this;
    private initializeFromConfig;
    private initializeConnection;
    private initializeSchema;
    getConnections(): Connections;
    getSchemaManager(): SchemaManager;
    use(schemaName: string): any;
    schema(name: string): any;
    connect(name: string, type: ConnectionType, config: Record<string, any>): import("./index.js").InitMapper;
    get(schemaName: string, filters?: Record<string, any>): Promise<Record<string, any>[]>;
    getOne(schemaName: string, filters?: Record<string, any>): Promise<Record<string, any> | null>;
    add(schemaName: string, data: Record<string, any>): Promise<any>;
    update(schemaName: string, filters: Record<string, any>, data: Record<string, any>): Promise<void>;
    delete(schemaName: string, filters: Record<string, any>): Promise<void>;
}
export declare function createConfigMapper(config?: MapperConfig): ConfigBasedMapper;
export declare function getConfigMapper(): ConfigBasedMapper;
export declare function createDefaultMapper(config?: MapperConfig): ConfigBasedMapper;
export default ConfigBasedMapper;
