
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
}
