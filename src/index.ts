import type { DbAdapter, QueryOptions } from './orm';
import {
  AdapterMissingError,
  ConnectionExistingError,
  ConnectionUnknownError,
  DocumentMissingIdError,
  SchemaConfigurationError,
  SchemaExistingError,
  SchemaMissingError,
  UpdatePayloadMissingError,
} from './errors';

export type ColumnType = 'string' | 'number' | 'boolean' | 'date' | 'int';

export type ConnectionType = 'mysql' | 'sql' | 'firestore' | 'mongodb' | 'api';

export interface Field {
  name: string;
  type: ColumnType;
  editable?: boolean;
  autoIncrement?: boolean;
  nullable?: boolean;
  defaultValue?: unknown;
}

export interface SchemaDef {
  name: string;
  connectionName: string;
  collectionName: string;
  fields: Field[];
  allowUndefinedFields?: boolean;
}

class AdapterRegistry {
  private adaptersByConnection = new Map<string, DbAdapter>();

  attach(connectionName: string, adapter: DbAdapter) {
    this.adaptersByConnection.set(connectionName, adapter);
  }

  get(connectionName: string) {
    return this.adaptersByConnection.get(connectionName);
  }
}

interface ConnectionConfig {
  name: string;
  type: ConnectionType;
  key: Record<string, any>;
}

class ConnectionBuilder {
  constructor(private manager: Connections, private name: string, private type: ConnectionType) { }

  key(config: Record<string, any>) {
    this.manager.register({ name: this.name, type: this.type, key: config });
    return this.manager;
  }
}

export class Connections {
  private connections = new Map<string, ConnectionConfig>();
  private adapters = new AdapterRegistry();

  create(name: string, type: ConnectionType) {
    if (this.connections.has(name)) {
      throw new ConnectionExistingError(name);
    }
    return new ConnectionBuilder(this, name, type);
  }

  register(config: ConnectionConfig) {
    if (this.connections.has(config.name)) {
      throw new ConnectionExistingError(config.name);
    }
    this.connections.set(config.name, config);
    return this;
  }

  attachAdapter(name: string, adapter: DbAdapter) {
    if (!this.connections.has(name)) {
      throw new ConnectionUnknownError('attach adapter', name);
    }
    this.adapters.attach(name, adapter);
    return this;
  }

  get(name: string) {
    return this.connections.get(name);
  }

  getAdapter(name: string) {
    return this.adapters.get(name);
  }

  list() {
    return Array.from(this.connections.values());
  }
}

function parseDescriptorStructure(struct: Record<string, string>): { fields: Field[]; allowUndefinedFields: boolean } {
  let allowUndefinedFields = false;
  const fields: Field[] = [];
  for (const [key, descriptor] of Object.entries(struct)) {
    if (key === '?field') {
      // Presence of '?field' enables accepting fields not defined in the schema
      allowUndefinedFields = true;
      continue;
    }
    const tokens = descriptor.split(/\s+/).map(t => t.trim().toLowerCase()).filter(Boolean);
    const field: Field = {
      name: key,
      type: (tokens.find(t => ['string', 'number', 'boolean', 'date', 'int'].includes(t)) as ColumnType) || 'string',
      editable: tokens.includes('editable'),
      autoIncrement: tokens.includes('auto_increment') || tokens.includes('autoincrement'),
    };
    fields.push(field);
  }
  return { fields, allowUndefinedFields };
}

class SchemaBuilder {
  private connectionName?: string;
  private collectionName?: string;
  private fields: Field[] = [];
  private allowUndefinedFields = false;

  constructor(private manager: SchemaManager, private name: string) { }

  use(options: { connection: string; collection: string }) {
    this.connectionName = options.connection;
    this.collectionName = options.collection;
    return this;
  }

