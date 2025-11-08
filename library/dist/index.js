class AdapterRegistry {
    constructor() {
        this.adaptersByConnection = new Map();
    }
    attach(connectionName, adapter) {
        this.adaptersByConnection.set(connectionName, adapter);
    }
    get(connectionName) {
        return this.adaptersByConnection.get(connectionName);
    }
}
class ConnectionBuilder {
    constructor(manager, name, type) {
        this.manager = manager;
        this.name = name;
        this.type = type;
    }
    key(config) {
        this.manager.register({ name: this.name, type: this.type, key: config });
        return this.manager;
    }
}
export class Connections {
    constructor() {
        this.connections = new Map();
        this.adapters = new AdapterRegistry();
    }
    create(name, type) {
        if (this.connections.has(name)) {
            throw new Error(`Connection with name '${name}' already exists`);
        }
        return new ConnectionBuilder(this, name, type);
    }
    register(config) {
        if (this.connections.has(config.name)) {
            throw new Error(`Connection with name '${config.name}' already exists`);
        }
        this.connections.set(config.name, config);
        return this;
    }
    attachAdapter(name, adapter) {
        if (!this.connections.has(name)) {
            throw new Error(`Cannot attach adapter: unknown connection '${name}'`);
        }
        this.adapters.attach(name, adapter);
        return this;
    }
    get(name) {
        return this.connections.get(name);
    }
    getAdapter(name) {
        return this.adapters.get(name);
    }
    list() {
        return Array.from(this.connections.values());
    }
}
function parseDescriptorStructure(struct) {
    let allowUndefinedFields = false;
    const fields = [];
    for (const [key, descriptor] of Object.entries(struct)) {
        if (key === '?field') {
            // Presence of '?field' enables accepting fields not defined in the schema
            allowUndefinedFields = true;
            continue;
        }
        const tokens = descriptor.split(/\s+/).map(t => t.trim().toLowerCase()).filter(Boolean);
        const field = {
            name: key,
            type: tokens.find(t => ['string', 'number', 'boolean', 'date', 'int'].includes(t)) || 'string',
            editable: tokens.includes('editable'),
            autoIncrement: tokens.includes('auto_increment') || tokens.includes('autoincrement'),
        };
        fields.push(field);
    }
    return { fields, allowUndefinedFields };
}
class SchemaBuilder {
    constructor(manager, name) {
        this.manager = manager;
        this.name = name;
        this.fields = [];
        this.allowUndefinedFields = false;
    }
    use(options) {
        this.connectionName = options.connection;
        this.collectionName = options.collection;
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
            throw new Error('Schema.use({ connection, collection }) must be set before setStructure');
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
    constructor(manager, def) {
        this.manager = manager;
        this.def = def;
        this.filters = [];
        this.rawWhere = null;
        this.pendingUpdate = null;
    }
    // where('field','value', operator?) or where([field, value])
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
    // Accept a raw complex where clause string
    whereComplex(raw) {
        this.rawWhere = raw;
        return this;
    }
    buildOptions() {
        return {
            collectionName: this.def.collectionName,
            filters: this.filters.map(f => ({ field: f.field, operator: f.operator, value: f.value })),
            limit: null,
            offset: null,
            sortBy: null,
            fields: this.def.fields.map(f => f.name),
            rawWhere: this.rawWhere,
        };
    }
    to(update) {
        this.pendingUpdate = update;
        return this;
    }
    async get() {
        const adapter = this.manager.getAdapter(this.def.connectionName);
        if (!adapter)
            throw new Error(`No adapter attached for connection '${this.def.connectionName}'`);
        const options = this.buildOptions();
        const docs = adapter.get ? await adapter.get(options) : await adapter.getDocuments(options);
        return docs;
    }
    async getOne() {
        var _a;
        const adapter = this.manager.getAdapter(this.def.connectionName);
        if (!adapter)
            throw new Error(`No adapter attached for connection '${this.def.connectionName}'`);
        const options = this.buildOptions();
        if (adapter.getOne) {
            const one = await adapter.getOne(options);
            return (_a = one) !== null && _a !== void 0 ? _a : null;
        }
        const results = adapter.get ? await adapter.get(options) : await adapter.getDocuments(options);
        return results[0] || null;
    }
    async add(data) {
        const adapter = this.manager.getAdapter(this.def.connectionName);
        if (!adapter)
            throw new Error(`No adapter attached for connection '${this.def.connectionName}'`);
        if (!this.def.allowUndefinedFields) {
            const allowed = new Set(this.def.fields.map(f => f.name));
            data = Object.fromEntries(Object.entries(data).filter(([k]) => allowed.has(k)));
        }
        return adapter.addDocument(this.def.collectionName, data);
    }
    async delete() {
        const adapter = this.manager.getAdapter(this.def.connectionName);
        if (!adapter)
            throw new Error(`No adapter attached for connection '${this.def.connectionName}'`);
        const docs = await this.get();
        // Expect each doc has an 'id' field
        for (const d of docs) {
            const id = d.id;
            if (!id)
                throw new Error('Document missing id; cannot delete');
            await adapter.deleteDocument(this.def.collectionName, id);
        }
    }
    async deleteOne() {
        const one = await this.getOne();
        if (!one)
            return;
        const adapter = this.manager.getAdapter(this.def.connectionName);
        if (!adapter)
            throw new Error(`No adapter attached for connection '${this.def.connectionName}'`);
        const id = one.id;
        if (!id)
            throw new Error('Document missing id; cannot deleteOne');
        await adapter.deleteDocument(this.def.collectionName, id);
    }
    async update() {
        const adapter = this.manager.getAdapter(this.def.connectionName);
        if (!adapter)
            throw new Error(`No adapter attached for connection '${this.def.connectionName}'`);
        if (!this.pendingUpdate)
            throw new Error('No update payload set; call to({ ... }) first');
        const docs = await this.get();
        for (const d of docs) {
            const id = d.id;
            if (!id)
                throw new Error('Document missing id; cannot update');
            await adapter.updateDocument(this.def.collectionName, id, this.pendingUpdate);
        }
    }
    async updateOne() {
        const adapter = this.manager.getAdapter(this.def.connectionName);
        if (!adapter)
            throw new Error(`No adapter attached for connection '${this.def.connectionName}'`);
        if (!this.pendingUpdate)
            throw new Error('No update payload set; call to({ ... }) first');
        const one = await this.getOne();
        if (!one)
            return;
        const id = one.id;
        if (!id)
            throw new Error('Document missing id; cannot updateOne');
        await adapter.updateDocument(this.def.collectionName, id, this.pendingUpdate);
    }
}
export class SchemaManager {
    constructor(connections) {
        this.connections = connections;
        this.schemas = new Map();
    }
    create(name) {
        if (this.schemas.has(name)) {
            throw new Error(`Schema with name '${name}' already exists`);
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
            throw new Error(`Unknown schema '${name}'`);
        return new SchemaQuery(this, def);
    }
    getAdapter(connectionName) {
        return this.connections.getAdapter(connectionName);
    }
    list() {
        return Array.from(this.schemas.values());
    }
}
export function connection() {
    return new Connections();
}
export function schema(conns) {
    const ctx = conns || new Connections();
    return new SchemaManager(ctx);
}
export const schemas = (() => {
    const conns = new Connections();
    return new SchemaManager(conns);
})();
export { createOrm } from './orm';
