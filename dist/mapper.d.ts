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
     * Initialize connection manager.
     */
    static init(): InitMapper;
}
export declare const createMapper: () => InitMapper;
export default Mapper;
