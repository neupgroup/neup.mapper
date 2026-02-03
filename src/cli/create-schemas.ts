#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { pathToFileURL } from 'url';

// We need to import the Mapper class to mock it or use it
import { Mapper } from '../mapper.js';
import { Migrator, CreateTableBuilder, UpdateTableBuilder, DropTableBuilder, TruncateTableBuilder, ColumnBuilder } from '../ddl/migrator.js';

// --- Mocking Infrastructure ---

// We need to intercept Mapper.migrator() calls to return a MockMigrator
// that records schema changes instead of executing SQL.

interface SchemaDefinition {
    fields: any[];
    collection: string;
    usesConnection?: string;
}

const schemas: Record<string, SchemaDefinition> = {};
let currentConnection: string | undefined;

class MockColumnBuilder extends ColumnBuilder {
    constructor(name: string, private mockMigrator: MockMigrator) {
        super(name); // No parent migrator passed to avoid side effects if any
    }
    // We can override methods if needed, but the base ColumnBuilder just updates `this.def`
    // which is exactly what we want.
}

class MockCreateTableBuilder extends CreateTableBuilder {
    private mockColumns: ColumnBuilder[] = [];
    // connectionName is inherited from CreateTableBuilder (string, default 'default')
    // But we need to detect if it was changed or if we should use global currentConnection.
    private hasCustomConnection: boolean = false;
    
    constructor(private mockTableName: string) {
        super(mockTableName);
    }
    
    useConnection(name: string): this {
        super.useConnection(name);
        this.hasCustomConnection = true;
        return this;
    }

    addColumn(name: string): ColumnBuilder {
        const col = new ColumnBuilder(name);
        this.mockColumns.push(col);
        return col;
    }

    async exec(): Promise<void> {
        // Here we generate the schema!
        const fields = this.mockColumns.map(c => {
             const def = c.getDefinition();
             // Transform to schema field format
             const schemaField: any = { name: def.name, type: def.type };
             if (def.isPrimary) schemaField.isPrimary = true;
             if (def.autoIncrement) schemaField.autoIncrement = true;
             if (def.notNull) schemaField.notNull = true;
             if (def.isUnique) schemaField.isUnique = true;
             if (def.defaultValue !== undefined) schemaField.defaultValue = def.defaultValue;
             return schemaField;
        });

        schemas[this.mockTableName] = {
            fields: fields,
            collection: this.mockTableName
        };
        
        // Priority: 1. Explicit .useConnection() in builder 2. Global currentConnection (from migration file)
        if (this.hasCustomConnection) {
            // We can access 'connectionName' from parent because it's private in parent?
            // Actually it is private in CreateTableBuilder in src/ddl/migrator.ts.
            // So we can't access it here unless we change visibility or use 'any'.
             schemas[this.mockTableName].usesConnection = (this as any).connectionName;
        } else if (currentConnection) {
            schemas[this.mockTableName].usesConnection = currentConnection;
        }
    }
}

class MockUpdateTableBuilder extends UpdateTableBuilder {
    private mockColumns: ColumnBuilder[] = [];
    private droppedColumns: string[] = [];
    private hasCustomConnection: boolean = false;

    constructor(private mockTableName: string) {
        super(mockTableName);
    }
    
    useConnection(name: string): this {
        super.useConnection(name);
        this.hasCustomConnection = true;
        return this;
    }

    addColumn(name: string): ColumnBuilder {
        const col = new ColumnBuilder(name);
        this.mockColumns.push(col);
        return col;
    }

    dropColumn(name: string): this {
        this.droppedColumns.push(name);
        return this;
    }

    async exec(): Promise<void> {
        // Update existing schema
        const schema = schemas[this.mockTableName];
        if (!schema) {
            console.warn(`Warning: Update on non-existent table schema '${this.mockTableName}'. Order of migrations matters.`);
            return;
        }

        // Add new columns
        for (const col of this.mockColumns) {
             const def = col.getDefinition();
             const schemaField: any = { name: def.name, type: def.type };
             if (def.isPrimary) schemaField.isPrimary = true;
             if (def.autoIncrement) schemaField.autoIncrement = true;
             if (def.notNull) schemaField.notNull = true;
             if (def.isUnique) schemaField.isUnique = true;
             if (def.defaultValue !== undefined) schemaField.defaultValue = def.defaultValue;
             
             schema.fields.push(schemaField);
        }

        // Remove dropped columns
        if (this.droppedColumns.length > 0) {
            schema.fields = schema.fields.filter(f => !this.droppedColumns.includes(f.name));
        }
    }
}

