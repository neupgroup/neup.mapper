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

    useConnection(name: string | null): this {
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

        let connName = this._connectionName;

        if (!connName || connName.trim() === '') {
            const defaultConn = connections.get('default');
            if (!defaultConn) {
                throw new Error('No default connection configured.');
            }
            connName = defaultConn.name;
        }

        const conn = connections.get(connName as string);

        if (!conn) {
            throw new Error(`Connection '${connName}' not found.`);
        }

        const adapter = connections.getAdapter(conn.name);
        if (!adapter) throw new Error(`No adapter configured for connection '${conn.name}'.`);

        const options = this._transaction ? { transaction: this._transaction } : undefined;

        if (typeof (adapter as any).raw === 'function') {
            return (adapter as any).raw(this.sql, this._bindings, options);
        }
        if (typeof (adapter as any).query === 'function') {
            return (adapter as any).query(this.sql, this._bindings, options); // Assuming query also supports options if raw does
        }
        throw new Error(`Connection '${conn.name}' does not support raw queries.`);
    }
}
