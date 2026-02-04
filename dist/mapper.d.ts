import { CrudBase } from './dml/crud-base.js';
import { Migrator } from './ddl/migrator.js';
import { Executor } from './core/executor.js';
import { InitMapper } from './core/init-mapper.js';
export declare class Mapper {
    /**
     * Entry point for Data Manipulation (CRUD).
     * @param table Table name
     */
    static base(table: string): CrudBase;
    /**
     * Entry point for Schema Migration (DDL).
     * @param table Optional table name. If provided, returns a fluent builder.
     */
    static migrator(table?: string): Migrator;
    /**
     * Entry point for Raw SQL.
     */
    static raw(sql: string): Executor;
    /**
     * Entry point for Schema-based queries with validation.
     * @param name Schema name
     */
    static schemas(name: string): import("./schema-manager.js").SchemaQuery;
    /**
     * Initialize connection manager.
     */
    static init(): InitMapper;
    /**
     * Ensure the mapper is initialized with at least one connection.
     * If not, try to load default configuration.
     */
    private static ensureInitialized;
}
export declare const createMapper: () => InitMapper;
export default Mapper;
