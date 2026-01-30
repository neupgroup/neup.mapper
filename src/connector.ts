import { StaticMapper } from './fluent-mapper';
import { ConnectionType } from './index';

/**
 * A fluent builder for dynamic connections and ad-hoc queries.
 * This allows defining connections with runtime values (variables, env, etc.)
 * rather than relying solely on static configuration.
 */
export class Connector {
    private _name: string = '';
    private _type: ConnectionType = 'api';
    private _config: Record<string, any> = {};
    private _collection: string = '';

    /**
     * Start a new connection definition.
     * Usage: new Connector().name('myDb')...
     */
    constructor(name?: string) {
        if (name) this._name = name;
    }

    /**
     * Set the connection name.
     */
    name(n: string): this {
        this._name = n;
        return this;
    }

    /**
     * Set the connection type.
     * Supported types: 'mysql', 'sql' (postgres/sqlite), 'mongodb', 'api'.
     */
    type(t: ConnectionType | string): this {
        // Map 'database_sqlite' or others to supported types if necessary
        if (t === 'database_sqlite') t = 'sql';
        this._type = t as ConnectionType;
        return this;
    }

    /**
     * Generic configuration setup.
     * Pass any key-value pairs required by the adapter.
     */
    config(c: Record<string, any>): this {
        this._config = { ...this._config, ...c };
        return this;
    }

    /**
     * Set the Base URL (for API connections).
     */
    basePath(url: string): this {
        this._config.baseUrl = url;
        return this;
    }

    /**
     * Set the Connection URL/String (for DB connections).
     */
    url(url: string): this {
        this._config.url = url;
        return this;
    }

    /**
     * Define the table or collection to operate on.
     * This registers the connection (if not already) and prepares a query.
     */
    table(tableName: string) {
        this._collection = tableName;
        return this.finalize();
    }

    /**
     * Alias for table() for API endpoints (subpath).
     */
    subpath(path: string) {
        return this.table(path);
    }

    /**
     * Finalizes the connection registration and returns a query object.
     */
    private finalize() {
        if (!this._name) throw new Error('Connection name is required');

        // Try to register connection, or use existing
        let connInterface: any;
        try {
            connInterface = StaticMapper.makeConnection(this._name, this._type, this._config);
        } catch (e: any) {
            if (e.message && (e.message.includes('already exists') || e.message.includes('ConnectionExistingError'))) {
                connInterface = StaticMapper.useConnection(this._name);
            } else {
                connInterface = StaticMapper.useConnection(this._name);
            }
        }

        // Auto-define a schema for this table/collection if we are using one
        const schemaName = `${this._name}_${this._collection}`;

        try {
            // Using the fluent interface to define schema if not exists
            connInterface.schema(schemaName)
                .collection(this._collection)
                .structure({ '?field': 'any' });
        } catch (e: any) {
            // Ignore if schema already exists
        }

        // Return the query builder
        return StaticMapper.query(schemaName);
    }
}

/**
 * Factory function for cleaner syntax:
 * connection.name('db')...
 */
export function connection(name?: string) {
    return new Connector(name);
}
