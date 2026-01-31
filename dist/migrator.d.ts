export type ColumnType = 'string' | 'number' | 'boolean' | 'date' | 'int';
export declare class ColumnBuilder {
    private name;
    private def;
    constructor(name: string);
    type(t: ColumnType | string): this;
    isPrimary(): this;
    isUnique(): this;
    notNull(): this;
    autoIncrement(): this;
    default(val: any): this;
    values(vals: any[]): this;
    foreignKey(table: string, column: string): this;
    exec(): Promise<void>;
    getDefinition(): any;
}
export declare class TableMigrator {
    private name;
    private columns;
    constructor(name: string);
    addColumn(name: string): ColumnBuilder;
    getColumns(): any[];
    exec(): Promise<void>;
}
