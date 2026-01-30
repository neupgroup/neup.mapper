import { StaticMapper } from './fluent-mapper';
/**
 * A fluent builder for dynamic connections and ad-hoc queries.
 * This allows defining connections with runtime values (variables, env, etc.)
 * rather than relying solely on static configuration.
 */
export class Connector {
    /**
     * Start a new connection definition.
     * Usage: new Connector().name('myDb')...
     */
    constructor(name) {
        this._name = '';
        this._type = 'api';
        this._config = {};
        this._collection = '';
        if (name)
            this._name = name;
    }
    /**
     * Set the connection name.
     */
    name(n) {
        this._name = n;
        return this;
    }
    /**
     * Set the connection type.
     * Supported types: 'mysql', 'sql' (postgres/sqlite), 'mongodb', 'api'.
     */
    type(t) {
        // Map 'database_sqlite' or others to supported types if necessary
        if (t === 'database_sqlite')
            t = 'sql';
        this._type = t;
        return this;
    }
    /**
     * Generic configuration setup.
     * Pass any key-value pairs required by the adapter.
     */
    config(c) {
        this._config = { ...this._config, ...c };
        return this;
    }
    /**
     * Set the Base URL (for API connections).
     */
    basePath(url) {
        this._config.baseUrl = url;
        return this;
    }
    /**
     * Set the Connection URL/String (for DB connections).
     */
    url(url) {
        this._config.url = url;
        return this;
    }
    /**
     * Define the table or collection to operate on.
     * This registers the connection (if not already) and prepares a query.
     */
    table(tableName) {
        this._collection = tableName;
        return this.finalize();
    }
    /**
     * Alias for table() for API endpoints (subpath).
     */
    subpath(path) {
        return this.table(path);
    }
    /**
     * Finalizes the connection registration and returns a query object.
     */
    finalize() {
        if (!this._name)
            throw new Error('Connection name is required');
        // Try to register connection, or use existing
        let connInterface;
        try {
            connInterface = StaticMapper.makeConnection(this._name, this._type, this._config);
        }
        catch (e) {
            if (e.message && (e.message.includes('already exists') || e.message.includes('ConnectionExistingError'))) {
                connInterface = StaticMapper.useConnection(this._name);
            }
            else {
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
        }
        catch (e) {
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
export function connection(name) {
    return new Connector(name);
}
