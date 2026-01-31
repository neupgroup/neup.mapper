import { Connections, SchemaManager, ConnectionType } from './index.js';
import { createMapper } from './mapper.js';

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
  headers?: Record<string, string>;
  timeout?: number;
  [key: string]: any;
}

export type ConnectionConfig = DatabaseConnectionConfig | ApiConnectionConfig | SqliteConnectionConfig;

export interface ConfigSchema {
  name: string;
  connection: string;
  collection: string;
  structure?: Record<string, string> | Array<{ name: string; type: 'string' | 'number' | 'boolean' | 'date' | 'int';[key: string]: any }>;
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
      if (typeof require !== 'undefined') {
        const fs = require('fs');
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

export class ConfigBasedMapper {
  private mapper: ReturnType<typeof createMapper>;
  private configLoader: ConfigLoader;
  private initialized: boolean = false;

  constructor() {
    this.mapper = createMapper();
    this.configLoader = ConfigLoader.getInstance();
  }

  configure(config: MapperConfig): this {
    this.configLoader.load(config);
    this.initializeFromConfig();
    return this;
  }

  configureFromFile(path: string): this {
    this.configLoader.loadFromFile(path);
    this.initializeFromConfig();
    return this;
  }

  private initializeFromConfig(): void {
    const config = this.configLoader.getConfig();
    if (!config) {
      throw new Error('No configuration loaded');
    }

    // Initialize connections
    for (const connectionConfig of config.connections) {
      this.initializeConnection(connectionConfig);
    }

    // Initialize schemas
    if (config.schemas) {
      for (const schemaConfig of config.schemas) {
        this.initializeSchema(schemaConfig);
      }
    }

    this.initialized = true;
  }

  private initializeConnection(config: ConnectionConfig): void {
    const { name, type } = config;

    if (type === 'api') {
      const apiConfig = config as ApiConnectionConfig;
      this.mapper.connect(name, type, apiConfig);
    } else {
      const dbConfig = config as DatabaseConnectionConfig;
      this.mapper.connect(name, type, dbConfig);
    }
  }

  private initializeSchema(config: ConfigSchema): void {
    const schemaBuilder = this.mapper.schema(config.name);
    schemaBuilder.use({ connection: config.connection, collection: config.collection });

    if (config.structure) {
      schemaBuilder.setStructure(config.structure as any);
    }
  }

  // Delegate methods to the underlying mapper
  getConnections() {
    return this.mapper.getConnections();
  }

  getSchemaManager() {
    return this.mapper.getSchemaManager();
  }

  use(schemaName: string): any {
    if (!this.initialized) {
      throw new Error('Mapper not initialized. Call configure() first.');
    }
    return this.mapper.use(schemaName);
  }

  schema(name: string): any {
    if (!this.initialized) {
      throw new Error('Mapper not initialized. Call configure() first.');
    }
    return this.mapper.schema(name);
  }

  connect(name: string, type: ConnectionType, config: Record<string, any>) {
    if (!this.initialized) {
      throw new Error('Mapper not initialized. Call configure() first.');
    }
    return this.mapper.connect(name, type, config);
  }

  // Quick query methods
  async get(schemaName: string, filters?: Record<string, any>): Promise<Record<string, any>[]> {
    if (!this.initialized) {
      throw new Error('Mapper not initialized. Call configure() first.');
    }
    return this.mapper.get(schemaName, filters);
  }

  async getOne(schemaName: string, filters?: Record<string, any>): Promise<Record<string, any> | null> {
    if (!this.initialized) {
      throw new Error('Mapper not initialized. Call configure() first.');
    }
    return this.mapper.getOne(schemaName, filters);
  }

  async add(schemaName: string, data: Record<string, any>): Promise<any> {
    if (!this.initialized) {
      throw new Error('Mapper not initialized. Call configure() first.');
    }
    return this.mapper.add(schemaName, data);
  }

  async update(schemaName: string, filters: Record<string, any>, data: Record<string, any>): Promise<void> {
    if (!this.initialized) {
      throw new Error('Mapper not initialized. Call configure() first.');
    }
    return this.mapper.update(schemaName, filters, data);
  }

  async delete(schemaName: string, filters: Record<string, any>): Promise<void> {
    if (!this.initialized) {
      throw new Error('Mapper not initialized. Call configure() first.');
    }
    return this.mapper.delete(schemaName, filters);
  }
}

// Create a default instance
let defaultConfigMapper: ConfigBasedMapper | null = null;

export function createConfigMapper(config?: MapperConfig): ConfigBasedMapper {
  const mapper = new ConfigBasedMapper();
  if (config) {
    mapper.configure(config);
  }
  defaultConfigMapper = mapper;
  return mapper;
}

// Export a function to get the default instance
export function getConfigMapper(): ConfigBasedMapper {
  if (!defaultConfigMapper) {
    defaultConfigMapper = new ConfigBasedMapper();
  }
  return defaultConfigMapper;
}

// Create a default configured mapper instance
export function createDefaultMapper(config?: MapperConfig): ConfigBasedMapper {
  const mapper = new ConfigBasedMapper();

  // If no config provided, try to load from environment or default locations
  if (!config) {
    // Try to load from environment
    const envConfig = loadConfigFromEnvironment();
    if (envConfig) {
      mapper.configure(envConfig);
    } else {
      // Try to load from default config file locations
      const defaultPaths = ['./mapper.config.json', './config/mapper.json', '/etc/mapper/config.json'];
      for (const path of defaultPaths) {
        try {
          mapper.configureFromFile(path);
          break;
        } catch (error) {
          // Continue trying other paths
        }
      }
    }
  } else {
    mapper.configure(config);
  }

  return mapper;
}

function loadConfigFromEnvironment(): MapperConfig | null {
  if (typeof process !== 'undefined' && process.env) {
    // Check for MAPPER_CONFIG environment variable
    const envConfig = process.env.MAPPER_CONFIG;
    if (envConfig) {
      try {
        return JSON.parse(envConfig);
      } catch (error) {
        console.warn('Failed to parse MAPPER_CONFIG environment variable:', error);
      }
    }

    // Check for individual database connection environment variables
    const databaseUrl = process.env.DATABASE_URL;
    if (databaseUrl) {
      return {
        connections: [{
          name: 'default',
          type: inferConnectionType(databaseUrl),
          host: databaseUrl,
          port: 5432,
          database: 'default',
          user: 'default'
        }]
      };
    }
  }

  return null;
}

function inferConnectionType(url: string): 'mysql' | 'sql' | 'firestore' | 'mongodb' | 'postgres' | 'sqlite' {
  if (url.includes('mysql')) return 'mysql';
  if (url.includes('postgres') || url.includes('postgresql')) return 'postgres';
  if (url.includes('mongodb')) return 'mongodb';
  if (url.includes('firestore')) return 'firestore';
  if (url.includes('sqlite') || url.endsWith('.db') || url.endsWith('.sqlite')) return 'sqlite';
  return 'sql'; // default to sql
}

export default ConfigBasedMapper;