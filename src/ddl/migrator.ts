import { Executor } from '../core/executor.js';
import { ensureInitialized } from '../core/initializer.js';

// --- New Command Builders ---

export interface DdlExecutor {
    exec(): Promise<void>;
}

export class CreateTableBuilder implements DdlExecutor {
    private columns: ColumnBuilder[] = [];
    private connectionName: string = 'default';

    constructor(private tableName: string) {}
    
    useConnection(name: string): this {
        this.connectionName = name;
        return this;
    }

    addColumn(name: string): ColumnBuilder {
        const col = new ColumnBuilder(name); 
        this.columns.push(col);
        return col;
    }

    async exec(): Promise<void> {
        const migrator = new Migrator(this.tableName);
        migrator.useConnection(this.connectionName);
        migrator._setCreateMode();
        for (const col of this.columns) {
            const def = col.getDefinition();
            const mCol = migrator._addColumn(def.name);
            mCol.type(def.type);
            if(def.isPrimary) mCol.isPrimary();
            if(def.autoIncrement) mCol.autoIncrement();
            if(def.isUnique) mCol.isUnique();
            if(def.notNull) mCol.notNull();
            if(def.defaultValue !== undefined) mCol.default(def.defaultValue);
            if(def.length) mCol.length(def.length);
        }
        await migrator.exec();
    }
}

export class UpdateTableBuilder implements DdlExecutor {
    private migrator: Migrator;
    private connectionName: string = 'default';

    constructor(private tableName: string) {
        this.migrator = new Migrator(tableName);
    }
    
    useConnection(name: string): this {
        this.connectionName = name;
        this.migrator.useConnection(name);
        return this;
    }

    addColumn(name: string): ColumnBuilder {
        return this.migrator._addColumn(name);
    }

    dropColumn(name: string): this {
        this.migrator._dropColumn(name);
        return this;
    }

    modifyColumn(name: string): ColumnBuilder {
        return this.migrator._modifyColumn(name);
    }

    async exec(): Promise<void> {
        await this.migrator.exec();
    }
}

export class DropTableBuilder implements DdlExecutor {
    private connectionName: string = 'default';
    constructor(private tableName: string) {}

    useConnection(name: string): this {
        this.connectionName = name;
        return this;
    }

    async exec(): Promise<void> {
        const migrator = new Migrator(this.tableName);
        migrator.useConnection(this.connectionName);
        migrator._dropTable();
        await migrator.exec();
    }
}

export class TruncateTableBuilder implements DdlExecutor {
    private connectionName: string = 'default';
    constructor(private tableName: string) {}

    useConnection(name: string): this {
        this.connectionName = name;
        return this;
    }

    async exec(): Promise<void> {
        const sql = `DELETE FROM ${this.tableName}`; 
        const result = await new Executor(sql).useConnection(this.connectionName).execute();
        console.log('Migration Result:', result);
    }
}

// Basic types
export type ColumnType = 'string' | 'number' | 'boolean' | 'date' | 'int';

export class ColumnBuilder {
    private def: any = {
        type: 'string',
        isPrimary: false,
        isUnique: false,
        notNull: false,
        autoIncrement: false,
        defaultValue: undefined,
        enumValues: [],
        foreignKey: null,
        length: undefined
    };

    constructor(private name: string, private migrator?: Migrator) {
        this.def.name = name;
    }

    type(t: ColumnType | string): this {
        this.def.type = t;
        return this;
    }

    length(len: number): this {
        this.def.length = len;
        return this;
    }

    isPrimary(): this {
        this.def.isPrimary = true;
        return this;
    }

    isUnique(): this {
        this.def.isUnique = true;
        return this;
    }

    unique(): this {
        return this.isUnique();
    }

    notNull(): this {
        this.def.notNull = true;
        return this;
    }

    isNullable(): this {
        this.def.notNull = false;
        return this;
    }

    autoIncrement(): this {
        this.def.autoIncrement = true;
        return this;
    }

    default(val: any): this {
        this.def.defaultValue = val;
        return this;
    }

    values(vals: any[]): this {
        this.def.enumValues = vals;
        return this;
    }

    foreignKey(table: string, column: string): this {
        this.def.foreignKey = { table, column };
        return this;
    }

    dropUnique(): this {
        if (this.migrator) this.migrator.dropUnique(this.name);
        return this;
    }

    dropPrimaryKey(): this {
        if (this.migrator) this.migrator.dropPrimaryKey(this.name);
        return this;
    }

    drop(): this {
        if (this.migrator) this.migrator._dropColumn(this.name);
        return this;
    }

    getDefinition() {
        return this.def;
    }
}

interface MigratorAction {
    type: 'dropTable' | 'dropColumn' | 'dropUnique' | 'dropPrimaryKey' | 'addColumn' | 'modifyColumn';
    payload: any;
}

export class Migrator {
    private columns: ColumnBuilder[] = [];
    private actions: MigratorAction[] = [];
    private isCreateMode: boolean = false;
    private connectionName: string = 'default';

    constructor(private tableName?: string) { }
    
