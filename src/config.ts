import { Connections, SchemaManager, ConnectionType } from './index.js';
import { createMapper, Mapper } from './mapper.js';
import { 
  ConfigLoader, 
  MapperConfig, 
  ConnectionConfig, 
  ConfigSchema, 
  ApiConnectionConfig, 
  DatabaseConnectionConfig, 
  SqliteConnectionConfig 
} from './config-loader.js';

export { 
  ConfigLoader, 
  MapperConfig, 
  ConnectionConfig, 
  ConfigSchema, 
  ApiConnectionConfig, 
  DatabaseConnectionConfig, 
  SqliteConnectionConfig 
};

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
    const query = Mapper.base(schemaName).select();
    if (filters) {
        Object.entries(filters).forEach(([k, v]) => query.where(k, v));
    }
    return query.get();
  }

  async getOne(schemaName: string, filters?: Record<string, any>): Promise<Record<string, any> | null> {
    if (!this.initialized) {
      throw new Error('Mapper not initialized. Call configure() first.');
    }
    const query = Mapper.base(schemaName).select();
    if (filters) {
        Object.entries(filters).forEach(([k, v]) => query.where(k, v));
    }
    return query.getOne();
  }

  async add(schemaName: string, data: Record<string, any>): Promise<any> {
    if (!this.initialized) {
      throw new Error('Mapper not initialized. Call configure() first.');
    }
    return Mapper.base(schemaName).insert(data).exec();
  }

  async update(schemaName: string, filters: Record<string, any>, data: Record<string, any>): Promise<void> {
    if (!this.initialized) {
      throw new Error('Mapper not initialized. Call configure() first.');
    }
    const query = Mapper.base(schemaName).update(data);
    Object.entries(filters).forEach(([k, v]) => query.where(k, v));
    await query.exec();
  }

  async delete(schemaName: string, filters: Record<string, any>): Promise<void> {
    if (!this.initialized) {
      throw new Error('Mapper not initialized. Call configure() first.');
    }
    const query = Mapper.base(schemaName).delete();
    Object.entries(filters).forEach(([k, v]) => query.where(k, v));
    await query.exec();
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
