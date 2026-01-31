import { Connections, SchemaManager } from './index.js';
import { autoAttachAdapter } from './adapters/index.js';
export class Mapper {
    constructor() {
        this.configured = false;
        this.connections = new Connections();
        this.schemaManager = new SchemaManager(this.connections);
    }
    static getInstance() {
        if (!Mapper.instance) {
            Mapper.instance = new Mapper();
        }
        return Mapper.instance;
    }
    // Auto-configuration based on environment or defaults
    autoConfigure() {
        if (this.configured)
            return this;
        this.configured = true;
        // Check for environment variables or config files
        const envConfig = this.detectEnvironmentConfig();
        if (envConfig) {
            this.applyConfig(envConfig);
        }
        else {
            // Use sensible defaults
            this.applyDefaultConfig();
        }
        return this;
    }
    detectEnvironmentConfig() {
        // Check for common environment variables or config files
        if (typeof process !== 'undefined' && process.env) {
            // Node.js environment
            const dbUrl = process.env.DATABASE_URL;
            if (dbUrl) {
                return {
                    connection: {
                        name: 'default',
                        type: this.inferConnectionType(dbUrl),
                        key: { url: dbUrl }
                    }
                };
            }
        }
        // Check for browser environment with global config
        if (typeof window !== 'undefined' && window.__MAPPER_CONFIG__) {
            return window.__MAPPER_CONFIG__;
        }
        return null;
    }
    inferConnectionType(url) {
        if (url.includes('mysql'))
            return 'mysql';
        if (url.includes('postgres') || url.includes('postgresql'))
            return 'postgres';
        if (url.includes('mongodb'))
            return 'mongodb';
        if (url.includes('firestore'))
            return 'firestore';
        if (url.includes('sqlite') || url.endsWith('.db') || url.endsWith('.sqlite'))
            return 'sqlite';
        return 'api';
    }
    applyConfig(config) {
        if (config.connection) {
            const conn = config.connection;
            this.connections.create(conn.name, conn.type).key(conn.key);
        }
        if (config.schemas) {
            for (const schemaConfig of config.schemas) {
                this.createSchema(schemaConfig);
            }
        }
    }
    applyDefaultConfig() {
        // Create a default in-memory connection for quick start
        this.connections.create('default', 'api').key({ endpoint: 'memory' });
    }
    createSchema(config) {
        const builder = this.schemaManager.create(config.name);
        if (config.connection && config.collection) {
            builder.use({ connection: config.connection, collection: config.collection });
        }
        if (config.structure) {
            builder.setStructure(config.structure);
        }
    }
    // Simplified API methods
    connect(name, type, config) {
        this.connections.create(name, type).key(config);
        autoAttachAdapter(this.connections, name, type, config);
        return this;
    }
    schema(name) {
        return this.schemaManager.create(name);
    }
    use(schemaName) {
        return this.schemaManager.use(schemaName);
    }
    // Quick query methods
    async get(schemaName, filters) {
        const query = this.use(schemaName);
        if (filters) {
            Object.entries(filters).forEach(([field, value]) => {
                query.where(field, value);
            });
        }
        return query.get();
    }
    async getOne(schemaName, filters) {
        const query = this.use(schemaName);
        if (filters) {
            Object.entries(filters).forEach(([field, value]) => {
                query.where(field, value);
            });
        }
        return query.getOne();
    }
    async add(schemaName, data) {
        return this.use(schemaName).add(data);
    }
    async update(schemaName, filters, data) {
        const query = this.use(schemaName);
        Object.entries(filters).forEach(([field, value]) => {
            query.where(field, value);
        });
        await query.to(data).update();
    }
    async delete(schemaName, filters) {
        const query = this.use(schemaName);
        Object.entries(filters).forEach(([field, value]) => {
            query.where(field, value);
        });
        await query.delete();
    }
    // Get the underlying managers for advanced usage
    getConnections() {
        return this.connections;
    }
    getSchemaManager() {
        return this.schemaManager;
    }
}
// Create and configure the default instance
export const createMapper = () => {
    const mapper = Mapper.getInstance();
    mapper.autoConfigure();
    return mapper;
};
// Export a ready-to-use default instance
export default createMapper();
