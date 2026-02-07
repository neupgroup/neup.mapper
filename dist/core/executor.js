import { InitMapper } from './init-mapper.js';
import { ensureInitialized } from './initializer.js';
export class Executor {
    constructor(sql) {
        this.sql = sql;
        this._bindings = [];
        this._connectionName = 'default';
    }
    bind(bindings) {
        this._bindings = Array.isArray(bindings) ? bindings : [bindings];
        return this;
    }
    useConnection(name) {
        this._connectionName = name;
        return this;
    }
    async execute() {
        await ensureInitialized();
        const initMapper = InitMapper.getInstance();
        const connections = initMapper.getConnections();
        const conn = connections.get(this._connectionName);
        if (!conn) {
            throw new Error(`Connection '${this._connectionName}' not found.`);
        }
        const adapter = connections.getAdapter(conn.name);
        if (!adapter)
            throw new Error(`Adapter not found for connection '${conn.name}'.`);
        if (typeof adapter.raw === 'function') {
            return adapter.raw(this.sql, this._bindings);
        }
        if (typeof adapter.query === 'function') {
            return adapter.query(this.sql, this._bindings);
        }
        throw new Error(`Connection '${conn.name}' does not support raw queries.`);
    }
}
