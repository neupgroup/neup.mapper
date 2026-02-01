import { Connections } from './connections.js';
import { SchemaManager } from './schema-manager.js';
import { ConnectionType } from './types-core.js';
import { autoAttachAdapter } from './adapters/index.js';
import { BaseDispatcher } from './builders/base-dispatcher.js';
import { SchemaDispatcher } from './builders/schema-builders.js';
import { RawBuilder } from './builders/raw-builder.js';
import { FluentConnectionSelector } from './fluent-mapper.js';

export class Mapper {
  private connections: Connections;
  private schemaManager: SchemaManager;
  private static instance: Mapper;
  private configured = false;

  constructor() {
    this.connections = new Connections();
    this.schemaManager = new SchemaManager(this.connections);
  }

  static getInstance(): Mapper {
    if (!Mapper.instance) {
      Mapper.instance = new Mapper();
      Mapper.instance.autoConfigure();
    }
    return Mapper.instance;
  }

  // Static Fluent API Entry Points
  static base(target: string): BaseDispatcher {
    // Default connection usage
    return new BaseDispatcher(Mapper.getInstance(), target);
  }

  static connection(name: string): FluentConnectionSelector {
    return new FluentConnectionSelector(Mapper.getInstance(), name);
  }

  static query(target: string): BaseDispatcher {
    return Mapper.base(target);
  }

  static schema(name: string): SchemaDispatcher {
    return new SchemaDispatcher(Mapper.getInstance(), name);
  }

  static raw(sql: string): RawBuilder {
    return new RawBuilder(Mapper.getInstance(), sql);
  }

  static connect(name: string, type: ConnectionType, config: Record<string, any>): Mapper {
    const mapper = Mapper.getInstance();
    mapper.connect(name, type, config);
    return mapper;
  }

  static async discover(): Promise<any> {
    const { discover } = await import('./discovery.js');
    return discover();
  }

  static async get(target: string): Promise<any> {
    return Mapper.base(target).select().get();
  }

  static async add(target: string, data: any): Promise<any> {
    return Mapper.base(target).insert(data).run();
  }

  // Auto-configuration based on environment or defaults
  autoConfigure(): this {
    if (this.configured) return this;
    this.configured = true;

    // Check for environment variables or config files
    const envConfig = this.detectEnvironmentConfig();

    if (envConfig) {
      this.applyConfig(envConfig);
    } else {
      // Use sensible defaults
      this.applyDefaultConfig();
    }

    return this;
  }

  private detectEnvironmentConfig(): any {
    // Check for common environment variables or config files
    if (typeof process !== 'undefined' && process.env) {
      // Node.js environment
      const dbUrl = process.env.DATABASE_URL;
      if (dbUrl) {
        return {
          connection: {
            name: 'default',
            type: this.inferConnectionType(dbUrl),
            key: { url: dbUrl }
          }
        };
      }
    }

    // Check for browser environment with global config
    if (typeof window !== 'undefined' && (window as any).__MAPPER_CONFIG__) {
      return (window as any).__MAPPER_CONFIG__;
    }

    return null;
  }

  private inferConnectionType(url: string): ConnectionType {
    if (url.includes('mysql')) return 'mysql';
    if (url.includes('postgres') || url.includes('postgresql')) return 'postgres';
    if (url.includes('mongodb')) return 'mongodb';
    if (url.includes('firestore')) return 'firestore';
    if (url.includes('sqlite') || url.endsWith('.db') || url.endsWith('.sqlite')) return 'sqlite';
    return 'sqlite'; // Default fallback instead of api
  }

  private applyConfig(config: any): void {
    if (config.connection) {
      const conn = config.connection;
      this.connections.create(conn.name, conn.type).key(conn.key);
    }

    if (config.schemas) {
      for (const schemaConfig of config.schemas) {
        this.createSchema(schemaConfig);
      }
    }
  }

  private applyDefaultConfig(): void {
    // No default connection by default to enforce explicit setup or discovery
  }

  private createSchema(config: any): void {
    const builder = this.schemaManager.create(config.name);
    if (config.connection && config.collection) {
      builder.use({ connection: config.connection, collection: config.collection });
    }
    if (config.structure) {
      builder.setStructure(config.structure);
    }
  }

  // Simplified API methods
  connect(name: string, type: ConnectionType, config: Record<string, any>): this {
    this.connections.create(name, type).key(config);
    autoAttachAdapter(this.connections, name, type, config);
    return this;
  }

  schema(name: string): ReturnType<SchemaManager['create']> {
    return this.schemaManager.create(name);
  }

  use(schemaName: string): ReturnType<SchemaManager['use']> {
    return this.schemaManager.use(schemaName);
  }

  // Quick query methods
  async get(schemaName: string, filters?: Record<string, any>): Promise<Record<string, any>[]> {
    const query = this.use(schemaName);
    if (filters) {
      Object.entries(filters).forEach(([field, value]) => {
        query.where(field, value);
      });
    }
    return query.get();
  }

  async getOne(schemaName: string, filters?: Record<string, any>): Promise<Record<string, any> | null> {
    const query = this.use(schemaName);
    if (filters) {
      Object.entries(filters).forEach(([field, value]) => {
        query.where(field, value);
      });
    }
    return query.getOne();
  }

  async add(schemaName: string, data: Record<string, any>): Promise<any> {
    return this.use(schemaName).add(data);
  }

  async update(schemaName: string, filters: Record<string, any>, data: Record<string, any>): Promise<void> {
    const query = this.use(schemaName);
    Object.entries(filters).forEach(([field, value]) => {
      query.where(field, value);
    });
    await query.to(data).update();
  }

  async delete(schemaName: string, filters: Record<string, any>): Promise<void> {
    const query = this.use(schemaName);
    Object.entries(filters).forEach(([field, value]) => {
      query.where(field, value);
    });
    await query.delete();
  }

  // Get the underlying managers for advanced usage
  getConnections(): Connections {
    return this.connections;
  }

  getSchemaManager(): SchemaManager {
    return this.schemaManager;
  }
}

// Create and configure the default instance
export const createMapper = (): Mapper => {
  const mapper = Mapper.getInstance();
  mapper.autoConfigure();
  return mapper;
};

// Export a ready-to-use default instance
export default createMapper();