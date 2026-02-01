import { Connections } from './connections.js';
import { AdapterMissingError, DocumentMissingIdError, SchemaExistingError, SchemaMissingError, UpdatePayloadMissingError, } from './errors.js';
function parseFieldRule(field, rule) {
    if (Array.isArray(rule)) {
        // Enum or options
        field.enumValues = rule;
        field.type = 'string'; // Usually enums are strings
        return;
    }
    if (typeof rule !== 'string')
        return;
    if (rule === 'auto-increment')
        field.autoIncrement = true;
    if (rule === 'unique')
        field.isUnique = true;
    if (rule.startsWith('max.')) { /* Validation ref */ }
    if (rule === 'enum') { /* marker */ }
    if (rule === 'default_current_datetime' || rule === 'default.currentDatetime') {
        field.defaultValue = 'NOW()';
    }
    if (rule.startsWith('default.value')) {
        // Handling 'default.value', 'actualValue' pattern
    }
    // Foreign key: 'foreignKey.tableName.fieldName'
    if (rule.startsWith('foreignKey.')) {
        field.isForeignKey = true;
        field.foreignRef = rule.replace('foreignKey.', '');
    }
}
export function parseDescriptorStructure(struct) {
    let allowUndefinedFields = false;
    const fields = [];
    for (const [key, descriptor] of Object.entries(struct)) {
        if (key === '?field') {
            allowUndefinedFields = true;
            continue;
        }
        const field = {
            name: key,
            type: 'string', // default
            config: Array.isArray(descriptor) ? descriptor : [descriptor]
        };
        const rules = Array.isArray(descriptor) ? descriptor : descriptor.split(/\s+/);
        // First item is typically type if strictly following example ['integer', ...]
        if (rules.length > 0 && typeof rules[0] === 'string') {
            const t = rules[0].toLowerCase();
            if (['string', 'integer', 'number', 'boolean', 'datetime', 'date', 'int'].includes(t)) {
                field.type = (t === 'integer' ? 'int' : t === 'datetime' ? 'date' : t);
            }
        }
        for (let i = 0; i < rules.length; i++) {
            const rule = rules[i];
            if (rule === 'default.value' && i + 1 < rules.length) {
                field.defaultValue = rules[i + 1];
                i++; // Skip next
            }
            else {
                parseFieldRule(field, rule);
            }
        }
        fields.push(field);
    }
    return { fields, allowUndefinedFields };
}
export class SchemaBuilder {
    constructor(manager, name) {
        this.manager = manager;
        this.name = name;
        this.fields = [];
        this.allowUndefinedFields = false;
        this.deleteType = 'hardDelete';
        this.massDeleteAllowed = true;
        this.massEditAllowed = true;
    }
    use(options) {
        this.connectionName = options.connection;
        this.collectionName = options.collection;
        return this;
    }
    // New configuration methods
    setOptions(options) {
        if (options.insertableFields)
            this.insertableFields = options.insertableFields;
        if (options.updatableFields)
            this.updatableFields = options.updatableFields;
        if (options.deleteType)
            this.deleteType = options.deleteType;
        if (options.massDeleteAllowed !== undefined)
            this.massDeleteAllowed = options.massDeleteAllowed;
        if (options.massEditAllowed !== undefined)
            this.massEditAllowed = options.massEditAllowed;
        return this;
    }
    setStructure(structure) {
        if (Array.isArray(structure)) {
            this.fields = structure;
            this.allowUndefinedFields = false;
        }
        else {
            const parsed = parseDescriptorStructure(structure);
            this.fields = parsed.fields;
            this.allowUndefinedFields = parsed.allowUndefinedFields;
        }
        // Finalize schema registration
        if (!this.connectionName || !this.collectionName) {
            // Fallback or error?
        }
        const fieldsMap = new Map();
        this.fields.forEach(f => fieldsMap.set(f.name, f));
        this.manager.register({
            name: this.name,
            connectionName: this.connectionName, // Assuming set
            collectionName: this.collectionName,
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
export class SchemaQuery {
    constructor(manager, def) {
        this.manager = manager;
        this.def = def;
        this.filters = [];
        this.rawWhere = null;
        this.pendingUpdate = null;
        this.cachedAdapter = null;
        this._limit = null;
        this._offset = null;
        this.cachedFieldNames = this.def.fields.map(f => f.name);
        this.allowedFields = new Set(this.cachedFieldNames);
    }
    limit(n) {
        this._limit = n;
        return this;
    }
    offset(n) {
        this._offset = n;
        return this;
    }
    selectFields(fields) {
        this.cachedFieldNames = fields;
        return this;
    }
    where(fieldOrPair, value, operator) {
        if (Array.isArray(fieldOrPair)) {
            const [field, v] = fieldOrPair;
            this.filters.push({ field, operator: '=', value: v });
        }
        else {
            const field = fieldOrPair;
            this.filters.push({ field, operator: operator !== null && operator !== void 0 ? operator : '=', value });
        }
        return this;
    }
    whereComplex(raw) {
        this.rawWhere = raw;
        return this;
    }
    buildOptions() {
        return {
            collectionName: this.def.collectionName,
            filters: this.filters,
            limit: this._limit,
            offset: this._offset,
            sortBy: null,
            fields: this.cachedFieldNames,
            rawWhere: this.rawWhere,
        };
    }
    getAdapter() {
        if (this.cachedAdapter)
            return this.cachedAdapter;
        const adapter = this.manager.getAdapter(this.def.connectionName);
        if (!adapter)
            throw new AdapterMissingError(this.def.connectionName);
        this.cachedAdapter = adapter;
        return adapter;
    }
    to(update) {
        this.pendingUpdate = update;
        return this;
    }
    async get() {
        const adapter = this.getAdapter();
        const options = this.buildOptions();
        const docs = adapter.get ? await adapter.get(options) : await adapter.getDocuments(options);
        return docs;
    }
    async getOne() {
        var _a;
        const adapter = this.getAdapter();
        const options = this.buildOptions();
        options.limit = 1;
        if (adapter.getOne) {
            const one = await adapter.getOne(options);
            return (_a = one) !== null && _a !== void 0 ? _a : null;
        }
        const results = adapter.get ? await adapter.get(options) : await adapter.getDocuments(options);
        return results[0] || null;
    }
    async add(data) {
        const adapter = this.getAdapter();
        // 1. Filter restricted fields if configured
        if (this.def.insertableFields) {
            const allowed = new Set(this.def.insertableFields);
            data = Object.fromEntries(Object.entries(data).filter(([k]) => allowed.has(k)));
        }
        else if (!this.def.allowUndefinedFields) {
            data = Object.fromEntries(Object.entries(data).filter(([k]) => this.allowedFields.has(k)));
        }
        // 2. Apply defaults
        for (const field of this.def.fields) {
            if (data[field.name] === undefined && field.defaultValue !== undefined) {
                if (field.defaultValue === 'NOW()') {
                    data[field.name] = new Date();
                }
                else {
                    data[field.name] = field.defaultValue;
                }
            }
        }
        return adapter.addDocument(this.def.collectionName, data);
    }
    async delete() {
        const adapter = this.getAdapter();
        if (!this.def.massDeleteAllowed && this.filters.length === 0 && !this._limit) {
            this._limit = 1;
        }
        if (this.def.deleteType === 'softDelete') {
            return this.to({ deletedOn: new Date() }).update();
        }
        const docs = await this.get();
        for (const d of docs) {
            const id = d.id;
            if (!id)
                throw new DocumentMissingIdError('delete');
            await adapter.deleteDocument(this.def.collectionName, id);
        }
    }
    async deleteOne() {
        this._limit = 1;
        return this.delete();
    }
    async update() {
        const adapter = this.getAdapter();
        if (!this.pendingUpdate)
            throw new UpdatePayloadMissingError();
        let data = this.pendingUpdate;
        if (this.def.updatableFields) {
            const allowed = new Set(this.def.updatableFields);
            data = Object.fromEntries(Object.entries(data).filter(([k]) => allowed.has(k)));
        }
        if (!this.def.massEditAllowed && this.filters.length === 0 && !this._limit) {
            this._limit = 1;
        }
        const docs = await this.get();
        for (const d of docs) {
            const id = d.id;
            if (!id)
                throw new DocumentMissingIdError('update');
            await adapter.updateDocument(this.def.collectionName, id, data);
        }
    }
    async updateOne() {
        this._limit = 1;
        return this.update();
    }
}
export class SchemaManager {
    constructor(connections) {
        this.connections = connections;
        this.schemas = new Map();
    }
    create(name) {
        if (this.schemas.has(name)) {
            throw new SchemaExistingError(name);
        }
        return new SchemaBuilder(this, name);
    }
    register(def) {
        this.schemas.set(def.name, def);
        return this;
    }
    use(name) {
        const def = this.schemas.get(name);
        if (!def)
            throw new SchemaMissingError(name);
        return new SchemaQuery(this, def);
    }
    getAdapter(connectionName) {
        return this.connections.getAdapter(connectionName);
    }
    list() {
        return Array.from(this.schemas.values());
    }
}
export function schema(conns) {
    const ctx = conns || new Connections();
    return new SchemaManager(ctx);
}
