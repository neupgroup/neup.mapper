import { Connections, SchemaManager, type SchemaDef, ConnectionType } from './index.js';
import { createMapper } from './mapper.js';
import { TableMigrator } from './migrator.js';

export class FluentQueryBuilder {
  private mapper: any;
  private schemaName: string;
  private query: any;

  constructor(mapper: any, schemaName: string) {
    this.mapper = mapper;
    this.schemaName = schemaName;
    this.query = mapper.use(schemaName);
  }

  where(field: string, value: any, operator?: string): this {
    this.query.where(field, value, operator);
    return this;
  }

  whereComplex(raw: string): this {
    this.query.whereComplex(raw);
    return this;
  }

  limit(n: number): this {
    this.query.limit(n);
    return this;
  }

  offset(n: number): this {
    this.query.offset(n);
    return this;
  }

  to(update: Record<string, any>): this {
    this.query.to(update);
    return this;
  }

  // If args provided, act as SELECT (projection) and return this.
  // If no args, act as execute() (but this class is thenable so we can just return this if we want consistency, 
  // but existing API returns Promise directly. To check user intent:
  // User: get('f1').limit(1).
  // So get('f1') must return this.
  get(...fields: string[]): any {
    if (fields.length > 0) {
      // Apply field selection? SchemaQuery needs a way to filter fields.
      // We'll add this capability to Field filtering in SchemaQuery or just use 'fields' option in buildOptions.
      // For now, let's assume we can modify the query's field list.
      this.query.selectFields(fields);
      return this;
    }
    return this.query.get(); // Promise
  }

  // Make the builder thenable
  then(onfulfilled?: ((value: any) => any) | null, onrejected?: ((reason: any) => any) | null): Promise<any> {
    return this.query.get().then(onfulfilled, onrejected);
  }

  async getOne(): Promise<Record<string, any> | null> {
    return this.query.getOne();
  }

  async add(data: Record<string, any>): Promise<any> {
    return this.mapper.add(this.schemaName, data);
  }

  async insert(data: Record<string, any>): Promise<any> {
    return this.add(data);
  }

  async update(): Promise<void> {
    return this.query.update();
  }

  async delete(): Promise<void> {
    return this.query.delete();
  }

  async deleteOne(): Promise<void> {
    return this.query.deleteOne();
  }

  async updateOne(): Promise<void> {
    return this.query.updateOne();
  }
}

export class FluentConnectionBuilder {
  private mapper: any;
  private connectionName: string;
  private connectionType: string;
  private connectionConfig: Record<string, any>;

  constructor(mapper: any, connectionName: string, connectionType: string, config: Record<string, any>) {
    this.mapper = mapper;
    this.connectionName = connectionName;
    this.connectionType = connectionType;
    this.connectionConfig = config;

    // Create the connection immediately
    this.mapper.connect(connectionName, connectionType, config);
  }

  schema(schemaName: string): FluentSchemaBuilder {
    return new FluentSchemaBuilder(this.mapper, schemaName, this.connectionName);
  }

  query(schemaName: string): FluentQueryBuilder {
    return new FluentQueryBuilder(this.mapper, schemaName);
  }

  useConnection(connectionName: string): FluentConnectionSelector {
    return new FluentConnectionSelector(this.mapper, connectionName);
  }
}

export class FluentSchemaBuilder {
  private mapper: any;
  private schemaName: string;
  private connectionName: string;

  constructor(mapper: any, schemaName: string, connectionName: string) {
    this.mapper = mapper;
    this.schemaName = schemaName;
    this.connectionName = connectionName;
  }

  collection(collectionName: string): FluentSchemaCollectionBuilder {
    return new FluentSchemaCollectionBuilder(this.mapper, this.schemaName, this.connectionName, collectionName);
  }
}

export class FluentSchemaCollectionBuilder {
  private mapper: any;
  private schemaName: string;
  private connectionName: string;
  private collectionName: string;

  constructor(mapper: any, schemaName: string, connectionName: string, collectionName: string) {
    this.mapper = mapper;
    this.schemaName = schemaName;
    this.connectionName = connectionName;
    this.collectionName = collectionName;
  }

  structure(structure: Record<string, string> | Array<{ name: string; type: string;[key: string]: any }>): FluentMapper {
    this.mapper.schema(this.schemaName)
      .use({ connection: this.connectionName, collection: this.collectionName })
      .setStructure(structure);

    return new FluentMapper(this.mapper);
  }
}

