import { TableMigrator } from '../migrator.js';
import { parseDescriptorStructure } from '../index.js';
export class SchemaCreator {
    constructor(mapper, name, type) {
        this.mapper = mapper;
        this.name = name;
        this.type = type;
        this.migrator = new TableMigrator(name);
        this.ensureRegistration();
    }
    ensureRegistration() {
        // Register if technically missing from memory so migrator has something to work with
        const manager = this.mapper.getSchemaManager();
        if (!manager.schemas.has(this.name)) {
            manager.create(this.name).use({ connection: 'default', collection: this.name }).setStructure({});
        }
    }
    // DDL Methods
    addColumn(name) { return this.migrator.addColumn(name); }
    structure(config) {
        // Apply structure config to the in-memory definition immediately for usage
        const def = this.mapper.getSchemaManager().schemas.get(this.name);
        if (def) {
            const parsed = parseDescriptorStructure(config);
            def.fields = parsed.fields;
            def.fieldsMap = new Map();
            def.fields.forEach((f) => def.fieldsMap.set(f.name, f));
        }
        return this;
    }
    useConnection(connectionName) {
        this.migrator.useConnection(connectionName);
        // Also update in-memory definition
        const def = this.mapper.getSchemaManager().schemas.get(this.name);
        if (def)
            def.connectionName = connectionName;
        return this;
    }
    async exec() {
        return this.migrator.exec();
    }
}
export class SchemaUpdater {
    constructor(mapper, name) {
        this.mapper = mapper;
        this.name = name;
        this.migrator = new TableMigrator(name);
    }
    addColumn(name) { return this.migrator.addColumn(name); }
    selectColumn(name) { return this.migrator.selectColumn(name); }
    dropColumn(name) { this.migrator.dropColumn(name); return this; }
    useConnection(connectionName) {
        this.migrator.useConnection(connectionName);
        return this;
    }
    async exec() {
        return this.migrator.exec();
    }
}
export class SchemaDropper {
    constructor(name) {
        this.name = name;
        this.connectionName = 'default';
    }
    useConnection(name) {
        this.connectionName = name;
        return this;
    }
    async exec() {
        const migrator = new TableMigrator(this.name);
        migrator.useConnection(this.connectionName);
        return migrator.drop().exec();
    }
}
export class SchemaHandler {
    constructor(mapper, name, schemaType) {
        this.mapper = mapper;
        this.name = name;
        this.schemaType = schemaType;
    }
    create() {
        return new SchemaCreator(this.mapper, this.name, this.schemaType);
    }
    update() {
        return new SchemaUpdater(this.mapper, this.name);
    }
    drop() {
        return new SchemaDropper(this.name);
    }
}
export class SchemaDispatcher {
    constructor(mapper, name) {
        this.mapper = mapper;
        this.name = name;
    }
    type(type) {
        return new SchemaHandler(this.mapper, this.name, type);
    }
    // Shortcuts if type is omitted (defaults to 'table' behavior essentially)
    create() { return new SchemaHandler(this.mapper, this.name, 'table').create(); }
    update() { return new SchemaHandler(this.mapper, this.name, 'table').update(); }
    drop() { return new SchemaHandler(this.mapper, this.name, 'table').drop(); }
}