  setStructure(structure: Record<string, string> | Field[]) {
    if (Array.isArray(structure)) {
      this.fields = structure;
      this.allowUndefinedFields = false;
    } else {
      const parsed = parseDescriptorStructure(structure);
      this.fields = parsed.fields;
      this.allowUndefinedFields = parsed.allowUndefinedFields;
    }
    // Finalize schema registration
    if (!this.connectionName || !this.collectionName) {
      throw new SchemaConfigurationError('Schema.use({ connection, collection }) must be set before setStructure');
    }
    this.manager.register({
      name: this.name,
      connectionName: this.connectionName,
      collectionName: this.collectionName,
      fields: this.fields,
      allowUndefinedFields: this.allowUndefinedFields,
    });
    return this.manager;
  }
}

class SchemaQuery {
  private filters: { field: string; operator: string; value: any }[] = [];
  private rawWhere: string | null = null;
  private pendingUpdate: Record<string, any> | null = null;

  constructor(private manager: SchemaManager, private def: SchemaDef) { }

  // where('field','value', operator?) or where([field, value])
  where(fieldOrPair: string | [string, any], value?: any, operator?: string) {
    if (Array.isArray(fieldOrPair)) {
      const [field, v] = fieldOrPair;
      this.filters.push({ field, operator: '=', value: v });
    } else {
      const field = fieldOrPair;
      this.filters.push({ field, operator: operator ?? '=', value });
    }
    return this;
  }

  // Accept a raw complex where clause string
  whereComplex(raw: string) {
    this.rawWhere = raw;
    return this;
  }

  private buildOptions(): QueryOptions {
    return {
      collectionName: this.def.collectionName,
      filters: this.filters.map(f => ({ field: f.field, operator: f.operator, value: f.value })),
      limit: null,
      offset: null,
      sortBy: null,
      fields: this.def.fields.map(f => f.name),
      rawWhere: this.rawWhere,
    } as any;
  }

  to(update: Record<string, any>) {
    this.pendingUpdate = update;
    return this;
  }

  async get(): Promise<Record<string, any>[]> {
    const adapter = this.manager.getAdapter(this.def.connectionName);
    if (!adapter) throw new AdapterMissingError(this.def.connectionName);
    const options = this.buildOptions();
    const docs = adapter.get ? await adapter.get(options) : await adapter.getDocuments(options);
    return docs as any;
  }

  async getOne(): Promise<Record<string, any> | null> {
    const adapter = this.manager.getAdapter(this.def.connectionName);
    if (!adapter) throw new AdapterMissingError(this.def.connectionName);
    const options = this.buildOptions();
    if (adapter.getOne) {
      const one = await adapter.getOne(options);
      return (one as any) ?? null;
    }
    const results = adapter.get ? await adapter.get(options) : await adapter.getDocuments(options);
    return (results as any[])[0] || null;
  }

  async add(data: Record<string, any>) {
    const adapter = this.manager.getAdapter(this.def.connectionName);
    if (!adapter) throw new AdapterMissingError(this.def.connectionName);
    if (!this.def.allowUndefinedFields) {
      const allowed = new Set(this.def.fields.map(f => f.name));
      data = Object.fromEntries(Object.entries(data).filter(([k]) => allowed.has(k)));
    }
    return adapter.addDocument(this.def.collectionName, data as any);
  }

  async delete() {
    const adapter = this.manager.getAdapter(this.def.connectionName);
    if (!adapter) throw new AdapterMissingError(this.def.connectionName);
    const docs = await this.get();
    // Expect each doc has an 'id' field
    for (const d of docs) {
      const id = (d as any).id;
      if (!id) throw new DocumentMissingIdError('delete');
      await adapter.deleteDocument(this.def.collectionName, id);
    }
  }

  async deleteOne() {
    const one = await this.getOne();
    if (!one) return;
    const adapter = this.manager.getAdapter(this.def.connectionName);
    if (!adapter) throw new AdapterMissingError(this.def.connectionName);
    const id = (one as any).id;
    if (!id) throw new DocumentMissingIdError('deleteOne');
    await adapter.deleteDocument(this.def.collectionName, id);
  }