export class FluentApiRequestBuilder {
  private _path: string = '';
  private _headers: Record<string, string | string[]> = {};

  constructor(private mapper: any, private connectionName: string, path: string = '') {
    this._path = path;
  }

  path(p: string): this {
    if (this._path === '') {
      this._path = p;
    } else {
      if (!p.startsWith('/') && !this._path.endsWith('/')) {
        this._path += '/';
      }
      this._path += p;
    }
    return this;
  }

  header(key: string | Record<string, string | string[]>, value?: string | string[]): this {
    if (typeof key === 'object') {
      Object.entries(key).forEach(([k, v]) => this.header(k, v));
    } else if (value !== undefined) {
      if (this._headers[key]) {
        const existing = this._headers[key];
        if (Array.isArray(existing)) {
          if (Array.isArray(value)) {
            existing.push(...value);
          } else {
            existing.push(value);
          }
        } else {
          this._headers[key] = [existing, ...(Array.isArray(value) ? value : [value])];
        }
      } else {
        this._headers[key] = value;
      }
    } else {
      // Check for "Key: Value" string
      if (key.includes(':')) {
        const [k, ...v] = key.split(':');
        this.header(k.trim(), v.join(':').trim());
      }
    }
    return this;
  }

  headers(h: Record<string, string | string[]> | any[]): this {
    if (Array.isArray(h)) {
      h.forEach(item => this.header(item));
    } else {
      this.header(h);
    }
    return this;
  }

  async get() { return this.execute('GET'); }
  async post(data?: any) { return this.execute('POST', data); }
  async put(data?: any) { return this.execute('PUT', data); }
  async patch(data?: any) { return this.execute('PATCH', data); }
  async delete() { return this.execute('DELETE'); }

  private async execute(method: string, data?: any) {
    const adapter = this.mapper.getConnections().getAdapter(this.connectionName);
    if (!adapter || typeof (adapter as any).request !== 'function') {
      throw new Error(`Connection "${this.connectionName}" does not support custom requests.`);
    }
    return (adapter as any).request(method, this._path, data, this._headers);
  }
}

export class FluentConnectionSelector {
  private mapper: any;
  private connectionName: string;

  constructor(mapper: any, connectionName: string) {
    this.mapper = mapper;
    this.connectionName = connectionName;
  }

  schema(schemaName: string): FluentSchemaBuilder {
    return new FluentSchemaBuilder(this.mapper, schemaName, this.connectionName);
  }

  query(schemaName: string): FluentQueryBuilder {
    return new FluentQueryBuilder(this.mapper, schemaName);
  }

  table(tableName: string): FluentQueryBuilder {
    return this.query(tableName);
  }

  collection(collectionName: string): FluentQueryBuilder {
    return this.query(collectionName);
  }

  schemas(schemaName: string): FluentSchemaWrapper {
    return new FluentSchemaWrapper(
      this.mapper.getSchemaManager(),
      schemaName,
      this.connectionName
    );
  }

  // API Request methods
  path(path: string): FluentApiRequestBuilder {
    return new FluentApiRequestBuilder(this.mapper, this.connectionName, path);
  }

  header(key: string | Record<string, string | string[]>, value?: string | string[]): FluentApiRequestBuilder {
    return new FluentApiRequestBuilder(this.mapper, this.connectionName).header(key, value);
  }

  headers(headers: Record<string, string> | any[]): FluentApiRequestBuilder {
    return new FluentApiRequestBuilder(this.mapper, this.connectionName).headers(headers);
  }

  get(): Promise<any> {
    return new FluentApiRequestBuilder(this.mapper, this.connectionName).get();
  }

  post(data?: any): Promise<any> {
    return new FluentApiRequestBuilder(this.mapper, this.connectionName).post(data);
  }

  put(data?: any): Promise<any> {
    return new FluentApiRequestBuilder(this.mapper, this.connectionName).put(data);
  }

  patch(data?: any): Promise<any> {
    return new FluentApiRequestBuilder(this.mapper, this.connectionName).patch(data);
  }

  delete(): Promise<any> {
    return new FluentApiRequestBuilder(this.mapper, this.connectionName).delete();
  }
}

