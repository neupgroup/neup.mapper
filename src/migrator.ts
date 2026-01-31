
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

    constructor(private name: string) { }

    addColumn(name: string): ColumnBuilder {
        const col = new ColumnBuilder(name);
        this.columns.push(col);
        return col;
    }

    getColumns() {
        return this.columns.map(c => c.getDefinition());
    }

    async exec(): Promise<void> {
        // This is where we trigger schema file update
        const fs = await import('fs');
        const path = await import('path');

        const schemasDir = path.resolve(process.cwd(), 'src/schemas');
        const schemaFilePath = path.join(schemasDir, `${this.name}.ts`);

        const columns = this.getColumns();

        let existingSchema: any = {
            fields: [],
            insertableFields: [],
            updatableFields: [],
            massUpdateable: false,
            massDeletable: false,
            usesConnection: 'default'
        };

        if (fs.existsSync(schemaFilePath)) {
            // Very basic parser/updater. 
            // Real implementation would use AST, but for now we'll do simple string replacement or overwrite if it's the first time.
            // For the sake of this demo, we will generate the fields array.
        }

        const fieldsContent = columns.map(col => {
            return `        { name: '${col.name}', type: '${col.type}'${col.isPrimary ? ', isPrimary: true' : ''}${col.autoIncrement ? ', autoIncrement: true' : ''}${col.notNull ? ', notNull: true' : ''}${col.isUnique ? ', isUnique: true' : ''} }`;
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
    usesConnection: 'default'
};
`;
        fs.writeFileSync(schemaFilePath, schemaContent.trim() + '\n');
        console.log(`Updated schema: ${schemaFilePath}`);
    }
}
