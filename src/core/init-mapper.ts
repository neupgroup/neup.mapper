import { Connections } from '../connections.js';
import { SchemaManager } from '../schema-manager.js';
import { autoAttachAdapter } from '../adapters/index.js';

export class InitMapper {
    private static instance: InitMapper;
    private connections: Connections;
    private schemaManager: SchemaManager;

    private constructor() {
        this.connections = new Connections();
        this.schemaManager = new SchemaManager(this.connections);
    }

    static getInstance(): InitMapper {
        if (!InitMapper.instance) {
            InitMapper.instance = new InitMapper();
        }
        return InitMapper.instance;
    }

    getConnections(): Connections {
        return this.connections;
    }

    getSchemaManager(): SchemaManager {
        return this.schemaManager;
    }

    connect(name: string, type: any, config: any): this {
        this.connections.create(name, type).key(config);
        autoAttachAdapter(this.connections, name, type, config);
        return this;
    }

    schema(name: string) {
        return this.schemaManager.create(name);
    }

    use(name: string) {
        return this.schemaManager.use(name);
    }
}