export class FluentMapper {
  private mapper: any;

  constructor(mapper: any) {
    this.mapper = mapper;
  }

  query(schemaName: string): FluentQueryBuilder {
    return new FluentQueryBuilder(this.mapper, schemaName);
  }

  makeConnection(name: string, type: ConnectionType, config: Record<string, any>): FluentConnectionBuilder {
    return new FluentConnectionBuilder(this.mapper, name, type, config);
  }

  // Deprecated: use connection() instead
  useConnection(connectionName: string): FluentConnectionSelector {
    return new FluentConnectionSelector(this.mapper, connectionName);
  }

  connection(connectionOrConfig: string | Record<string, any>): FluentConnectionSelector {
    if (typeof connectionOrConfig === 'string') {
      return new FluentConnectionSelector(this.mapper, connectionOrConfig);
    }
    // Handle object config: create temp connection
    // Expected format: { type: '...', ...others }
    const type = connectionOrConfig.type;
    if (!type) {
      throw new Error("Connection configuration must specify 'type'");
    }
    const config = { ...connectionOrConfig };
    delete config.type;

    // Create temp connection
    const tempName = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    new FluentConnectionBuilder(this.mapper, tempName, type, config); // Registers it
    return new FluentConnectionSelector(this.mapper, tempName);
  }

  makeTempConnection(type: ConnectionType, config: Record<string, any>): FluentConnectionBuilder {
    const tempName = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return new FluentConnectionBuilder(this.mapper, tempName, type, config);
  }

  // Direct query methods for quick usage
  async get(schemaName: string, filters?: Record<string, any>): Promise<Record<string, any>[]> {
    return this.mapper.get(schemaName, filters);
  }

  async getOne(schemaName: string, filters?: Record<string, any>): Promise<Record<string, any> | null> {
    return this.mapper.getOne(schemaName, filters);
  }

  async add(schemaName: string, data: Record<string, any>): Promise<any> {
    return this.mapper.add(schemaName, data);
  }

  async update(schemaName: string, filters: Record<string, any>, data: Record<string, any>): Promise<void> {
    return this.mapper.update(schemaName, filters, data);
  }

  async delete(schemaName: string, filters: Record<string, any>): Promise<void> {
    return this.mapper.delete(schemaName, filters);
  }

  async dropTable(name: string): Promise<void> {
    return new TableMigrator(name).drop();
  }
}

// Static API class that provides the fluent interface
export class StaticMapper {
  private static instance: FluentMapper;

  private static getFluentMapper(): FluentMapper {
    if (!StaticMapper.instance) {
      const baseMapper = createMapper();
      StaticMapper.instance = new FluentMapper(baseMapper);
    }
    return StaticMapper.instance;
  }

  static makeConnection(name: string, type: ConnectionType, config: Record<string, any>): FluentConnectionBuilder {
    return StaticMapper.getFluentMapper().makeConnection(name, type, config);
  }



  static makeTempConnection(type: ConnectionType, config: Record<string, any>): FluentConnectionBuilder {
    return StaticMapper.getFluentMapper().makeTempConnection(type, config);
  }

  static query(schemaName: string): FluentQueryBuilder {
    return StaticMapper.getFluentMapper().query(schemaName);
  }

  // New API
  static connection(connectionOrConfig: string | Record<string, any>): FluentConnectionSelector {
    return StaticMapper.getFluentMapper().connection(connectionOrConfig);
  }

  // Deprecated alias
  static useConnection(connectionName: string): FluentConnectionSelector {
    return StaticMapper.connection(connectionName);
  }

  static schemas(name?: string): FluentSchemaWrapper | SchemaManagerWrapper {
    if (name) {
      return new FluentSchemaWrapper(
        (StaticMapper.getFluentMapper() as any).mapper.getSchemaManager(),
        name
      );
    }
    return new SchemaManagerWrapper(
      (StaticMapper.getFluentMapper() as any).mapper.getSchemaManager()
    );
  }

  // Direct static methods
  static async get(schemaName: string, filters?: Record<string, any>): Promise<Record<string, any>[]> {
    return StaticMapper.getFluentMapper().get(schemaName, filters);
  }

  static async getOne(schemaName: string, filters?: Record<string, any>): Promise<Record<string, any> | null> {
    return StaticMapper.getFluentMapper().getOne(schemaName, filters);
  }

