import { InitMapper } from './init-mapper.js';

export class Executor {
    private _bindings: any[] = [];

    constructor(private sql: string) {}

    bind(bindings: any[] | any): this {
        this._bindings = Array.isArray(bindings) ? bindings : [bindings];
        return this;
    }

    async execute(): Promise<any> {
        const initMapper = InitMapper.getInstance();
        const connections = initMapper.getConnections();
        const conn = connections.get('default');
        
        if (!conn) {
             // Try to find any connection if default is not set?
             // For now strict default.
             throw new Error("No default connection found. Please connect using InitMapper or Mapper.init().");
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
