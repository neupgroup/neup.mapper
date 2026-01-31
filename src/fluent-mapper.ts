import { Connections, SchemaManager, type SchemaDef, ConnectionType } from './index.js';
import { createMapper } from './mapper.js';
import { TableMigrator } from './migrator.js';

// DML Builder (Querying)
export class FluentQueryBuilder {
  private mapper: any;
  private schemaName: string;
  private query: any;

  constructor(mapper: any, schemaName: string, connectionName?: string) {
    this.mapper = mapper;
    this.schemaName = schemaName;
    try {
      this.query = mapper.use(schemaName);
      // Auto-update connection if provided override
      if (connectionName) {
        // We can't easily update the schema def from query builder purely, 
        // but the Use() call presumably set up the schemaQuery.
      }
    } catch (e) {
      // Auto-register schema if missing
      mapper.getSchemaManager().create(schemaName).use({ connection: connectionName || 'default', collection: schemaName }).setStructure({});
      this.query = mapper.use(schemaName);
    }
  }

  where(field: string, value: any, operator?: string): this {
    this.query.where(field, value, operator);
    return this;
  }

  whereComplex(raw: string): this {
    this.query.whereComplex(raw);
    return this;
  }

  whereRaw(raw: string): this {
    return this.whereComplex(raw);
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

  get(...fields: string[]): any {
    if (fields.length > 0) {
      this.query.selectFields(fields);
      return this;
    }
    return this.query.get();
  }

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

  async update(data?: Record<string, any>): Promise<void> {
    if (data) {
      this.query.to(data);
    }
    return this.query.update();
  }

  async delete(): Promise<void> {
    return this.query.delete();
  }

  async deleteOne(): Promise<void> {
    return this.query.deleteOne();
  }

  async updateOne(data?: Record<string, any>): Promise<void> {
    if (data) {
      this.query.to(data);
    }
    return this.query.updateOne();
  }
}

// DDL Builder (Migrations & Schema Definition)
export class FluentSchemaBuilder {
  private mapper: any;
  private schemaName: string;
  private _migrator?: TableMigrator;

  constructor(mapper: any, schemaName: string, connectionName?: string) {
    this.mapper = mapper;
    this.schemaName = schemaName;

    // Ensure schema exists for configuration
    const manager = mapper.getSchemaManager();
    const exists = (manager as any).schemas.has(schemaName);
    if (!exists) {
      manager.create(schemaName).use({ connection: connectionName || 'default', collection: schemaName }).setStructure({});
    }

    // If connectionName provided, update it
    if (connectionName) {
      const def = this.getDef();
      if (def) def.connectionName = connectionName;
    }
  }

  private getDef(): SchemaDef {
    return (this.mapper.getSchemaManager() as any).schemas.get(this.schemaName);
  }

  // Schema Configuration Proxies
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

  structure(config: any): this {
    this.fields = config;
    return this;
  }

  collection(collectionName: string): this {
    const def = this.getDef();
    if (def) def.collectionName = collectionName;
    return this;
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

  // Migration / DDL Methods
  get migrator(): TableMigrator {
    if (!this._migrator) {
      this._migrator = new TableMigrator(this.schemaName);
      const def = this.getDef();
      if (def?.connectionName) {
        this._migrator.useConnection(def.connectionName);
      }
    }
    return this._migrator;
  }

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

export class RawQueryBuilder {
  private _bindings: any[] = [];

  constructor(private mapper: any, private sql: string) { }

  bind(bindings: any[] | any): this {
    if (Array.isArray(bindings)) {
      this._bindings = bindings;
    } else {
      this._bindings = [bindings];
    }
    return this;
  }

  async run(): Promise<any> {
    // Find a default connection or use one if specified (not currently supported in raw() entry point args, defaulting to 'default')
    // To support explicit connection for raw, we might need Mapper.connection('name').raw(...)
    const connections = this.mapper.getConnections();
    const conn = connections.get('default'); // Default fallback
    if (!conn) throw new Error("No default connection found for raw query.");

    const adapter = connections.getAdapter(conn.name);
    if (adapter && typeof (adapter as any).query === 'function') {
      return (adapter as any).query(this.sql, this._bindings);
    }
    throw new Error(`Connection '${conn.name}' does not support raw queries.`);
  }
}

export class BaseQueryBuilder {
  private queryBuilder: FluentQueryBuilder;
  private _select: string[] = [];
  private _insertData?: any;
  private _updateData?: any;
  private _action: 'select' | 'insert' | 'update' | 'delete' = 'select';

  constructor(private mapper: any, private target: string) {
    this.queryBuilder = new FluentQueryBuilder(mapper, target);
  }

  select(fields: string[]): this {
    this._select = fields;
    this._action = 'select';
    return this;
  }

  where(field: string, value: any, operator?: string): this {
    this.queryBuilder.where(field, value, operator);
    return this;
  }

  whereRaw(raw: string): this {
    this.queryBuilder.whereRaw(raw);
    return this;
  }

  limit(n: number): this {
    this.queryBuilder.limit(n);
    return this;
  }

  offset(n: number): this {
    this.queryBuilder.offset(n);
    return this;
  }

  insert(data: any): this {
    this._insertData = data;
    this._action = 'insert';
    return this;
  }

  update(data: any): this {
    this._updateData = data;
    this._action = 'update';
    return this;
  }

  async get(): Promise<any> {
    return this.queryBuilder.get(...this._select);
  }

  async getOne(): Promise<any> {
    // If select fields were provided, apply them first (though getOne usually fetches all or requires separate select handling in standard query)
    // FluentQueryBuilder.getOne doesn't take args, but we can ensure fields are selected if underlying support exists.
    // Current FluentQueryBuilder doesn't support select() state persistence easily without get() args.
    // We'll proceed with getOne(). To support partial select on getOne, we might need to enhance FluentQueryBuilder or just fetch all.
    // For now, delegating effectively:
    return this.queryBuilder.getOne();
  }

  async run(): Promise<any> {
    if (this._action === 'insert') {
      return this.queryBuilder.insert(this._insertData);
    }
    if (this._action === 'update') {
      return this.queryBuilder.update(this._updateData);
    }
    // Fallback or other actions
    return this.get();
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

  schemas(schemaName: string): FluentSchemaBuilder {
    return this.schema(schemaName);
  }

  query(schemaName: string): FluentQueryBuilder {
    return new FluentQueryBuilder(this.mapper, schemaName, this.connectionName);
  }

  table(tableName: string): FluentQueryBuilder {
    return this.query(tableName);
  }

  collection(collectionName: string): FluentQueryBuilder {
    return this.query(collectionName);
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

  schema(name: string): FluentSchemaBuilder {
    return new FluentSchemaBuilder(this.mapper, name);
  }

  table(name: string): FluentQueryBuilder {
    return this.query(name);
  }

  raw(sql: string): RawQueryBuilder {
    return new RawQueryBuilder(this.mapper, sql);
  }

  base(target: string): BaseQueryBuilder {
    return new BaseQueryBuilder(this.mapper, target);
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

  static schema(name: string): FluentSchemaBuilder;
  static schema(): SchemaManagerWrapper;
  static schema(name?: string): any {
    if (name) return StaticMapper.getFluentMapper().schema(name);
    return StaticMapper.schemas();
  }

  static table(name: string): FluentQueryBuilder {
    return StaticMapper.query(name);
  }

  static raw(sql: string): RawQueryBuilder {
    return StaticMapper.getFluentMapper().raw(sql);
  }

  static base(target: string): BaseQueryBuilder {
    return StaticMapper.getFluentMapper().base(target);
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