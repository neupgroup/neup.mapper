import { TableMigrator } from '../migrator.js';
import { parseDescriptorStructure } from '../index.js';

export class SchemaCreator {
    private migrator: TableMigrator;

    constructor(private mapper: any, private name: string, private type: string) {
        this.migrator = new TableMigrator(name);
        this.ensureRegistration();
    }

    private ensureRegistration() {
        // Register if technically missing from memory so migrator has something to work with
        const manager = this.mapper.getSchemaManager();
        if (!(manager as any).schemas.has(this.name)) {
            manager.create(this.name).use({ connection: 'default', collection: this.name }).setStructure({});
        }
    }

    // DDL Methods
    addColumn(name: string) { return this.migrator.addColumn(name); }

    structure(config: any): this {
        // Apply structure config to the in-memory definition immediately for usage
        const def = (this.mapper.getSchemaManager() as any).schemas.get(this.name);
        if (def) {
            const parsed = parseDescriptorStructure(config);
            def.fields = parsed.fields;
            def.fieldsMap = new Map();
            def.fields.forEach((f: any) => def.fieldsMap.set(f.name, f));
        }
        return this;
    }

    useConnection(connectionName: string): this {
        this.migrator.useConnection(connectionName);
        // Also update in-memory definition
        const def = (this.mapper.getSchemaManager() as any).schemas.get(this.name);
        if (def) def.connectionName = connectionName;
        return this;
    }

    async exec(): Promise<void> {
        return this.migrator.exec();
    }
}

export class SchemaUpdater {
    private migrator: TableMigrator;

    constructor(private mapper: any, private name: string) {
        this.migrator = new TableMigrator(name);
    }

    addColumn(name: string) { return this.migrator.addColumn(name); }
    selectColumn(name: string) { return this.migrator.selectColumn(name); }
    dropColumn(name: string) { this.migrator.dropColumn(name); return this; }

    useConnection(connectionName: string): this {
        this.migrator.useConnection(connectionName);
        return this;
    }

    async exec(): Promise<void> {
        return this.migrator.exec();
    }
}

export class SchemaDropper {
    constructor(private name: string) { }

    private connectionName: string = 'default';

    useConnection(name: string): this {
        this.connectionName = name;
        return this;
    }

    async exec(): Promise<void> {
        const migrator = new TableMigrator(this.name);
        migrator.useConnection(this.connectionName);
        return migrator.drop().exec();
    }
}

export class SchemaHandler {
    constructor(protected mapper: any, protected name: string, protected schemaType: string) { }

    create(): SchemaCreator {
        return new SchemaCreator(this.mapper, this.name, this.schemaType);
    }

    update(): SchemaUpdater {
        return new SchemaUpdater(this.mapper, this.name);
    }

    drop(): SchemaDropper {
        return new SchemaDropper(this.name);
    }
}

export class SchemaDispatcher {
    constructor(private mapper: any, private name: string) { }

    type(type: 'table' | 'api' | 'collection'): SchemaHandler {
        return new SchemaHandler(this.mapper, this.name, type);
    }

    // Shortcuts if type is omitted (defaults to 'table' behavior essentially)
    create(): SchemaCreator { return new SchemaHandler(this.mapper, this.name, 'table').create(); }
    update(): SchemaUpdater { return new SchemaHandler(this.mapper, this.name, 'table').update(); }
    drop(): SchemaDropper { return new SchemaHandler(this.mapper, this.name, 'table').drop(); }
}
