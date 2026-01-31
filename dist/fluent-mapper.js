import { createMapper } from './mapper.js';
import { TableMigrator } from './migrator.js';
export class FluentQueryBuilder {
    constructor(mapper, schemaName) {
        this.mapper = mapper;
        this.schemaName = schemaName;
        this.query = mapper.use(schemaName);
    }
    where(field, value, operator) {
        this.query.where(field, value, operator);
        return this;
    }
    whereComplex(raw) {
        this.query.whereComplex(raw);
        return this;
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
    // If args provided, act as SELECT (projection) and return this.
    // If no args, act as execute() (but this class is thenable so we can just return this if we want consistency, 
    // but existing API returns Promise directly. To check user intent:
    // User: get('f1').limit(1).
    // So get('f1') must return this.
    get(...fields) {
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
    async update() {
        return this.query.update();
    }
    async delete() {
        return this.query.delete();
    }
    async deleteOne() {
        return this.query.deleteOne();
    }
    async updateOne() {
        return this.query.updateOne();
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
export class FluentSchemaBuilder {
    constructor(mapper, schemaName, connectionName) {
        this.mapper = mapper;
        this.schemaName = schemaName;
        this.connectionName = connectionName;
    }
    collection(collectionName) {
        return new FluentSchemaCollectionBuilder(this.mapper, this.schemaName, this.connectionName, collectionName);
    }
}
export class FluentSchemaCollectionBuilder {
    constructor(mapper, schemaName, connectionName, collectionName) {
        this.mapper = mapper;
        this.schemaName = schemaName;
        this.connectionName = connectionName;
        this.collectionName = collectionName;
    }
    structure(structure) {
        this.mapper.schema(this.schemaName)
            .use({ connection: this.connectionName, collection: this.collectionName })
            .setStructure(structure);
        return new FluentMapper(this.mapper);
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
    query(schemaName) {
        return new FluentQueryBuilder(this.mapper, schemaName);
    }
    table(tableName) {
        return this.query(tableName);
    }
    collection(collectionName) {
        return this.query(collectionName);
    }
    schemas(schemaName) {
        return new FluentSchemaWrapper(this.mapper.getSchemaManager(), schemaName, this.connectionName);
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
    table(name) {
        return this.query(name);
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
    static table(name) {
        return StaticMapper.query(name);
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
        if (name) {
            return new FluentSchemaWrapper(StaticMapper.getFluentMapper().mapper.getSchemaManager(), name);
        }
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
export class FluentSchemaWrapper {
    // builder unused
    constructor(manager, name, connectionName) {
        this.manager = manager;
        this.name = name;
        this.connectionName = connectionName;
        // Ensure schema exists or create it?
        // User pattern: Mapper.schemas('name').fields = ...
        // So we likely need to create it if missing, or update it.
        try {
            this.manager.create(name).use({ connection: connectionName || 'default', collection: name }).setStructure({});
        }
        catch (e) {
            // Ignore if exists, but maybe update connection if strictly provided?
            // Use existing definition if available.
        }
    }
    getDef() {
        // Access private map from manager? Or expose a get method.
        // Manager has .schemas map.
        return this.manager.schemas.get(this.name);
    }
    set fields(config) {
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
            def.fields.forEach((f) => def.fieldsMap.set(f.name, f));
            def.allowUndefinedFields = parsed.allowUndefinedFields;
        }
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
    // Delegation to QueryBuilder
    get(...fields) {
        const q = new FluentQueryBuilder({ use: (n) => this.manager.use(n) }, this.name);
        return q.get(...fields);
    }
    limit(n) {
        const q = new FluentQueryBuilder({ use: (n) => this.manager.use(n) }, this.name);
        return q.limit(n);
    }
    offset(n) {
        const q = new FluentQueryBuilder({ use: (n) => this.manager.use(n) }, this.name);
        return q.offset(n);
    }
    async insert(data) {
        const q = new FluentQueryBuilder({
            use: (n) => this.manager.use(n),
            add: (n, d) => this.manager.use(n).add(d)
        }, this.name);
        return q.insert(data);
    }
    async dropTable() {
        const migrator = new TableMigrator(this.name);
        if (this.connectionName) {
            migrator.useConnection(this.connectionName);
        }
        return migrator.drop().exec();
    }
}
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
    async dropTable(name) {
        return new TableMigrator(name).drop().exec();
    }
}
