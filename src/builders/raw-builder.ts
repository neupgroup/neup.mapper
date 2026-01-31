export class RawBuilder {
    private _bindings: any[] = [];

    constructor(private mapper: any, private sql: string) { }

    bind(bindings: any[] | any): this {
        this._bindings = Array.isArray(bindings) ? bindings : [bindings];
        return this;
    }

    async run(): Promise<any> {
        const connections = this.mapper.getConnections();
        const conn = connections.get('default');
        if (!conn) throw new Error("No default connection found for raw query.");

        const adapter = connections.getAdapter(conn.name);
        if (adapter && typeof (adapter as any).query === 'function') {
            return (adapter as any).query(this.sql, this._bindings);
        }
        throw new Error(`Connection '${conn.name}' does not support raw queries.`);
    }
}
