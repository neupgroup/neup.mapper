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
}
