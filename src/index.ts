import type { DbAdapter, QueryOptions } from './orm/index.js';
import {
  AdapterMissingError,
  ConnectionExistingError,
  ConnectionUnknownError,
  DocumentMissingIdError,
  SchemaConfigurationError,
  SchemaExistingError,
  SchemaMissingError,
  UpdatePayloadMissingError,
} from './errors.js';

export type ColumnType = 'string' | 'number' | 'boolean' | 'date' | 'int';

export type ConnectionType = 'mysql' | 'sql' | 'firestore' | 'mongodb' | 'postgres' | 'api' | 'sqlite';

export interface Field {
  name: string;
  type: ColumnType;
  editable?: boolean;
  autoIncrement?: boolean;
  nullable?: boolean;
  defaultValue?: any;
  isUnique?: boolean;
  isForeignKey?: boolean;
  foreignRef?: string;
  enumValues?: any[];
  config?: any[]; // Store the raw user config
}

export interface SchemaDef {
  name: string;
  connectionName: string;
  collectionName: string;
  fields: Field[];
  fieldsMap: Map<string, Field>; // Fast lookup
  allowUndefinedFields?: boolean;
  // New features
  insertableFields?: string[];
  updatableFields?: string[];
  deleteType: 'softDelete' | 'hardDelete';
  massDeleteAllowed: boolean;
  massEditAllowed: boolean;
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

function parseFieldRule(field: Field, rule: any) {
  if (Array.isArray(rule)) {
    // Enum or options
    field.enumValues = rule;
    field.type = 'string'; // Usually enums are strings
    return;
  }
  if (typeof rule !== 'string') return;

  if (rule === 'auto-increment') field.autoIncrement = true;
  if (rule === 'unique') field.isUnique = true;
  if (rule.startsWith('max.')) { /* Validation ref */ }
  if (rule === 'enum') { /* marker */ }

  if (rule === 'default_current_datetime' || rule === 'default.currentDatetime') {
    field.defaultValue = 'NOW()';
  }
  if (rule.startsWith('default.value')) {
    // Handling 'default.value', 'actualValue' pattern if passed as array items or just parsing string?
    // User said: 'default.value', 'value'
    // This parser handles single string rules from the array.
    // We might need to look ahead in the loop for values, but usually 'value' is separate.
    // For now assuming the user provided array is flat: ['string', 'default.value', 'foo']
    // But user example: 'gender' : ['string', 'max.10', 'enum', ['option1', 'option2']];
  }

  // Foreign key: 'foreignKey.tableName.fieldName'
  if (rule.startsWith('foreignKey.')) {
    field.isForeignKey = true;
    field.foreignRef = rule.replace('foreignKey.', '');
  }
}

export function parseDescriptorStructure(struct: Record<string, string | any[]>): { fields: Field[]; allowUndefinedFields: boolean } {
  let allowUndefinedFields = false;
  const fields: Field[] = [];

  for (const [key, descriptor] of Object.entries(struct)) {
    if (key === '?field') {
      allowUndefinedFields = true;
      continue;
    }

    const field: Field = {
      name: key,
      type: 'string', // default
      config: Array.isArray(descriptor) ? descriptor : [descriptor]
    };

    const rules = Array.isArray(descriptor) ? descriptor : (descriptor as string).split(/\s+/);

    // First item is typically type if strictly following example ['integer', ...]
    if (rules.length > 0 && typeof rules[0] === 'string') {
      const t = rules[0].toLowerCase();
      if (['string', 'integer', 'number', 'boolean', 'datetime', 'date', 'int'].includes(t)) {
        field.type = (t === 'integer' ? 'int' : t === 'datetime' ? 'date' : t) as ColumnType;
      }
    }

    for (let i = 0; i < rules.length; i++) {
      const rule = rules[i];
      if (rule === 'default.value' && i + 1 < rules.length) {
        field.defaultValue = rules[i + 1];
        i++; // Skip next
      } else {
        parseFieldRule(field, rule);
      }
    }

    fields.push(field);
  }
  return { fields, allowUndefinedFields };
}

class SchemaBuilder {
  private connectionName?: string;
  private collectionName?: string;
  private fields: Field[] = [];
  private allowUndefinedFields = false;