class MockDropTableBuilder extends DropTableBuilder {
    constructor(private mockTableName: string) {
        super(mockTableName);
    }
    
    useConnection(name: string): this {
        super.useConnection(name);
        return this;
    }

    async exec(): Promise<void> {
        delete schemas[this.mockTableName];
    }
}

class MockTruncateTableBuilder extends TruncateTableBuilder {
    useConnection(name: string): this {
        super.useConnection(name);
        return this;
    }

    async exec(): Promise<void> {
        // No schema change
    }
}

class MockMigrator extends Migrator {
    constructor(tableName: string) {
        super(tableName);
    }

    // Override the public methods to return MockBuilders

    create(tableNameOrUndefined?: string, schema?: Record<string, string>): any {
        if (typeof tableNameOrUndefined === 'string' && schema) {
            // Legacy creation
            // We need to parse legacy schema object to fields
            const fields = Object.entries(schema).map(([name, type]) => {
                // Very basic parsing for legacy
                return { name, type }; 
            });
            // @ts-ignore
            schemas[tableNameOrUndefined] = {
                fields: fields,
                collection: tableNameOrUndefined
            };
            return;
        }
        // @ts-ignore
        return new MockCreateTableBuilder(this['tableName']!); 
    }

    update(tableNameOrUndefined?: string, schema?: Record<string, string>): any {
        if (typeof tableNameOrUndefined === 'string' && schema) {
             // Legacy update
             const schemaDef = schemas[tableNameOrUndefined];
             if (schemaDef) {
                 for (const [name, type] of Object.entries(schema)) {
                     schemaDef.fields.push({ name, type });
                 }
             }
             return;
        }
        return new MockUpdateTableBuilder(this['tableName']!);
    }

    drop(tableNameOrUndefined?: string): any {
        if (typeof tableNameOrUndefined === 'string') {
             delete schemas[tableNameOrUndefined];
             return;
        }
        return new MockDropTableBuilder(this['tableName']!);
    }

    truncate(tableNameOrUndefined?: string): any {
         // Truncate affects data, not schema
        return new MockTruncateTableBuilder(this['tableName']!);
    }
}

// Override Mapper.migrator
Mapper.migrator = (tableName: string) => {
    return new MockMigrator(tableName);
};


// --- Main Logic ---

(async () => {
    console.log("Generating schemas from migrations...");

    const cwd = process.cwd();
    const migrationsFile = path.resolve(cwd, 'src/mapper/migrations.ts');
    const schemasFile = path.resolve(cwd, 'src/mapper/schemas.ts');

    if (!fs.existsSync(migrationsFile)) {
        console.error("No migrations file found.");
        process.exit(1);
    }

    // Try to register ts-node for handling .ts files
    try {
        const { register } = await import('ts-node');
        register({
            compilerOptions: { module: 'CommonJS' },
            esm: true,
            transpileOnly: true // Speed up
        });
    } catch (e) {
        // console.warn('ts-node not found. Assuming compiled JS or native TS support.');
    }

    try {
        const fileUrl = pathToFileURL(migrationsFile).href;
        const module = await import(fileUrl);
        const migrations = module.migrations;

        if (Array.isArray(migrations)) {
            for (const migration of migrations) {
                if (migration.up) {
                    currentConnection = migration.usesConnection;
                    await migration.up();
                    currentConnection = undefined;
                }
            }
        }
    } catch (e) {
        console.error(`Error processing migrations:`, e);
    }

    // Generate schemas.ts content
    let content = `export const schemas: Record<string, any> = {};\n\n`;

    for (const [tableName, def] of Object.entries(schemas)) {
        content += `export const ${tableName} = ${JSON.stringify(def, null, 4)};\n\n`;
    }

    fs.writeFileSync(schemasFile, content);
    console.log(`Schemas generated at: ${schemasFile}`);

})();