    _setCreateMode() {
        this.isCreateMode = true;
    }
    
    useConnection(name: string): this {
        this.connectionName = name;
        return this;
    }

    // --- Overloaded Command API ---

    create(): CreateTableBuilder;
    create(tableName: string, schema: Record<string, string>): Promise<any>;
    create(tableNameOrUndefined?: string, schema?: Record<string, string>): any {
        if (typeof tableNameOrUndefined === 'string' && schema) {
            return this.legacyCreate(tableNameOrUndefined, schema);
        }
        if (!this.tableName) throw new Error("Table name is required for create()");
        return new CreateTableBuilder(this.tableName).useConnection(this.connectionName);
    }

    update(): UpdateTableBuilder;
    update(tableName: string, schema: Record<string, string>): Promise<any>;
    update(tableNameOrUndefined?: string, schema?: Record<string, string>): any {
        if (typeof tableNameOrUndefined === 'string' && schema) {
            return this.legacyUpdate(tableNameOrUndefined, schema);
        }
        if (!this.tableName) throw new Error("Table name is required for update()");
        return new UpdateTableBuilder(this.tableName).useConnection(this.connectionName);
    }

    drop(): DropTableBuilder;
    drop(tableName: string): Promise<any>;
    drop(tableNameOrUndefined?: string): any {
        if (typeof tableNameOrUndefined === 'string') {
            return this.legacyDrop(tableNameOrUndefined);
        }
        if (!this.tableName) throw new Error("Table name is required for drop()");
        return new DropTableBuilder(this.tableName).useConnection(this.connectionName);
    }

    truncate(): TruncateTableBuilder;
    truncate(tableName: string): Promise<any>;
    truncate(tableNameOrUndefined?: string): any {
        if (typeof tableNameOrUndefined === 'string') {
            return this.legacyTruncate(tableNameOrUndefined);
        }
        if (!this.tableName) throw new Error("Table name is required for truncate()");
        return new TruncateTableBuilder(this.tableName).useConnection(this.connectionName);
    }

    // --- Internal Helpers for Builders ---
    // These are now internal or accessed via builders, not directly by user

    _addColumn(name: string): ColumnBuilder {
        if (!this.tableName) throw new Error("Table name is required for addColumn");
        const col = new ColumnBuilder(name, this);
        this.columns.push(col);
        this.actions.push({ type: 'addColumn', payload: col });
        return col;
    }

    _dropColumn(columnName: string): this {
        if (!this.tableName) throw new Error("Table name is required for dropColumn");
        this.actions.push({ type: 'dropColumn', payload: columnName });
        return this;
    }

    _modifyColumn(name: string): ColumnBuilder {
        if (!this.tableName) throw new Error("Table name is required for modifyColumn");
        const col = new ColumnBuilder(name, this);
        this.actions.push({ type: 'modifyColumn', payload: col });
        return col;
    }

    _dropTable(name?: string): this {
        const target = name || this.tableName;
        if (!target) throw new Error("Table name is required for dropTable");
        this.actions.push({ type: 'dropTable', payload: target });
        return this;
    }

    dropUnique(columnName: string): this {
        if (!this.tableName) throw new Error("Table name is required for dropUnique");
        this.actions.push({ type: 'dropUnique', payload: columnName });
        return this;
    }

    dropPrimaryKey(columnName: string): this {
        if (!this.tableName) throw new Error("Table name is required for dropPrimaryKey");
        this.actions.push({ type: 'dropPrimaryKey', payload: columnName });
        return this;
    }

    // --- Legacy Implementations ---

    private async legacyCreate(tableName: string, schema: Record<string, string>): Promise<any> {
        this.tableName = tableName;
        const columns = Object.entries(schema).map(([c, t]) => `${c} ${t}`).join(', ');
        const sql = `CREATE TABLE IF NOT EXISTS ${tableName} (${columns})`;
        const result = await new Executor(sql).useConnection(this.connectionName).execute();
        console.log('Migration Result:', result);
    }

    private async legacyUpdate(tableName: string, schema: Record<string, string>): Promise<any> {
        for (const [column, type] of Object.entries(schema)) {
            const sql = `ALTER TABLE ${tableName} ADD COLUMN ${column} ${type}`;
            try {
                const result = await new Executor(sql).useConnection(this.connectionName).execute();
                console.log('Migration Result:', result);
            } catch (error: any) {
                // Ignore duplicate column errors
            }
        }
    }
    
    private async legacyDrop(tableName: string): Promise<any> {
        const sql = `DROP TABLE IF EXISTS ${tableName}`;
        const result = await new Executor(sql).useConnection(this.connectionName).execute();
        console.log('Migration Result:', result);
    }

    private async legacyTruncate(tableName: string): Promise<any> {
        const sql = `DELETE FROM ${tableName}`; 
        const result = await new Executor(sql).useConnection(this.connectionName).execute();
        console.log('Migration Result:', result);
        return result;
    }
    
    // --- Execution ---