  static async add(schemaName: string, data: Record<string, any>): Promise<any> {
    return StaticMapper.getFluentMapper().add(schemaName, data);
  }

  static async update(schemaName: string, filters: Record<string, any>, data: Record<string, any>): Promise<void> {
    return StaticMapper.getFluentMapper().update(schemaName, filters, data);
  }

  static async delete(schemaName: string, filters: Record<string, any>): Promise<void> {
    return StaticMapper.getFluentMapper().delete(schemaName, filters);
  }

  static async dropTable(name: string): Promise<void> {
    return StaticMapper.getFluentMapper().dropTable(name);
  }
}


// Export a default instance for convenience
export const Mapper = StaticMapper;
export default Mapper;

export class FluentSchemaWrapper {
  // builder unused

  constructor(private manager: SchemaManager, private name: string, private connectionName?: string) {
    // Ensure schema exists or create it?
    // User pattern: Mapper.schemas('name').fields = ...
    // So we likely need to create it if missing, or update it.
    try {
      this.manager.create(name).use({ connection: connectionName || 'default', collection: name }).setStructure({});
    } catch (e: any) {
      // Ignore if exists, but maybe update connection if strictly provided?
      // Use existing definition if available.
    }
  }

  private getDef() {
    // Access private map from manager? Or expose a get method.
    // Manager has .schemas map.
    return (this.manager as any).schemas.get(this.name);
  }

  set fields(config: any) {
    // Update schema structure
    const builder = new FluentSchemaBuilder(null, this.name, ''); // Dummy wrapper or use internal
    // Easier: use Manager.create(name) returns SchemaBuilder which has setStructure.
    // But if it exists, create() throws.
    // We need 'update' or direct access.
    // Let's hack: re-register or update def.
    const def = this.getDef();
    if (def) {
      // Re-parse
      const parsed = parseDescriptorStructure(config);
      def.fields = parsed.fields;
      def.fieldsMap = new Map();
      def.fields.forEach((f: any) => def.fieldsMap.set(f.name, f));
      def.allowUndefinedFields = parsed.allowUndefinedFields;
    }
  }

  set insertableFields(val: string[]) {
    const def = this.getDef();
    if (def) def.insertableFields = val;
  }

  set updatableFields(val: string[]) {
    const def = this.getDef();
    if (def) def.updatableFields = val;
  }

  set deleteType(val: 'softDelete' | 'hardDelete') {
    const def = this.getDef();
    if (def) def.deleteType = val;
  }

  set massDeleteAllowed(val: boolean) {
    const def = this.getDef();
    if (def) def.massDeleteAllowed = val;
  }

  set massEditAllowed(val: boolean) {
    const def = this.getDef();
    if (def) def.massEditAllowed = val;
  }

  // Delegation to QueryBuilder
  get(...fields: string[]) {
    const q = new FluentQueryBuilder({ use: (n: string) => this.manager.use(n) }, this.name);
    return q.get(...fields);
  }

  limit(n: number) {
    const q = new FluentQueryBuilder({ use: (n: string) => this.manager.use(n) }, this.name);
    return q.limit(n);
  }

  offset(n: number) {
    const q = new FluentQueryBuilder({ use: (n: string) => this.manager.use(n) }, this.name);
    return q.offset(n);
  }

  async insert(data: Record<string, any>): Promise<any> {
    const q = new FluentQueryBuilder({
      use: (n: string) => this.manager.use(n),
      add: (n: string, d: any) => this.manager.use(n).add(d)
    }, this.name);
    return q.insert(data);
  }

  async dropTable(): Promise<void> {
    const migrator = new TableMigrator(this.name);
    if (this.connectionName) {
      migrator.useConnection(this.connectionName);
    }
    return migrator.drop();
  }
}
// Helper to access parseDescriptorStructure from index.ts if not exported?
// It is NOT exported. I need to export it or duplicate logic.
// I'll export it from index.ts.
import { parseDescriptorStructure } from './index.js'; // fixed import at bottom

export class SchemaManagerWrapper {
  constructor(private manager: SchemaManager) { }

  table(name: string): TableMigrator {
    // This allows Mapper.schemas().table('name') to return a migrator
    return new TableMigrator(name);
  }

  async dropTable(name: string): Promise<void> {
    return new TableMigrator(name).drop();
  }
}