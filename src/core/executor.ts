import { InitMapper } from './init-mapper.js';
import { ensureInitialized } from './initializer.js';

export class Executor {
    private _bindings: any[] = [];
    private _connectionName: string = 'default';

    constructor(private sql: string) {}

    bind(bindings: any[] | any): this {
        this._bindings = Array.isArray(bindings) ? bindings : [bindings];
        return this;
    }
    
    useConnection(name: string): this {
        this._connectionName = name;
        return this;
    }

    async execute(): Promise<any> {
        await ensureInitialized();
        
        const initMapper = InitMapper.getInstance();
        const connections = initMapper.getConnections();
        const conn = connections.get(this._connectionName);
        
        if (!conn) {
             throw new Error(`Connection '${this._connectionName}' not found.`);
        }
        
        const adapter = connections.getAdapter(conn.name);
        if (!adapter) throw new Error(`Adapter not found for connection '${conn.name}'.`);
        
        if (typeof (adapter as any).raw === 'function') {
            return (adapter as any).raw(this.sql, this._bindings);
        }
        if (typeof (adapter as any).query === 'function') {
            return (adapter as any).query(this.sql, this._bindings);
        }
         throw new Error(`Connection '${conn.name}' does not support raw queries.`);
    }
}