    private generateColumnSql(col: any, type: string): string {
        let def = `\`${col.name}\` `;
        let dbType = `VARCHAR(${col.length || 255})`;
        
        // Basic type mapping
        if (col.type === 'int') dbType = 'INTEGER'; 
        else if (col.type === 'number') dbType = 'DECIMAL(10,2)';
        else if (col.type === 'boolean') dbType = 'TINYINT(1)';
        else if (col.type === 'date') dbType = 'DATETIME';
        else if (col.type === 'text') dbType = 'TEXT';

        def += dbType;
        if (col.notNull) def += ' NOT NULL';
        
        // Primary Key & Auto Increment logic
        if (col.isPrimary && type !== 'sqlite') def += ' PRIMARY KEY';
        
        if (col.autoIncrement) {
            if (type === 'mysql') def += ' AUTO_INCREMENT';
            else if (type === 'sqlite') {
                if (col.isPrimary) def += ' PRIMARY KEY AUTOINCREMENT';
                else def += ' AUTOINCREMENT';
            }
            else if (type === 'sql' || type === 'postgres') def += ' SERIAL';
        } else if (col.isPrimary && type === 'sqlite') {
             def += ' PRIMARY KEY';
        }

        if (col.defaultValue !== undefined) {
            def += ` DEFAULT ${typeof col.defaultValue === 'string' ? `'${col.defaultValue}'` : col.defaultValue}`;
        }
        if (col.isUnique && !col.isPrimary) def += ' UNIQUE';
        
        return def;
    }

    async exec(): Promise<void> {
        return this.execute();
    }

    async execute(): Promise<void> {
        await ensureInitialized();
        // Dynamic import to avoid circular deps if any, though less likely here
        const fs = await import('fs');
        const path = await import('path');
        const { InitMapper } = await import('../core/init-mapper.js');
        
        // Get connection details to know DB type
        const initMapper = InitMapper.getInstance();
        
        let connectionNameToUse = this.connectionName;

        // If the connection is the default placeholder, resolve the actual default connection.
        if (connectionNameToUse === 'default') {
            const defaultConn = initMapper.getDefaultConnection();
            if (defaultConn) {
                connectionNameToUse = defaultConn.name;
            }
        }

        const conn = initMapper.getConnections().get(connectionNameToUse);
        if (!conn) {
             throw new Error(`Connection '${connectionNameToUse}' not found.`);
        }
        
        const type = conn?.type || 'sqlite'; // Default to sqlite if not found
        const quote = (type === 'postgres' || type === 'sql') ? '"' : '`';

        if (this.isCreateMode && this.columns.length > 0) {
             let createSql = `CREATE TABLE IF NOT EXISTS ${quote}${this.tableName}${quote} (\n`;
             createSql += this.columns.map(c => '  ' + this.generateColumnSql(c.getDefinition(), type)).join(',\n');
             createSql += '\n)';
             
             try {
                const result = await new Executor(createSql).useConnection(connectionNameToUse).execute();
                console.log('Migration Result:', result);
             } catch (e: any) {
                 console.error("Create Table Failed:", e.message);
                 throw e;
             }
        } else {
            for (const action of this.actions) {
                let sql = '';
                
                switch (action.type) {
                    case 'dropTable':
                        sql = `DROP TABLE IF EXISTS ${quote}${action.payload}${quote}`;
                        break;
    
                    case 'addColumn':
                        const colDef = action.payload.getDefinition();
                        sql = `ALTER TABLE ${quote}${this.tableName}${quote} ADD COLUMN ${this.generateColumnSql(colDef, type)}`;
                        break;
    
                    case 'modifyColumn':
                         const modDef = action.payload.getDefinition();
                         if (type === 'mysql') {
                             sql = `ALTER TABLE \`${this.tableName}\` MODIFY COLUMN ${this.generateColumnSql(modDef, type)}`;
                         } else {
                             sql = `ALTER TABLE "${this.tableName}" ALTER COLUMN "${modDef.name}" TYPE ${modDef.type}`;
                         }
                         break;
    
                    case 'dropColumn':
                        sql = `ALTER TABLE ${quote}${this.tableName}${quote} DROP COLUMN ${quote}${action.payload}${quote}`;
                        break;
                    
                     case 'dropUnique':
                        if (type === 'mysql') sql = `ALTER TABLE \`${this.tableName}\` DROP INDEX \`${action.payload}\``;
                        else sql = `ALTER TABLE ${quote}${this.tableName}${quote} DROP CONSTRAINT ${quote}${action.payload}_unique${quote}`;
                        break;
    
                    case 'dropPrimaryKey':
                        sql = `ALTER TABLE ${quote}${this.tableName}${quote} DROP PRIMARY KEY`;
                        break;
                }
    
                if (sql) {
                    try {
                        const result = await new Executor(sql).useConnection(connectionNameToUse).execute();
                        console.log('Migration Action Result:', result);
                    } catch (err: any) {
                        console.error(`Migration Action Failed: ${err.message}`);
                    }
                }
            }
        }

        this.actions = [];
        this.columns = [];
    }
}