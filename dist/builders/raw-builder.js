export class RawBuilder {
    constructor(mapper, sql) {
        this.mapper = mapper;
        this.sql = sql;
        this._bindings = [];
    }
    bind(bindings) {
        this._bindings = Array.isArray(bindings) ? bindings : [bindings];
        return this;
    }
    async run() {
        const connections = this.mapper.getConnections();
        const conn = connections.get('default');
        if (!conn)
            throw new Error("No default connection found for raw query.");
        const adapter = connections.getAdapter(conn.name);
        if (adapter) {
            if (typeof adapter.raw === 'function') {
                return adapter.raw(this.sql, this._bindings);
            }
            if (typeof adapter.query === 'function') {
                return adapter.query(this.sql, this._bindings);
            }
        }
        throw new Error(`Connection '${conn.name}' does not support raw queries.`);
    }
}
