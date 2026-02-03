import { CrudBase } from './dml/crud-base.js';
import { Migrator } from './ddl/migrator.js';
import { Executor } from './core/executor.js';
import { InitMapper } from './core/init-mapper.js';

export class Mapper {
    /**
     * Entry point for Data Manipulation (CRUD).
     * @param table Table name
     */
    static base(table: string): CrudBase {
        return new CrudBase(table);
    }

    /**
     * Entry point for Schema Migration (DDL).
     * @param table Optional table name. If provided, returns a fluent builder.
     */
    static migrator(table?: string): Migrator {
        return new Migrator(table);
    }

    /**
     * Entry point for Raw SQL.
     */
    static raw(sql: string): Executor {
        return new Executor(sql);
    }

    /**
     * Initialize connection manager.
     */
    static init(): InitMapper {
        return InitMapper.getInstance();
    }
}

export const createMapper = () => InitMapper.getInstance();
export default Mapper;
