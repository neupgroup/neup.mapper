
// Basic types to avoid circular dependency on index.ts
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
        foreignKey: null
    };

    constructor(private name: string) {
        this.def.name = name;
    }

    type(t: ColumnType | string): this {
        this.def.type = t;
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

    notNull(): this {
        this.def.notNull = true;
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

    async exec(): Promise<void> {
        return Promise.resolve();
    }

    getDefinition() {
        return this.def;
    }
}

export class TableMigrator {
    private columns: ColumnBuilder[] = [];
    private connectionName: string = 'default';

    constructor(private name: string) { }

    useConnection(name: string): this {
        this.connectionName = name;
        return this;
    }

    addColumn(name: string): ColumnBuilder {
        const col = new ColumnBuilder(name);
        this.columns.push(col);
        return col;
    }

    getColumns() {
        return this.columns.map(c => c.getDefinition());
    }

    private async getAdapter() {
        const { StaticMapper } = await import('./fluent-mapper.js');
        try {
            const conn = StaticMapper.connection(this.connectionName);
            // Accessing internal mapper instance safely
            const adapter = (conn as any).mapper.getConnections().getAdapter(this.connectionName);
            const config = (conn as any).mapper.getConnections().get(this.connectionName);
            return { adapter, config };
        } catch (e) {
            console.error(`Failed to get adapter for connection: ${this.connectionName}`);
            return { adapter: null, config: null };
        }
    }

    private generateCreateSql(type: string): string {
        const columns = this.getColumns();
        let sql = `CREATE TABLE IF NOT EXISTS \`${this.name}\` (\n`;

        const columnDefs = columns.map(col => {
            let def = `  \`${col.name}\` `;

            // Map types
            let dbType = 'VARCHAR(255)';
            if (col.type === 'int') dbType = 'INT';
            else if (col.type === 'number') dbType = 'DECIMAL(10,2)';
            else if (col.type === 'boolean') dbType = 'TINYINT(1)';
            else if (col.type === 'date') dbType = 'DATETIME';

            def += dbType;

            if (col.notNull) def += ' NOT NULL';
            if (col.isPrimary) def += ' PRIMARY KEY';
            if (col.autoIncrement) {
                if (type === 'mysql') def += ' AUTO_INCREMENT';
                else if (type === 'sqlite') def += ' AUTOINCREMENT';
                else if (type === 'sql') def += ' SERIAL'; // Postgres handled differently usually but okay for simple
            }
            if (col.defaultValue !== undefined) {
                def += ` DEFAULT ${typeof col.defaultValue === 'string' ? `'${col.defaultValue}'` : col.defaultValue}`;
            }
            if (col.isUnique && !col.isPrimary) def += ' UNIQUE';

            return def;
        });

        sql += columnDefs.join(',\n');

        // Foreign keys
        columns.filter(c => c.foreignKey).forEach(c => {
            sql += `,\n  FOREIGN KEY (\`${c.name}\`) REFERENCES \`${c.foreignKey.table}\`(\`${c.foreignKey.column}\`)`;
        });

        sql += '\n)';

        if (type === 'postgres' || type === 'sql') {
            // Replace backticks with double quotes for Postgres
            sql = sql.replace(/`/g, '"');
        }

        return sql;
    }

    async exec(): Promise<void> {
        // 1. Update schema file
        const fs = await import('fs');
        const path = await import('path');

        const schemasDir = path.resolve(process.cwd(), 'src/schemas');
        if (!fs.existsSync(schemasDir)) fs.mkdirSync(schemasDir, { recursive: true });

        const schemaFilePath = path.join(schemasDir, `${this.name}.ts`);
        const columns = this.getColumns();

        const fieldsContent = columns.map(col => {
            return `        { name: '${col.name}', type: '${col.type}'${col.isPrimary ? ', isPrimary: true' : ''}${col.autoIncrement ? ', autoIncrement: true' : ''}${col.notNull ? ', notNull: true' : ''}${col.isUnique ? ', isUnique: true' : ''}${col.defaultValue !== undefined ? `, defaultValue: ${JSON.stringify(col.defaultValue)}` : ''} }`;
        }).join(',\n');

        const schemaContent = `
export const ${this.name} = {
    fields: [
${fieldsContent}
    ],
    insertableFields: [${columns.filter(c => !c.autoIncrement).map(c => `'${c.name}'`).join(', ')}],
    updatableFields: [${columns.filter(c => !c.autoIncrement && !c.isPrimary).map(c => `'${c.name}'`).join(', ')}],
    massUpdateable: false,
    massDeletable: false,
    usesConnection: '${this.connectionName}'
};
`;
        fs.writeFileSync(schemaFilePath, schemaContent.trim() + '\n');
        console.log(`Updated schema file: ${schemaFilePath}`);

        // 2. Execute on Database
        const { adapter, config } = await this.getAdapter();
        if (adapter && config) {
            console.log(`Executing migration on database (${config.type})...`);
            const sql = this.generateCreateSql(config.type);
            try {
                await adapter.raw(sql);
                console.log(`Successfully executed SQL on database.`);
            } catch (err: any) {
                console.error(`Database execution failed: ${err.message}`);
                throw err;
            }
        } else {
            console.log(`Skipping database execution: Connection "${this.connectionName}" not found or adapter not attached.`);
        }
    }

    async drop(): Promise<void> {
        // 1. Remove schema file
        const fs = await import('fs');
        const path = await import('path');
        const schemasDir = path.resolve(process.cwd(), 'src/schemas');
        const schemaFilePath = path.join(schemasDir, `${this.name}.ts`);
        if (fs.existsSync(schemaFilePath)) {
            fs.unlinkSync(schemaFilePath);
            console.log(`Deleted schema file: ${schemaFilePath}`);
        }

        // 2. Execute on Database
        const { adapter, config } = await this.getAdapter();
        if (adapter && config) {
            const quote = (config.type === 'postgres' || config.type === 'sql') ? '"' : '`';
            const sql = `DROP TABLE IF EXISTS ${quote}${this.name}${quote}`;
            try {
                await adapter.raw(sql);
                console.log(`Dropped table ${this.name} from database.`);
            } catch (err: any) {
                console.error(`Failed to drop table from database: ${err.message}`);
            }
        }
    }

    async dropColumn(columnName: string): Promise<void> {
        // 1. Update schema file
        const fs = await import('fs');
        const path = await import('path');
        const schemasDir = path.resolve(process.cwd(), 'src/schemas');
        const schemaFilePath = path.join(schemasDir, `${this.name}.ts`);

        if (fs.existsSync(schemaFilePath)) {
            const content = fs.readFileSync(schemaFilePath, 'utf-8');
            const lines = content.split('\n');
            const filteredLines = lines.filter(line => !line.includes(`name: '${columnName}'`));
            fs.writeFileSync(schemaFilePath, filteredLines.join('\n'));
            console.log(`Dropped column ${columnName} from schema file.`);
        }

        // 2. Execute on Database
        const { adapter, config } = await this.getAdapter();
        if (adapter && config) {
            const quote = (config.type === 'postgres' || config.type === 'sql') ? '"' : '`';
            const sql = `ALTER TABLE ${quote}${this.name}${quote} DROP COLUMN ${quote}${columnName}${quote}`;
            try {
                await adapter.raw(sql);
                console.log(`Dropped column ${columnName} from database.`);
            } catch (err: any) {
                console.error(`Failed to drop column from database: ${err.message}`);
            }
        }
    }

    async dropUnique(columnName: string): Promise<void> {
        // 1. Update schema file
        const fs = await import('fs');
        const path = await import('path');
        const schemasDir = path.resolve(process.cwd(), 'src/schemas');
        const schemaFilePath = path.join(schemasDir, `${this.name}.ts`);

        if (fs.existsSync(schemaFilePath)) {
            let content = fs.readFileSync(schemaFilePath, 'utf-8');
            const regex = new RegExp(`({ name: '${columnName}', .*?), isUnique: true(.*})`);
            content = content.replace(regex, '$1$2');
            fs.writeFileSync(schemaFilePath, content);
            console.log(`Dropped unique constraint from ${columnName} in schema file.`);
        }

        // 2. Execute on Database (Database specific, simplified for MySQL)
        const { adapter, config } = await this.getAdapter();
        if (adapter && config && config.type === 'mysql') {
            try {
                await adapter.raw(`ALTER TABLE \`${this.name}\` DROP INDEX \`${columnName}\``);
                console.log(`Dropped unique index ${columnName} from database.`);
            } catch (err: any) {
                console.error(`Failed to drop unique index from database: ${err.message}`);
            }
        }
    }

    async dropPrimaryKey(columnName: string): Promise<void> {
        // 1. Update schema file
        const fs = await import('fs');
        const path = await import('path');
        const schemasDir = path.resolve(process.cwd(), 'src/schemas');
        const schemaFilePath = path.join(schemasDir, `${this.name}.ts`);

        if (fs.existsSync(schemaFilePath)) {
            let content = fs.readFileSync(schemaFilePath, 'utf-8');
            const regex = new RegExp(`({ name: '${columnName}', .*?), isPrimary: true(.*})`);
            content = content.replace(regex, '$1$2');
            fs.writeFileSync(schemaFilePath, content);
            console.log(`Dropped primary key constraint from ${columnName} in schema file.`);
        }

        // 2. Execute on Database
        const { adapter, config } = await this.getAdapter();
        if (adapter && config) {
            const quote = (config.type === 'postgres' || config.type === 'sql') ? '"' : '`';
            try {
                await adapter.raw(`ALTER TABLE ${quote}${this.name}${quote} DROP PRIMARY KEY`);
                console.log(`Dropped primary key from database.`);
            } catch (err: any) {
                console.warn(`Failed to drop primary key: ${err.message}. (Some databases require more complex PK drops)`);
            }
        }
    }
}

