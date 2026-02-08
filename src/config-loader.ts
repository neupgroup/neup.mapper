import * as fs from 'fs';

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
  url: string; // Base URL for API
  // Intentionally limited config for legacy support, but API adapter is removed.
  // This type is kept to prevent breakage in config files but usage will fail at runtime if attempted.
  [key: string]: any;
}

export type ConnectionConfig = DatabaseConnectionConfig | ApiConnectionConfig | SqliteConnectionConfig;

export interface ConfigSchema {
  name?: string; // Optional if table is provided
  table?: string; // Alternative to collection/name
  connection: string;
  collection?: string;
  columns?: Record<string, any>;
  structure?: Record<string, string> | Array<{ name: string; type: 'string' | 'number' | 'boolean' | 'date' | 'int';[key: string]: any }>;
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

export class ConfigLoader {
  private static instance: ConfigLoader;
  private config?: MapperConfig;

  static getInstance(): ConfigLoader {
    if (!ConfigLoader.instance) {
      ConfigLoader.instance = new ConfigLoader();
    }
    return ConfigLoader.instance;
  }

  load(config: MapperConfig): void {
    this.config = config;
  }

  loadFromFile(path: string): void {
    try {
      // In Node.js environment
      if (typeof process !== 'undefined' && process.versions != null && process.versions.node != null) {
        const configData = fs.readFileSync(path, 'utf8');
        this.config = JSON.parse(configData);
      } else {
        // In browser environment, fetch the config file
        fetch(path)
          .then(response => response.json())
          .then(config => {
            this.config = config;
          })
          .catch((error: Error) => {
            throw new Error(`Failed to load config from ${path}: ${error.message}`);
          });
      }
    } catch (error: any) {
      throw new Error(`Failed to load config from ${path}: ${error.message}`);
    }
  }

  getConfig(): MapperConfig | undefined {
    return this.config;
  }
}