  async update() {
    const adapter = this.manager.getAdapter(this.def.connectionName);
    if (!adapter) throw new AdapterMissingError(this.def.connectionName);
    if (!this.pendingUpdate) throw new UpdatePayloadMissingError();
    const docs = await this.get();
    for (const d of docs) {
      const id = (d as any).id;
      if (!id) throw new DocumentMissingIdError('update');
      await adapter.updateDocument(this.def.collectionName, id, this.pendingUpdate as any);
    }
  }

  async updateOne() {
    const adapter = this.manager.getAdapter(this.def.connectionName);
    if (!adapter) throw new AdapterMissingError(this.def.connectionName);
    if (!this.pendingUpdate) throw new UpdatePayloadMissingError();
    const one = await this.getOne();
    if (!one) return;
    const id = (one as any).id;
    if (!id) throw new DocumentMissingIdError('updateOne');
    await adapter.updateDocument(this.def.collectionName, id, this.pendingUpdate as any);
  }
}

export class SchemaManager {
  private schemas = new Map<string, SchemaDef>();
  constructor(private connections: Connections) { }

  create(name: string) {
    if (this.schemas.has(name)) {
      throw new SchemaExistingError(name);
    }
    return new SchemaBuilder(this, name);
  }

  register(def: SchemaDef) {
    this.schemas.set(def.name, def);
    return this;
  }

  use(name: string) {
    const def = this.schemas.get(name);
    if (!def) throw new SchemaMissingError(name);
    return new SchemaQuery(this, def);
  }

  getAdapter(connectionName: string) {
    return this.connections.getAdapter(connectionName);
  }

  list() {
    return Array.from(this.schemas.values());
  }
}

export function connection() {
  return new Connections();
}

export function schema(conns?: Connections) {
  const ctx = conns || new Connections();
  return new SchemaManager(ctx);
}

export const schemas = (() => {
  const conns = new Connections();
  return new SchemaManager(conns);
})();

export { createOrm } from './orm';
export type { DbAdapter, QueryOptions };
export { parseConnectionsDsl, toNormalizedConnections } from './env';
export type { EnvDslConnections, NormalizedConnection } from './env';
export { documentationMd, markdownToHtml, getDocumentationHtml } from './docs';

// Export the simplified Mapper and default instance
export { Mapper, createMapper } from './mapper';
export { default } from './mapper';

// Export the new fluent/static API
export { StaticMapper } from './fluent-mapper';
export type {
  FluentQueryBuilder,
  FluentConnectionBuilder,
  FluentSchemaBuilder,
  FluentSchemaCollectionBuilder,
  FluentConnectionSelector,
  FluentMapper
} from './fluent-mapper';

// Export the new config-based system
export {
  ConfigBasedMapper,
  ConfigLoader,
  createConfigMapper,
  getConfigMapper,
  createDefaultMapper
} from './config';
export type {
  MapperConfig,
  ConnectionConfig,
  DatabaseConnectionConfig,
  ApiConnectionConfig,
  ConfigSchema
} from './config';

// Export database adapters
export {
  MySQLAdapter,
  createMySQLAdapter,
  PostgreSQLAdapter,
  createPostgreSQLAdapter,
  MongoDBAdapter,
  createMongoDBAdapter,
  APIAdapter,
  createAPIAdapter,
  createAdapter,
  createAdapterFromUrl,
  autoAttachAdapter
} from './adapters';
export type {
  MySQLConfig,
  PostgreSQLConfig,
  MongoDBConfig,
  APIAdapterConfig,
  AdapterConfig
} from './adapters';

export {
  MapperError,
  AdapterMissingError,
  UpdatePayloadMissingError,
  DocumentMissingIdError,
  ConnectionExistingError,
  ConnectionUnknownError,
  SchemaExistingError,
  SchemaMissingError,
  SchemaConfigurationError,
} from './errors';

export { Connector, mapper } from './connector.js';
