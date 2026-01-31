export class ColumnBuilder {
    constructor(name) {
        this.name = name;
        this.def = {
            type: 'string',
            isPrimary: false,
            isUnique: false,
            notNull: false,
            autoIncrement: false,
            defaultValue: undefined,
            enumValues: [],
            foreignKey: null
        };
        this.def.name = name;
    }
    type(t) {
        this.def.type = t;
        return this;
    }
    isPrimary() {
        this.def.isPrimary = true;
        return this;
    }
    isUnique() {
        this.def.isUnique = true;
        return this;
    }
    notNull() {
        this.def.notNull = true;
        return this;
    }
    autoIncrement() {
        this.def.autoIncrement = true;
        return this;
    }
    default(val) {
        this.def.defaultValue = val;
        return this;
    }
    values(vals) {
        this.def.enumValues = vals;
        return this;
    }
    foreignKey(table, column) {
        this.def.foreignKey = { table, column };
        return this;
    }
    async exec() {
        return Promise.resolve();
    }
    getDefinition() {
        return this.def;
    }
}
export class TableMigrator {
    constructor(name) {
        this.name = name;
        this.columns = [];
    }
    addColumn(name) {
        const col = new ColumnBuilder(name);
        this.columns.push(col);
        return col;
    }
    getColumns() {
        return this.columns.map(c => c.getDefinition());
    }
    async exec() {
        // This is where we trigger schema file update
        const fs = await import('fs');
        const path = await import('path');
        const schemasDir = path.resolve(process.cwd(), 'src/schemas');
        const schemaFilePath = path.join(schemasDir, `${this.name}.ts`);
        const columns = this.getColumns();
        let existingSchema = {
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
