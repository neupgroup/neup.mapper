import { Connections, SchemaManager } from './index.js';
export interface DatabaseConnectionConfig {
    name: string;
    type: 'mysql' | 'sql' | 'firestore' | 'mongodb';
    host: string;
    port: number;
    database: string;
    user: string;
    password?: string;
    ssl?: boolean;
    [key: string]: any;
}
export interface ApiConnectionConfig {
    name: string;
    type: 'api';
    url: string;
    headers?: Record<string, string>;
    timeout?: number;
    [key: string]: any;
}
export type ConnectionConfig = DatabaseConnectionConfig | ApiConnectionConfig;
export interface ConfigSchema {
    name: string;
    connection: string;
    collection: string;
    structure?: Record<string, string> | Array<{
        name: string;
        type: 'string' | 'number' | 'boolean' | 'date' | 'int';
        [key: string]: any;
    }>;
}
export interface MapperConfig {
    connections: ConnectionConfig[];
    schemas?: ConfigSchema[];
}
export declare class ConfigLoader {
    private static instance;
    private config?;
    static getInstance(): ConfigLoader;
    load(config: MapperConfig): void;
    loadFromFile(path: string): void;
    getConfig(): MapperConfig | undefined;
}
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
    connect(name: string, type: 'mysql' | 'sql' | 'firestore' | 'mongodb' | 'api', config: Record<string, any>): import("./mapper.js").Mapper;
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