  // New config
  private insertableFields?: string[];
  private updatableFields?: string[];
  private deleteType: 'softDelete' | 'hardDelete' = 'hardDelete';
  private massDeleteAllowed: boolean = true;
  private massEditAllowed: boolean = true;

  constructor(private manager: SchemaManager, private name: string) { }

  use(options: { connection: string; collection: string }) {
    this.connectionName = options.connection;
    this.collectionName = options.collection;
    return this;
  }

  // New configuration methods
  setOptions(options: {
    insertableFields?: string[],
    updatableFields?: string[],
    deleteType?: 'softDelete' | 'hardDelete',
    massDeleteAllowed?: boolean,
    massEditAllowed?: boolean
  }) {
    if (options.insertableFields) this.insertableFields = options.insertableFields;
    if (options.updatableFields) this.updatableFields = options.updatableFields;
    if (options.deleteType) this.deleteType = options.deleteType;
    if (options.massDeleteAllowed !== undefined) this.massDeleteAllowed = options.massDeleteAllowed;
    if (options.massEditAllowed !== undefined) this.massEditAllowed = options.massEditAllowed;
    return this;
  }

  setStructure(structure: Record<string, any> | Field[]) {
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
      // Fallback or error? User might set connection later or globally? 
      // For now, allow lazy registration if connection generic, but the prompt implies explicit definition flow.
      // If not set, we might throw or wait. The original threw error.
      // But user provided: "Mapper.schemas('name').get()..." -> implies definition might happen elsewhere or connection is optional if already defined.
    }

    const fieldsMap = new Map<string, Field>();
    this.fields.forEach(f => fieldsMap.set(f.name, f));

    this.manager.register({
      name: this.name,
      connectionName: this.connectionName!, // Assuming set
      collectionName: this.collectionName!,
      fields: this.fields,
      fieldsMap,
      allowUndefinedFields: this.allowUndefinedFields,
      insertableFields: this.insertableFields,
      updatableFields: this.updatableFields,
      deleteType: this.deleteType,
      massDeleteAllowed: this.massDeleteAllowed,
      massEditAllowed: this.massEditAllowed
    });
    return this.manager;
  }
}

class SchemaQuery {
  private filters: { field: string; operator: string; value: any }[] = [];
  private rawWhere: string | null = null;
  private pendingUpdate: Record<string, any> | null = null;
  private cachedAdapter: DbAdapter | null = null;
  private cachedFieldNames: string[];
  private allowedFields: Set<string>;

  private _limit: number | null = null;
  private _offset: number | null = null;

  constructor(private manager: SchemaManager, private def: SchemaDef) {
    this.cachedFieldNames = this.def.fields.map(f => f.name);
    this.allowedFields = new Set(this.cachedFieldNames);
  }

  limit(n: number) {
    this._limit = n;
    return this;
  }

  offset(n: number) {
    this._offset = n;
    return this;
  }

