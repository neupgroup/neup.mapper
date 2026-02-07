import type { DbAdapter } from './orm/index.js';
import { ConnectionType } from './types-core.js';
export interface ConnectionConfig {
    name: string;
    type: ConnectionType;
    key: Record<string, any>;
}
export declare class ConnectionBuilder {
    private manager;
    private name;
    private type;
    constructor(manager: Connections, name: string, type: ConnectionType);
    key(config: Record<string, any>): Connections;
}
export declare class Connections {
    private connections;
    private adapters;
    create(name: string, type: ConnectionType): ConnectionBuilder;
    register(config: ConnectionConfig): this;
    attachAdapter(name: string, adapter: DbAdapter): this;
    get(name: string): ConnectionConfig | undefined;
    getDefault(): ConnectionConfig | undefined;
    getAdapter(name: string): DbAdapter | undefined;
    list(): ConnectionConfig[];
}
export declare function connection(): Connections;
