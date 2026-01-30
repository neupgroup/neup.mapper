import { createMapper } from './mapper.js';
export class ConfigLoader {
    static getInstance() {
        if (!ConfigLoader.instance) {
            ConfigLoader.instance = new ConfigLoader();
        }
        return ConfigLoader.instance;
    }
    load(config) {
        this.config = config;
    }
    loadFromFile(path) {
        try {
            // In Node.js environment
            if (typeof require !== 'undefined') {
                const fs = require('fs');
                const configData = fs.readFileSync(path, 'utf8');
                this.config = JSON.parse(configData);
            }
            else {
                // In browser environment, fetch the config file
                fetch(path)
                    .then(response => response.json())
                    .then(config => {
                    this.config = config;
                })
                    .catch((error) => {
                    throw new Error(`Failed to load config from ${path}: ${error.message}`);
                });
            }
        }
        catch (error) {
            throw new Error(`Failed to load config from ${path}: ${error.message}`);
        }
    }
    getConfig() {
        return this.config;
    }
}
export class ConfigBasedMapper {
    constructor() {
        this.initialized = false;
        this.mapper = createMapper();
        this.configLoader = ConfigLoader.getInstance();
    }
    configure(config) {
        this.configLoader.load(config);
        this.initializeFromConfig();
        return this;
    }
    configureFromFile(path) {
        this.configLoader.loadFromFile(path);
        this.initializeFromConfig();
        return this;
    }
    initializeFromConfig() {
        const config = this.configLoader.getConfig();
        if (!config) {
            throw new Error('No configuration loaded');
        }
        // Initialize connections
        for (const connectionConfig of config.connections) {
            this.initializeConnection(connectionConfig);
        }
        // Initialize schemas
        if (config.schemas) {
            for (const schemaConfig of config.schemas) {
                this.initializeSchema(schemaConfig);
            }
        }
        this.initialized = true;
    }
    initializeConnection(config) {
        const { name, type } = config;
        if (type === 'api') {
            const apiConfig = config;
            this.mapper.connect(name, type, apiConfig);
        }
        else {
            const dbConfig = config;
            this.mapper.connect(name, type, dbConfig);
        }
    }
    initializeSchema(config) {
        const schemaBuilder = this.mapper.schema(config.name);
        schemaBuilder.use({ connection: config.connection, collection: config.collection });
        if (config.structure) {
            schemaBuilder.setStructure(config.structure);
        }
    }
    // Delegate methods to the underlying mapper
    getConnections() {
        return this.mapper.getConnections();
    }
    getSchemaManager() {
        return this.mapper.getSchemaManager();
    }
    use(schemaName) {
        if (!this.initialized) {
            throw new Error('Mapper not initialized. Call configure() first.');
        }
        return this.mapper.use(schemaName);
    }
    schema(name) {
        if (!this.initialized) {
            throw new Error('Mapper not initialized. Call configure() first.');
        }
        return this.mapper.schema(name);
    }
    connect(name, type, config) {
        if (!this.initialized) {
            throw new Error('Mapper not initialized. Call configure() first.');
        }
        return this.mapper.connect(name, type, config);
    }
    // Quick query methods
    async get(schemaName, filters) {
        if (!this.initialized) {
            throw new Error('Mapper not initialized. Call configure() first.');
        }
        return this.mapper.get(schemaName, filters);
    }
    async getOne(schemaName, filters) {
        if (!this.initialized) {
            throw new Error('Mapper not initialized. Call configure() first.');
        }
        return this.mapper.getOne(schemaName, filters);
    }
    async add(schemaName, data) {
        if (!this.initialized) {
            throw new Error('Mapper not initialized. Call configure() first.');
        }
        return this.mapper.add(schemaName, data);
    }
    async update(schemaName, filters, data) {
        if (!this.initialized) {
            throw new Error('Mapper not initialized. Call configure() first.');
        }
        return this.mapper.update(schemaName, filters, data);
    }
    async delete(schemaName, filters) {
        if (!this.initialized) {
            throw new Error('Mapper not initialized. Call configure() first.');
        }
        return this.mapper.delete(schemaName, filters);
    }
}
// Create a default instance
let defaultConfigMapper = null;
export function createConfigMapper(config) {
    const mapper = new ConfigBasedMapper();
    if (config) {
        mapper.configure(config);
    }
    defaultConfigMapper = mapper;
    return mapper;
}
// Export a function to get the default instance
export function getConfigMapper() {
    if (!defaultConfigMapper) {
        defaultConfigMapper = new ConfigBasedMapper();
    }
    return defaultConfigMapper;
}
// Create a default configured mapper instance
export function createDefaultMapper(config) {
    const mapper = new ConfigBasedMapper();
    // If no config provided, try to load from environment or default locations
    if (!config) {
        // Try to load from environment
        const envConfig = loadConfigFromEnvironment();
        if (envConfig) {
            mapper.configure(envConfig);
        }
        else {
            // Try to load from default config file locations
            const defaultPaths = ['./mapper.config.json', './config/mapper.json', '/etc/mapper/config.json'];
            for (const path of defaultPaths) {
                try {
                    mapper.configureFromFile(path);
                    break;
                }
                catch (error) {
                    // Continue trying other paths
                }
            }
        }
    }
    else {
        mapper.configure(config);
    }
    return mapper;
}
function loadConfigFromEnvironment() {
    if (typeof process !== 'undefined' && process.env) {
        // Check for MAPPER_CONFIG environment variable
        const envConfig = process.env.MAPPER_CONFIG;
        if (envConfig) {
            try {
                return JSON.parse(envConfig);
            }
            catch (error) {
                console.warn('Failed to parse MAPPER_CONFIG environment variable:', error);
            }
        }
        // Check for individual database connection environment variables
        const databaseUrl = process.env.DATABASE_URL;
        if (databaseUrl) {
            return {
                connections: [{
                        name: 'default',
                        type: inferConnectionType(databaseUrl),
                        host: databaseUrl,
                        port: 5432,
                        database: 'default',
                        user: 'default'
                    }]
            };
        }
    }
    return null;
}
function inferConnectionType(url) {
    if (url.includes('mysql'))
        return 'mysql';
    if (url.includes('postgres') || url.includes('postgresql'))
        return 'sql';
    if (url.includes('mongodb'))
        return 'mongodb';
    if (url.includes('firestore'))
        return 'firestore';
    return 'sql'; // default to sql
}
export default ConfigBasedMapper;
