import { Connections, SchemaManager, type SchemaDef, ConnectionType } from './index.js';
import { createMapper } from './mapper.js';
import { TableMigrator } from './migrator.js';

export class FluentQueryBuilder {
  private mapper: any;
  private schemaName: string;
  private query: any;
  private _migrator?: TableMigrator;

  constructor(mapper: any, schemaName: string, connectionName?: string) {
    this.mapper = mapper;
    this.schemaName = schemaName;
    try {
      this.query = mapper.use(schemaName);
      if (connectionName) {
        const def = this.getDef();
        if (def) def.connectionName = connectionName;
      }
    } catch (e) {
      // Auto-register schema if missing (Automatically schemas!)
      mapper.getSchemaManager().create(schemaName).use({ connection: connectionName || 'default', collection: schemaName }).setStructure({});
      this.query = mapper.use(schemaName);
    }
  }

  getDef(): SchemaDef {
    return (this.mapper.getSchemaManager() as any).schemas.get(this.schemaName);
  }

  set fields(config: any) {
    const def = this.getDef();
    if (def) {
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

  structure(config: any): this {
    this.fields = config;
    return this;
  }

  collection(collectionName: string): this {
    const def = this.getDef();
    if (def) def.collectionName = collectionName;
    return this;
  }

  get migrator(): TableMigrator {
    if (!this._migrator) {
      this._migrator = new TableMigrator(this.schemaName);
      // Sync connection if already set on query
      const def = this.getDef();
      if (def?.connectionName) {
        this._migrator.useConnection(def.connectionName);
      }
    }
    return this._migrator;
  }

  // Migration/DDL Methods (Proxied to internal migrator)
  useConnection(name: string): this {
    this.migrator.useConnection(name);
    const def = this.getDef();
    if (def) def.connectionName = name;
    return this;
  }

  addColumn(name: string) { return this.migrator.addColumn(name); }
  selectColumn(name: string) { return this.migrator.selectColumn(name); }
  dropColumn(name: string) { this.migrator.dropColumn(name); return this; }
  drop() { this.migrator.drop(); return this; }

  async exec(): Promise<void> {
    return this.migrator.exec();
  }

  async dropTable(): Promise<void> {
    return this.migrator.drop().exec();
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

  schema(schemaName: string): FluentQueryBuilder {
    return new FluentQueryBuilder(this.mapper, schemaName, this.connectionName);
  }

  schemas(schemaName: string): FluentQueryBuilder {
    return this.schema(schemaName);
  }

  query(schemaName: string): FluentQueryBuilder {
    return this.schema(schemaName);
  }

  table(tableName: string): FluentQueryBuilder {
    return this.schema(tableName);
  }

  collection(collectionName: string): FluentQueryBuilder {
    return this.schema(collectionName);
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

  schema(name: string): FluentQueryBuilder {
    return this.query(name);
  }

  table(name: string): FluentQueryBuilder {
    return this.query(name);
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
    return new TableMigrator(name).drop().exec();
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

  static schema(name: string): FluentQueryBuilder;
  static schema(): SchemaManagerWrapper;
  static schema(name?: string): any {
    if (name) return StaticMapper.getFluentMapper().schema(name);
    return StaticMapper.schemas();
  }

  static table(name: string): FluentQueryBuilder {
    return StaticMapper.schema(name);
  }

  // New API
  static connection(connectionOrConfig: string | Record<string, any>): FluentConnectionSelector {
    return StaticMapper.getFluentMapper().connection(connectionOrConfig);
  }

  // Deprecated alias
  static useConnection(connectionName: string): FluentConnectionSelector {
    return StaticMapper.connection(connectionName);
  }

  static schemas(name?: string): any {
    if (name) return StaticMapper.schema(name);
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

  static getConnections(): Connections {
    return (StaticMapper.getFluentMapper() as any).mapper.getConnections();
  }

  static async discover(): Promise<void> {
    const { discover } = await import('./discovery.js');
    return discover();
  }
}


// Export a default instance for convenience
export const Mapper = StaticMapper;
export default Mapper;

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

  schema(name: string): TableMigrator {
    return this.table(name);
  }

  async dropTable(name: string): Promise<void> {
    return new TableMigrator(name).drop().exec();
  }
}