import { InitMapper } from './init-mapper.js';
import { ensureInitialized } from './initializer.js';

export class Executor {
    private _bindings: any[] = [];
    private _connectionName: string | null = null;
    private _transaction: any = null;

    constructor(private sql: string) { }

    bind(bindings: any[] | any): this {
        this._bindings = Array.isArray(bindings) ? bindings : [bindings];
        return this;
    }

    useConnection(name: string): this {
        this._connectionName = name;
        return this;
    }

    useTransaction(transaction: any): this {
        if (transaction && transaction.connectionName) {
            this._connectionName = transaction.connectionName;
            this._transaction = transaction.client;
        } else {
            this._transaction = transaction;
        }
        return this;
    }

    async execute(): Promise<any> {
        await ensureInitialized();

        const initMapper = InitMapper.getInstance();
        const connections = initMapper.getConnections();
        
        let connectionNameToUse: string;

        // If a connection name is explicitly provided, use it.
        if (this._connectionName) {
            connectionNameToUse = this._connectionName;
        } else {
            // If no connection is provided, find the default one.
            const defaultConn = connections.getDefault();
            if (defaultConn) {
                connectionNameToUse = defaultConn.name;
            } else {
                // If no connection is specified and no default exists, throw a clear error.
                throw new Error("No connection specified and no default connection is configured. Set a connection with 'isDefault: true' in your connections file.");
            }
        }

        // The .get() method in Connections correctly handles resolving 'default' to the isDefault connection.
        const conn = connections.get(connectionNameToUse);

        if (!conn) {
            throw new Error(`Connection '${connectionNameToUse}' not found.`);
        }

        const adapter = connections.getAdapter(conn.name);
        if (!adapter) throw new Error(`Adapter not found for connection '${conn.name}'.`);

        const options = this._transaction ? { transaction: this._transaction } : undefined;

        if (typeof (adapter as any).raw === 'function') {
            return (adapter as any).raw(this.sql, this._bindings, options);
        }
        if (typeof (adapter as any).query === 'function') {
            return (adapter as any).query(this.sql, this._bindings, options);
        }
        throw new Error(`Connection '${conn.name}' does not support raw queries.`);
    }
}