import { CrudBase } from './dml/crud-base.js';
import { Migrator } from './ddl/migrator.js';
import { Executor } from './core/executor.js';
import { InitMapper } from './core/init-mapper.js';
import { createDefaultMapper } from './config.js';

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
     * Entry point for Schema-based queries with validation.
     * @param name Schema name
     */
    static schemas(name: string) {
        return InitMapper.getInstance().getSchemaManager().use(name);
    }

    /**
     * Initialize connection manager.
     */
    static init(): InitMapper {
        return InitMapper.getInstance();
    }

    /**
     * Ensure the mapper is initialized with at least one connection.
     * If not, try to load default configuration.
     * @deprecated Use automatic async initialization instead.
     */
    private static ensureInitialized() {
        // Deprecated: No-op or keep for legacy sync calls if any
        const init = InitMapper.getInstance();
        if (init.getConnections().list().length === 0) {
            try {
                // This will try to load from default config locations (synchronously only)
                createDefaultMapper();
            } catch (e) {
               // Ignore
            }
        }
    }
}

export const createMapper = () => InitMapper.getInstance();
export default Mapper;
