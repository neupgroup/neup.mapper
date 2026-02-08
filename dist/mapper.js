import { CrudBase } from './dml/crud-base.js';
import { Migrator } from './ddl/migrator.js';
import { Executor } from './core/executor.js';
import { InitMapper } from './core/init-mapper.js';
import { ensureInitialized } from './core/initializer.js';
import { createDefaultMapper } from './config.js';
export class Mapper {
    /**
     * Lazy initialization: loads connections and schemas from mapper/ directory.
     * This runs automatically before any Mapper method is called.
     */
    static async ensureInitialized() {
        // If already initialized, return immediately
        if (Mapper.initialized) {
            return;
        }
        // Delegate to core initializer
        await ensureInitialized();
        Mapper.initialized = true;
    }
    /**
     * Entry point for Data Manipulation (CRUD).
     * @param table Table name
     */
    static base(table) {
        // Trigger async initialization but don't wait (backward compatibility)
        Mapper.ensureInitialized();
        return new CrudBase(table);
    }
    /**
     * Entry point for Schema Migration (DDL).
     * @param table Optional table name. If provided, returns a fluent builder.
     */
    static migrator(table) {
        // Trigger async initialization but don't wait (backward compatibility)
        Mapper.ensureInitialized();
        return new Migrator(table);
    }
    /**
     * Entry point for Raw SQL.
     */
    static raw(sql) {
        // Trigger async initialization but don't wait (backward compatibility)
        Mapper.ensureInitialized();
        return new Executor(sql);
    }
    /**
     * Entry point for Schema-based queries with validation.
     * @param name Schema name
     */
    static schemas(name) {
        // For schemas, we need to wait for initialization to complete
        // Return a proxy that waits for init before executing
        const initMapper = InitMapper.getInstance();
        // Trigger initialization
        const initPromise = Mapper.ensureInitialized();
        // Return the schema query, but wrap async methods to wait for init
        const schemaQuery = initMapper.getSchemaManager().use(name);
        // Wrap async methods to ensure initialization completes first
        const originalGet = schemaQuery.get.bind(schemaQuery);
        const originalGetOne = schemaQuery.getOne.bind(schemaQuery);
        const originalAdd = schemaQuery.add.bind(schemaQuery);
        const originalUpdate = schemaQuery.update.bind(schemaQuery);
        const originalDelete = schemaQuery.delete.bind(schemaQuery);
        schemaQuery.get = async function () {
            await initPromise;
            return originalGet();
        };
        schemaQuery.getOne = async function () {
            await initPromise;
            return originalGetOne();
        };
        schemaQuery.add = async function (data) {
            await initPromise;
            return originalAdd(data);
        };
        schemaQuery.update = async function (data) {
            await initPromise;
            return originalUpdate(data);
        };
        schemaQuery.delete = async function () {
            await initPromise;
            return originalDelete();
        };
        return schemaQuery;
    }
    /**
     * Initialize connection manager.
     */
    static init() {
        return InitMapper.getInstance();
    }
    /**
     * Ensure the mapper is initialized with at least one connection.
     * If not, try to load default configuration.
     * @deprecated Use automatic async initialization instead.
     */
    static ensureInitializedSync() {
        // Deprecated: No-op or keep for legacy sync calls if any
        const init = InitMapper.getInstance();
        if (init.getConnections().list().length === 0) {
            try {
                // This will try to load from default config locations (synchronously only)
                createDefaultMapper();
            }
            catch (e) {
                // Ignore
            }
        }
    }
    /**
     * Start a transaction.
     * @param connectionName Optional connection name. Defaults to default connection.
     */
    static async beginTransaction(connectionName) {
        var _a;
        await Mapper.ensureInitialized();
        const initMapper = InitMapper.getInstance();
        const connName = connectionName || ((_a = initMapper.getDefaultConnection()) === null || _a === void 0 ? void 0 : _a.name) || 'default';
        const connections = initMapper.getConnections();
        const conn = connections.get(connName);
        if (!conn)
            throw new Error(`Connection '${connName}' not found.`);
        const adapter = connections.getAdapter(connName);
        // Use 'any' cast because not all adapters might be updated in types yet (though we did update interface)
        // Check if method exists
        if (typeof adapter.beginTransaction !== 'function') {
            throw new Error(`Connection '${connName}' does not support transactions.`);
        }
        const client = await adapter.beginTransaction();
        return { client, connectionName: connName };
    }
    /**
     * Commit a transaction.
     * @param transaction The transaction handle returned by beginTransaction.
     */
    static async commitTransaction(transaction) {
        if (!transaction || !transaction.connectionName) {
            throw new Error('Invalid transaction handle.');
        }
        const initMapper = InitMapper.getInstance();
        const adapter = initMapper.getConnections().getAdapter(transaction.connectionName);
        if (adapter && typeof adapter.commitTransaction === 'function') {
            await adapter.commitTransaction(transaction.client);
        }
    }
    /**
     * Rollback a transaction.
     * @param transaction The transaction handle returned by beginTransaction.
     */
    static async rollbackTransaction(transaction) {
        if (!transaction || !transaction.connectionName) {
            throw new Error('Invalid transaction handle.');
        }
        const initMapper = InitMapper.getInstance();
        const adapter = initMapper.getConnections().getAdapter(transaction.connectionName);
        if (adapter && typeof adapter.rollbackTransaction === 'function') {
            await adapter.rollbackTransaction(transaction.client);
        }
    }
}
Mapper.initPromise = null;
Mapper.initialized = false;
export const createMapper = () => InitMapper.getInstance();
export default Mapper;
