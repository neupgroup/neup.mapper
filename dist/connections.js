import { ConnectionExistingError, ConnectionUnknownError } from './errors.js';
class AdapterRegistry {
    constructor() {
        this.adaptersByConnection = new Map();
    }
    attach(connectionName, adapter) {
        this.adaptersByConnection.set(connectionName, adapter);
    }
    get(connectionName) {
        return this.adaptersByConnection.get(connectionName);
    }
}
export class ConnectionBuilder {
    constructor(manager, name, type) {
        this.manager = manager;
        this.name = name;
        this.type = type;
    }
    key(config) {
        this.manager.register({ name: this.name, type: this.type, key: config });
        return this.manager;
    }
}
export class Connections {
    constructor() {
        this.connections = new Map();
        this.adapters = new AdapterRegistry();
    }
    create(name, type) {
        if (this.connections.has(name)) {
            throw new ConnectionExistingError(name);
        }
        return new ConnectionBuilder(this, name, type);
    }
    register(config) {
        if (this.connections.has(config.name)) {
            throw new ConnectionExistingError(config.name);
        }
        this.connections.set(config.name, config);
        return this;
    }
    attachAdapter(name, adapter) {
        if (!this.connections.has(name)) {
            throw new ConnectionUnknownError('attach adapter', name);
        }
        this.adapters.attach(name, adapter);
        return this;
    }
    get(name) {
        // If asking for 'default', prioritize the default resolution logic
        if (name === 'default') {
            return this.getDefault();
        }
        if (this.connections.has(name)) {
            return this.connections.get(name);
        }
        return undefined;
    }
    getDefault() {
        // Prioritize explicit isDefault flag
        for (const conn of this.connections.values()) {
            if (conn.key && conn.key.isDefault) {
                return conn;
            }
        }
        // Fallback to name 'default' if it exists (for backward compatibility)
        if (this.connections.has('default')) {
            return this.connections.get('default');
        }
        return undefined;
    }
    getAdapter(name) {
        return this.adapters.get(name);
    }
    list() {
        return Array.from(this.connections.values());
    }
}
export function connection() {
    return new Connections();
}
