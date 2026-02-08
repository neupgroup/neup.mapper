import { InitMapper } from './init-mapper.js';
import { ensureInitialized } from './initializer.js';
export class Executor {
    constructor(sql) {
        this.sql = sql;
        this._bindings = [];
        this._connectionName = null;
        this._transaction = null;
    }
    bind(bindings) {
        this._bindings = Array.isArray(bindings) ? bindings : [bindings];
        return this;
    }
    useConnection(name) {
        this._connectionName = name;
        return this;
    }
    useTransaction(transaction) {
        if (transaction && transaction.connectionName) {
            this._connectionName = transaction.connectionName;
            this._transaction = transaction.client;
        }
        else {
            this._transaction = transaction;
        }
        return this;
    }
    async execute() {
        await ensureInitialized();
        const initMapper = InitMapper.getInstance();
        const connections = initMapper.getConnections();
        let connName = this._connectionName;
        if (!connName || connName.trim() === '') {
            const defaultConn = connections.get('default');
            if (!defaultConn) {
                throw new Error('No default connection configured.');
            }
            connName = defaultConn.name;
        }
        const conn = connections.get(connName);
        if (!conn) {
            throw new Error(`Connection '${connName}' not found.`);
        }
        const adapter = connections.getAdapter(conn.name);
        if (!adapter)
            throw new Error(`No adapter configured for connection '${conn.name}'.`);
        const options = this._transaction ? { transaction: this._transaction } : undefined;
        if (typeof adapter.raw === 'function') {
            return adapter.raw(this.sql, this._bindings, options);
        }
        if (typeof adapter.query === 'function') {
            return adapter.query(this.sql, this._bindings, options); // Assuming query also supports options if raw does
        }
        throw new Error(`Connection '${conn.name}' does not support raw queries.`);
    }
}
