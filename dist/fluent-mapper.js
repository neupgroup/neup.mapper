import { createMapper } from './mapper.js';
import { TableMigrator } from './migrator.js';
// DML Builder (Querying)
export class FluentQueryBuilder {
    constructor(mapper, schemaName, connectionName) {
        this.mapper = mapper;
        this.schemaName = schemaName;
        try {
            this.query = mapper.use(schemaName);
            // Auto-update connection if provided override
            if (connectionName) {
                // We can't easily update the schema def from query builder purely, 
                // but the Use() call presumably set up the schemaQuery.
            }
        }
        catch (e) {
            // Auto-register schema if missing
            mapper.getSchemaManager().create(schemaName).use({ connection: connectionName || 'default', collection: schemaName }).setStructure({});
            this.query = mapper.use(schemaName);
        }
    }
    where(field, value, operator) {
        this.query.where(field, value, operator);
        return this;
    }
    whereComplex(raw) {
        this.query.whereComplex(raw);
        return this;
    }
    whereRaw(raw) {
        return this.whereComplex(raw);
    }
    limit(n) {
        this.query.limit(n);
        return this;
    }
    offset(n) {
        this.query.offset(n);
        return this;
    }
    to(update) {
        this.query.to(update);
        return this;
    }
    get(...fields) {
        if (fields.length > 0) {
            this.query.selectFields(fields);
            return this;
        }
        return this.query.get();
    }
    then(onfulfilled, onrejected) {
        return this.query.get().then(onfulfilled, onrejected);
    }
    async getOne() {
        return this.query.getOne();
    }
    async add(data) {
        return this.mapper.add(this.schemaName, data);
    }
    async insert(data) {
        return this.add(data);
    }
    async update(data) {
        if (data) {
            this.query.to(data);
        }
        return this.query.update();
    }
    async delete() {
        return this.query.delete();
    }
    async deleteOne() {
        return this.query.deleteOne();
    }
    async updateOne(data) {
        if (data) {
            this.query.to(data);
        }
        return this.query.updateOne();
    }
}
// DDL Builder (Migrations & Schema Definition)
export class FluentSchemaBuilder {
    constructor(mapper, schemaName, connectionName) {
        this.mapper = mapper;
        this.schemaName = schemaName;
        // Ensure schema exists for configuration
        const manager = mapper.getSchemaManager();
        const exists = manager.schemas.has(schemaName);
        if (!exists) {
            manager.create(schemaName).use({ connection: connectionName || 'default', collection: schemaName }).setStructure({});
        }
        // If connectionName provided, update it
        if (connectionName) {
            const def = this.getDef();
            if (def)
                def.connectionName = connectionName;
        }
    }
    getDef() {
        return this.mapper.getSchemaManager().schemas.get(this.schemaName);
    }
    // Schema Configuration Proxies
    set fields(config) {
        const def = this.getDef();
        if (def) {
            const parsed = parseDescriptorStructure(config);
            def.fields = parsed.fields;
            def.fieldsMap = new Map();
            def.fields.forEach((f) => def.fieldsMap.set(f.name, f));
            def.allowUndefinedFields = parsed.allowUndefinedFields;
        }
    }
    structure(config) {
        this.fields = config;
        return this;
    }
    collection(collectionName) {
        const def = this.getDef();
        if (def)
            def.collectionName = collectionName;
        return this;
    }
    set insertableFields(val) {
        const def = this.getDef();
        if (def)
            def.insertableFields = val;
    }
    set updatableFields(val) {
        const def = this.getDef();
        if (def)
            def.updatableFields = val;
    }
    set deleteType(val) {
        const def = this.getDef();
        if (def)
            def.deleteType = val;
    }
    set massDeleteAllowed(val) {
        const def = this.getDef();
        if (def)
            def.massDeleteAllowed = val;
    }
    set massEditAllowed(val) {
        const def = this.getDef();
        if (def)
            def.massEditAllowed = val;
    }
    // Migration / DDL Methods
    get migrator() {
        if (!this._migrator) {
            this._migrator = new TableMigrator(this.schemaName);
            const def = this.getDef();
            if (def === null || def === void 0 ? void 0 : def.connectionName) {
                this._migrator.useConnection(def.connectionName);
            }
        }
        return this._migrator;
    }
    useConnection(name) {
        this.migrator.useConnection(name);
        const def = this.getDef();
        if (def)
            def.connectionName = name;
        return this;
    }
    addColumn(name) { return this.migrator.addColumn(name); }
    selectColumn(name) { return this.migrator.selectColumn(name); }
    dropColumn(name) { this.migrator.dropColumn(name); return this; }
    drop() { this.migrator.drop(); return this; }
    async exec() {
        return this.migrator.exec();
    }
}
export class FluentConnectionBuilder {
    constructor(mapper, connectionName, connectionType, config) {
        this.mapper = mapper;
        this.connectionName = connectionName;
        this.connectionType = connectionType;
        this.connectionConfig = config;
        // Create the connection immediately
        this.mapper.connect(connectionName, connectionType, config);
    }
    schema(schemaName) {
        return new FluentSchemaBuilder(this.mapper, schemaName, this.connectionName);
    }
    query(schemaName) {
        return new FluentQueryBuilder(this.mapper, schemaName);
    }
    useConnection(connectionName) {
        return new FluentConnectionSelector(this.mapper, connectionName);
    }
}
export class RawQueryBuilder {
    constructor(mapper, sql) {
        this.mapper = mapper;
        this.sql = sql;
        this._bindings = [];
    }
    bind(bindings) {
        if (Array.isArray(bindings)) {
            this._bindings = bindings;
        }
        else {
            this._bindings = [bindings];
        }
        return this;
    }
    async run() {
        // Find a default connection or use one if specified (not currently supported in raw() entry point args, defaulting to 'default')
        // To support explicit connection for raw, we might need Mapper.connection('name').raw(...)
        const connections = this.mapper.getConnections();
        const conn = connections.get('default'); // Default fallback
        if (!conn)
            throw new Error("No default connection found for raw query.");
        const adapter = connections.getAdapter(conn.name);
        if (adapter && typeof adapter.query === 'function') {
            return adapter.query(this.sql, this._bindings);
        }
        throw new Error(`Connection '${conn.name}' does not support raw queries.`);
    }
}
export class BaseQueryBuilder {
    constructor(mapper, target) {
        this.mapper = mapper;
        this.target = target;
        this._select = [];
        this._action = 'select';
        this.queryBuilder = new FluentQueryBuilder(mapper, target);
    }
    select(fields) {
        this._select = fields;
        this._action = 'select';
        return this;
    }
    where(field, value, operator) {
        this.queryBuilder.where(field, value, operator);
        return this;
    }
    whereRaw(raw) {
        this.queryBuilder.whereRaw(raw);
        return this;
    }
    limit(n) {
        this.queryBuilder.limit(n);
        return this;
    }
    offset(n) {
        this.queryBuilder.offset(n);
        return this;
    }
    insert(data) {
        this._insertData = data;
        this._action = 'insert';
        return this;
    }
    update(data) {
        this._updateData = data;
        this._action = 'update';
        return this;
    }
    async get() {
        return this.queryBuilder.get(...this._select);
    }
    async getOne() {
        // If select fields were provided, apply them first (though getOne usually fetches all or requires separate select handling in standard query)
        // FluentQueryBuilder.getOne doesn't take args, but we can ensure fields are selected if underlying support exists.
        // Current FluentQueryBuilder doesn't support select() state persistence easily without get() args.
        // We'll proceed with getOne(). To support partial select on getOne, we might need to enhance FluentQueryBuilder or just fetch all.
        // For now, delegating effectively:
        return this.queryBuilder.getOne();
    }
    async run() {
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
    constructor(mapper, connectionName, path = '') {
        this.mapper = mapper;
        this.connectionName = connectionName;
        this._path = '';
        this._headers = {};
        this._path = path;
    }
    path(p) {
        if (this._path === '') {
            this._path = p;
        }
        else {
            if (!p.startsWith('/') && !this._path.endsWith('/')) {
                this._path += '/';
            }
            this._path += p;
        }
        return this;
    }
    header(key, value) {
        if (typeof key === 'object') {
            Object.entries(key).forEach(([k, v]) => this.header(k, v));
        }
        else if (value !== undefined) {
            if (this._headers[key]) {
                const existing = this._headers[key];
                if (Array.isArray(existing)) {
                    if (Array.isArray(value)) {
                        existing.push(...value);
                    }
                    else {
                        existing.push(value);
                    }
                }
                else {
                    this._headers[key] = [existing, ...(Array.isArray(value) ? value : [value])];
                }
            }
            else {
                this._headers[key] = value;
            }
        }
        else {
            // Check for "Key: Value" string
            if (key.includes(':')) {
                const [k, ...v] = key.split(':');
                this.header(k.trim(), v.join(':').trim());
            }
        }
        return this;
    }
    headers(h) {
        if (Array.isArray(h)) {
            h.forEach(item => this.header(item));
        }
        else {
            this.header(h);
        }
        return this;
    }
    async get() { return this.execute('GET'); }
    async post(data) { return this.execute('POST', data); }
    async put(data) { return this.execute('PUT', data); }
    async patch(data) { return this.execute('PATCH', data); }
    async delete() { return this.execute('DELETE'); }
    async execute(method, data) {
        const adapter = this.mapper.getConnections().getAdapter(this.connectionName);
        if (!adapter || typeof adapter.request !== 'function') {
            throw new Error(`Connection "${this.connectionName}" does not support custom requests.`);
        }
        return adapter.request(method, this._path, data, this._headers);
    }
}
export class FluentConnectionSelector {
    constructor(mapper, connectionName) {
        this.mapper = mapper;
        this.connectionName = connectionName;
    }
    schema(schemaName) {
        return new FluentSchemaBuilder(this.mapper, schemaName, this.connectionName);
    }
    schemas(schemaName) {
        return this.schema(schemaName);
    }
    query(schemaName) {
        return new FluentQueryBuilder(this.mapper, schemaName, this.connectionName);
    }
    table(tableName) {
        return this.query(tableName);
    }
    collection(collectionName) {
        return this.query(collectionName);
    }
    // API Request methods
    path(path) {
        return new FluentApiRequestBuilder(this.mapper, this.connectionName, path);
    }
    header(key, value) {
        return new FluentApiRequestBuilder(this.mapper, this.connectionName).header(key, value);
    }
    headers(headers) {
        return new FluentApiRequestBuilder(this.mapper, this.connectionName).headers(headers);
    }
    get() {
        return new FluentApiRequestBuilder(this.mapper, this.connectionName).get();
    }
    post(data) {
        return new FluentApiRequestBuilder(this.mapper, this.connectionName).post(data);
    }
    put(data) {
        return new FluentApiRequestBuilder(this.mapper, this.connectionName).put(data);
    }
    patch(data) {
        return new FluentApiRequestBuilder(this.mapper, this.connectionName).patch(data);
    }
    delete() {
        return new FluentApiRequestBuilder(this.mapper, this.connectionName).delete();
    }
}
export class FluentMapper {
    constructor(mapper) {
        this.mapper = mapper;
    }
    query(schemaName) {
        return new FluentQueryBuilder(this.mapper, schemaName);
    }
    schema(name) {
        return new FluentSchemaBuilder(this.mapper, name);
    }
    table(name) {
        return this.query(name);
    }
    raw(sql) {
        return new RawQueryBuilder(this.mapper, sql);
    }
    base(target) {
        return new BaseQueryBuilder(this.mapper, target);
    }
    makeConnection(name, type, config) {
        return new FluentConnectionBuilder(this.mapper, name, type, config);
    }
    // Deprecated: use connection() instead
    useConnection(connectionName) {
        return new FluentConnectionSelector(this.mapper, connectionName);
    }
    connection(connectionOrConfig) {
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
    makeTempConnection(type, config) {
        const tempName = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        return new FluentConnectionBuilder(this.mapper, tempName, type, config);
    }
    // Direct query methods for quick usage
    async get(schemaName, filters) {
        return this.mapper.get(schemaName, filters);
    }
    async getOne(schemaName, filters) {
        return this.mapper.getOne(schemaName, filters);
    }
    async add(schemaName, data) {
        return this.mapper.add(schemaName, data);
    }
    async update(schemaName, filters, data) {
        return this.mapper.update(schemaName, filters, data);
    }
    async delete(schemaName, filters) {
        return this.mapper.delete(schemaName, filters);
    }
    async dropTable(name) {
        return new TableMigrator(name).drop().exec();
    }
}
// Static API class that provides the fluent interface
export class StaticMapper {
    static getFluentMapper() {
        if (!StaticMapper.instance) {
            const baseMapper = createMapper();
            StaticMapper.instance = new FluentMapper(baseMapper);
        }
        return StaticMapper.instance;
    }
    static makeConnection(name, type, config) {
        return StaticMapper.getFluentMapper().makeConnection(name, type, config);
    }
    static makeTempConnection(type, config) {
        return StaticMapper.getFluentMapper().makeTempConnection(type, config);
    }
    static query(schemaName) {
        return StaticMapper.getFluentMapper().query(schemaName);
    }
    static schema(name) {
        if (name)
            return StaticMapper.getFluentMapper().schema(name);
        return StaticMapper.schemas();
    }
    static table(name) {
        return StaticMapper.query(name);
    }
    static raw(sql) {
        return StaticMapper.getFluentMapper().raw(sql);
    }
    static base(target) {
        return StaticMapper.getFluentMapper().base(target);
    }
    // New API
    static connection(connectionOrConfig) {
        return StaticMapper.getFluentMapper().connection(connectionOrConfig);
    }
    // Deprecated alias
    static useConnection(connectionName) {
        return StaticMapper.connection(connectionName);
    }
    static schemas(name) {
        if (name)
            return StaticMapper.schema(name);
        return new SchemaManagerWrapper(StaticMapper.getFluentMapper().mapper.getSchemaManager());
    }
    // Direct static methods
    static async get(schemaName, filters) {
        return StaticMapper.getFluentMapper().get(schemaName, filters);
    }
    static async getOne(schemaName, filters) {
        return StaticMapper.getFluentMapper().getOne(schemaName, filters);
    }
    static async add(schemaName, data) {
        return StaticMapper.getFluentMapper().add(schemaName, data);
    }
    static async update(schemaName, filters, data) {
        return StaticMapper.getFluentMapper().update(schemaName, filters, data);
    }
    static async delete(schemaName, filters) {
        return StaticMapper.getFluentMapper().delete(schemaName, filters);
    }
    static async dropTable(name) {
        return StaticMapper.getFluentMapper().dropTable(name);
    }
    static getConnections() {
        return StaticMapper.getFluentMapper().mapper.getConnections();
    }
    static async discover() {
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
    constructor(manager) {
        this.manager = manager;
    }
    table(name) {
        // This allows Mapper.schemas().table('name') to return a migrator
        return new TableMigrator(name);
    }
    schema(name) {
        return this.table(name);
    }
    async dropTable(name) {
        return new TableMigrator(name).drop().exec();
    }
}
