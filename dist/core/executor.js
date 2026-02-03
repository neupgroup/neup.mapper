import { InitMapper } from './init-mapper.js';
export class Executor {
    constructor(sql) {
        this.sql = sql;
        this._bindings = [];
    }
    bind(bindings) {
        this._bindings = Array.isArray(bindings) ? bindings : [bindings];
        return this;
    }
    async execute() {
        const initMapper = InitMapper.getInstance();
        const connections = initMapper.getConnections();
        const conn = connections.get('default');
        if (!conn) {
            // Try to find any connection if default is not set?
            // For now strict default.
            throw new Error("No default connection found. Please connect using InitMapper or Mapper.init().");
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
