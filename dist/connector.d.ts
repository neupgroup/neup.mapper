import { ConnectionType } from './index.js';
/**
 * A fluent builder for dynamic connections and ad-hoc queries.
 * This allows defining connections with runtime values (variables, env, etc.)
 * rather than relying solely on static configuration.
 */
export declare class Connector {
    private _name;
    private _type;
    private _config;
    private _collection;
    /**
     * Start a new connection definition.
     * Usage: new Connector().name('myDb')...
     */
    constructor(name?: string);
    /**
     * Set the connection name.
     */
    name(n: string): this;
    /**
     * Set the connection type.
     * Supported types: 'mysql', 'sql' (postgres/sqlite), 'mongodb', 'api'.
     */
    type(t: ConnectionType | string): this;
    /**
     * Generic configuration setup.
     * Pass any key-value pairs required by the adapter.
     */
    config(c: Record<string, any>): this;
    /**
     * Set the Base URL (for API connections).
     */
    basePath(url: string): this;
    /**
     * Set the Connection URL/String (for DB connections).
     */
    url(url: string): this;
    /**
     * Define the table or collection to operate on.
     * This registers the connection (if not already) and prepares a query.
     */
    table(tableName: string): import("./fluent-mapper.js").BaseDispatcher;
    /**
     * Alias for table() for API endpoints (subpath).
     */
    subpath(path: string): import("./fluent-mapper.js").BaseDispatcher;
    /**
     * Finalizes the connection registration and returns a query object.
     */
    private finalize;
}
/**
 * Factory function for cleaner syntax:
 * mapper('db').type('mysql')...
 */
export declare function mapper(name?: string): Connector;
