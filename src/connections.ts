
import type { DbAdapter } from './orm/index.js';
import { ConnectionExistingError, ConnectionUnknownError } from './errors.js';
import { ConnectionType } from './types-core.js';

class AdapterRegistry {
  private adaptersByConnection = new Map<string, DbAdapter>();

  attach(connectionName: string, adapter: DbAdapter) {
    this.adaptersByConnection.set(connectionName, adapter);
  }

  get(connectionName: string) {
    return this.adaptersByConnection.get(connectionName);
  }
}

export interface ConnectionConfig {
  name: string;
  type: ConnectionType;
  key: Record<string, any>;
}

export class ConnectionBuilder {
  constructor(private manager: Connections, private name: string, private type: ConnectionType) { }

  key(config: Record<string, any>) {
    this.manager.register({ name: this.name, type: this.type, key: config });
    return this.manager;
  }
}

export class Connections {
  private connections = new Map<string, ConnectionConfig>();
  private adapters = new AdapterRegistry();

  create(name: string, type: ConnectionType) {
    if (this.connections.has(name)) {
      throw new ConnectionExistingError(name);
    }
    return new ConnectionBuilder(this, name, type);
  }

  register(config: ConnectionConfig) {
    if (this.connections.has(config.name)) {
      throw new ConnectionExistingError(config.name);
    }
    this.connections.set(config.name, config);
    return this;
  }

  attachAdapter(name: string, adapter: DbAdapter) {
    if (!this.connections.has(name)) {
      throw new ConnectionUnknownError('attach adapter', name);
    }
    this.adapters.attach(name, adapter);
    return this;
  }

  get(name: string) {
    return this.connections.get(name);
  }

  getAdapter(name: string) {
    return this.adapters.get(name);
  }

  list() {
    return Array.from(this.connections.values());
  }
}

export function connection() {
  return new Connections();
}
