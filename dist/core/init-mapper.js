import { Connections } from '../connections.js';
import { SchemaManager } from '../schema-manager.js';
import { autoAttachAdapter } from '../adapters/index.js';
export class InitMapper {
    constructor() {
        this.registeredSchemas = {};
        this.connections = new Connections();
        this.schemaManager = new SchemaManager(this.connections);
    }
    static getInstance() {
        if (!InitMapper.instance) {
            InitMapper.instance = new InitMapper();
        }
        return InitMapper.instance;
    }
    getConnections() {
        return this.connections;
    }
    getDefaultConnection() {
        return this.connections.getDefault();
    }
    getSchemaManager() {
        return this.schemaManager;
    }
    connect(name, type, config) {
        this.connections.create(name, type).key(config);
        autoAttachAdapter(this.connections, name, type, config);
        return this;
    }
    schema(name) {
        return this.schemaManager.create(name);
    }
    use(name) {
        return this.schemaManager.use(name);
    }
    loadSchemas(schemas) {
        this.registeredSchemas = { ...this.registeredSchemas, ...schemas };
        return this;
    }
    getSchemaDef(tableName) {
        return this.registeredSchemas[tableName];
    }
}
