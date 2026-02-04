export interface DatabaseConnectionConfig {
    name: string;
    type: 'mysql' | 'sql' | 'firestore' | 'mongodb' | 'postgres' | 'sqlite';
    host?: string;
    port?: number;
    database?: string;
    user?: string;
    password?: string;
    ssl?: boolean;
    filename?: string;
    mode?: number;
    [key: string]: any;
}
export interface SqliteConnectionConfig {
    name: string;
    type: 'sqlite';
    filename: string;
    mode?: number;
    [key: string]: any;
}
export interface ApiConnectionConfig {
    name: string;
    type: 'api';
    url: string;
    [key: string]: any;
}
export type ConnectionConfig = DatabaseConnectionConfig | ApiConnectionConfig | SqliteConnectionConfig;
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
