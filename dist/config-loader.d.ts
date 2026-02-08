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
    name?: string;
    table?: string;
    connection: string;
    collection?: string;
    columns?: Record<string, any>;
    structure?: Record<string, string> | Array<{
        name: string;
        type: 'string' | 'number' | 'boolean' | 'date' | 'int';
        [key: string]: any;
    }>;
}
export interface MigrationObject {
    id: string;
    name: string;
    timestamp: string;
    status: 'pending' | 'completed' | 'failed' | 'success';
    up: (Mapper: any) => Promise<void>;
    down: (Mapper: any) => Promise<void>;
    executedAt?: string;
    connection?: string;
    checksum?: string;
    [key: string]: any;
}
export interface MigrationsConfig {
    migrations: Record<string, MigrationObject>;
    logs?: Array<{
        migrationId: string | number;
        timestamp: string;
        action: string;
        status: string;
        duration: number;
        message?: string;
        [key: string]: any;
    }>;
    settings?: {
        migrationsDirectory?: string;
        migrationsTable?: string;
        autoRun?: boolean;
        [key: string]: any;
    };
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
