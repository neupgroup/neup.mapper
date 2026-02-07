import { CrudBase } from './dml/crud-base.js';
import { Migrator } from './ddl/migrator.js';
import { Executor } from './core/executor.js';
import { InitMapper } from './core/init-mapper.js';
import { createDefaultMapper } from './config.js';
import { ConfigLoader } from './config-loader.js';
import { autoAttachAdapter } from './adapters/index.js';

export class Mapper {
    private static initPromise: Promise<void> | null = null;
    private static initialized = false;

    /**
     * Lazy initialization: loads mapper.config.json and registers connections and schemas.
     * This runs automatically before any Mapper method is called.
     */
    private static async ensureInitialized(): Promise<void> {
        // If already initialized, return immediately
        if (Mapper.initialized) {
            return;
        }

        // If initialization is in progress, wait for it
        if (Mapper.initPromise) {
            return Mapper.initPromise;
        }

        // Start initialization
        Mapper.initPromise = (async () => {
            try {
                const configLoader = ConfigLoader.getInstance();
                const initMapper = InitMapper.getInstance();

                // Try to load mapper.config.json from standard locations
                const defaultPaths = [
                    './mapper.config.json',
                    './config/mapper.json',
                    '../mapper.config.json',
                ];

                let configLoaded = false;
                for (const configPath of defaultPaths) {
                    try {
                        configLoader.loadFromFile(configPath);
                        configLoaded = true;
                        break;
                    } catch (e) {
                        // Continue to next path
                    }
                }

                if (configLoaded) {
                    const config = configLoader.getConfig();
                    if (config) {
                        // Initialize connections
                        for (const connConfig of config.connections) {
                            const existingConns = initMapper.getConnections();
                            if (!existingConns.get(connConfig.name)) {
                                initMapper.connect(connConfig.name, connConfig.type, connConfig);
                            }
                        }

                        // Initialize schemas
                        if (config.schemas) {
                            for (const schemaConfig of config.schemas) {
                                try {
                                    const schemaBuilder = initMapper.schema(schemaConfig.name);
                                    schemaBuilder.use({
                                        connection: schemaConfig.connection,
                                        collection: schemaConfig.collection
                                    });

                                    if (schemaConfig.structure) {
                                        schemaBuilder.setStructure(schemaConfig.structure as any);
                                    }
                                } catch (e: any) {
                                    // Schema might already exist, ignore
                                    if (!e.message?.includes('already exists')) {
                                        console.warn(`Failed to register schema ${schemaConfig.name}:`, e.message);
                                    }
                                }
                            }
                        }
                    }
                }

                Mapper.initialized = true;
            } catch (e) {
                // Initialization failed, but don't block usage
                // User might be initializing manually
                Mapper.initialized = true;
            }
        })();

        return Mapper.initPromise;
    }

    /**
     * Entry point for Data Manipulation (CRUD).
     * @param table Table name
     */
    static base(table: string): CrudBase {
        // Trigger async initialization but don't wait (backward compatibility)
        Mapper.ensureInitialized();
        return new CrudBase(table);
    }

    /**
     * Entry point for Schema Migration (DDL).
     * @param table Optional table name. If provided, returns a fluent builder.
     */
    static migrator(table?: string): Migrator {
        // Trigger async initialization but don't wait (backward compatibility)
        Mapper.ensureInitialized();
        return new Migrator(table);
    }

    /**
     * Entry point for Raw SQL.
     */
    static raw(sql: string): Executor {
        // Trigger async initialization but don't wait (backward compatibility)
        Mapper.ensureInitialized();
        return new Executor(sql);
    }

    /**
     * Entry point for Schema-based queries with validation.
     * @param name Schema name
     */
    static schemas(name: string) {
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

        schemaQuery.add = async function (data: Record<string, any>) {
            await initPromise;
            return originalAdd(data);
        };

        schemaQuery.update = async function (data?: Record<string, any>) {
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
    static init(): InitMapper {
        return InitMapper.getInstance();
    }

    /**
     * Ensure the mapper is initialized with at least one connection.
     * If not, try to load default configuration.
     * @deprecated Use automatic async initialization instead.
     */
    private static ensureInitializedSync() {
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