  selectFields(fields: string[]) {
    // Validate fields exist?
    // For now just restrict cachedFieldNames to this subset for the query options
    // But cachedFieldNames is used by other things?
    // Clone?
    // Let's store a projection override.
    this.cachedFieldNames = fields;
    return this;
  }

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
      filters: this.filters,
      limit: this._limit,
      offset: this._offset,
      sortBy: null,
      fields: this.cachedFieldNames,
      rawWhere: this.rawWhere,
    } as any;
  }

  private getAdapter(): DbAdapter {
    if (this.cachedAdapter) return this.cachedAdapter;
    const adapter = this.manager.getAdapter(this.def.connectionName);
    if (!adapter) throw new AdapterMissingError(this.def.connectionName);
    this.cachedAdapter = adapter;
    return adapter;
  }

  to(update: Record<string, any>) {
    this.pendingUpdate = update;
    return this;
  }

  async get(): Promise<Record<string, any>[]> {
    const adapter = this.getAdapter();
    const options = this.buildOptions();
    const docs = adapter.get ? await adapter.get(options) : await adapter.getDocuments(options);
    return docs as any;
  }

  async getOne(): Promise<Record<string, any> | null> {
    const adapter = this.getAdapter();
    const options = this.buildOptions();
    options.limit = 1;
    if (adapter.getOne) {
      const one = await adapter.getOne(options);
      return (one as any) ?? null;
    }
    const results = adapter.get ? await adapter.get(options) : await adapter.getDocuments(options);
    return (results as any[])[0] || null;
  }

  async add(data: Record<string, any>) {
    const adapter = this.getAdapter();

    // 1. Filter restricted fields if configured
    if (this.def.insertableFields) {
      const allowed = new Set(this.def.insertableFields);
      data = Object.fromEntries(Object.entries(data).filter(([k]) => allowed.has(k)));
    } else if (!this.def.allowUndefinedFields) {
      // Exclude system fields or unspecified fields
      data = Object.fromEntries(Object.entries(data).filter(([k]) => this.allowedFields.has(k)));
    }

    // 2. Apply defaults
    for (const field of this.def.fields) {
      if (data[field.name] === undefined && field.defaultValue !== undefined) {
        if (field.defaultValue === 'NOW()') {
          data[field.name] = new Date(); // Or string format depending on adapter
        } else {
          data[field.name] = field.defaultValue;
        }
      }
    }

    return adapter.addDocument(this.def.collectionName, data as any);
  }

  async delete() {
    const adapter = this.getAdapter();

    // Mass delete check
    if (!this.def.massDeleteAllowed && this.filters.length === 0 && !this._limit) {
      // Enforce limit 1 if no filters and mass delete not allowed?
      // User said: "if false, automatically add limit of 1"
      this._limit = 1;
    }

    if (this.def.deleteType === 'softDelete') {
      // Perform update instead
      return this.to({ deletedOn: new Date() }).update();
    }

    const docs = await this.get();
    for (const d of docs) {
      const id = (d as any).id;
      if (!id) throw new DocumentMissingIdError('delete');
      await adapter.deleteDocument(this.def.collectionName, id);
    }
  }

  async deleteOne() {
    this._limit = 1;
    return this.delete();
  }

  async update() {
    const adapter = this.getAdapter();
    if (!this.pendingUpdate) throw new UpdatePayloadMissingError();
    let data = this.pendingUpdate;

    // Filter updatable fields
    if (this.def.updatableFields) {
      const allowed = new Set(this.def.updatableFields);
      data = Object.fromEntries(Object.entries(data).filter(([k]) => allowed.has(k)));
    }

    // Mass edit check
    if (!this.def.massEditAllowed && this.filters.length === 0 && !this._limit) {
      this._limit = 1;
    }

    const docs = await this.get();
    for (const d of docs) {
      const id = (d as any).id;
      if (!id) throw new DocumentMissingIdError('update');
      await adapter.updateDocument(this.def.collectionName, id, data as any);
    }
  }

  async updateOne() {
    this._limit = 1;
    return this.update();
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

export { createOrm } from './orm/index.js';
export type { DbAdapter, QueryOptions };
export { parseConnectionsDsl, toNormalizedConnections } from './env.js';
export type { EnvDslConnections, NormalizedConnection } from './env.js';
export { documentationMd, markdownToHtml, getDocumentationHtml } from './docs.js';

// Export the simplified Mapper and default instance
export { Mapper, createMapper } from './mapper.js';
export { default } from './mapper.js';

// Export the new fluent/static API
export { StaticMapper } from './fluent-mapper.js';
export type {
  FluentQueryBuilder,
  FluentConnectionBuilder,
  FluentSchemaBuilder,
  FluentSchemaCollectionBuilder,
  FluentConnectionSelector,
  FluentMapper
} from './fluent-mapper.js';

// Export the new config-based system
export {
  ConfigBasedMapper,
  ConfigLoader,
  createConfigMapper,
  getConfigMapper,
  createDefaultMapper
} from './config.js';
export type {
  MapperConfig,
  ConnectionConfig,
  DatabaseConnectionConfig,
  ApiConnectionConfig,
  SqliteConnectionConfig,
  ConfigSchema
} from './config.js';

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
} from './adapters/index.js';
export type {
  MySQLConfig,
  PostgreSQLConfig,
  MongoDBConfig,
  APIAdapterConfig,
  AdapterConfig
} from './adapters/index.js';

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
} from './errors.js';

export { Connector, mapper } from './connector.js';
export { TableMigrator, ColumnBuilder } from './migrator.js';

