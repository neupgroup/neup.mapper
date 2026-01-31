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
    private connectionName;
    constructor(name: string);
    useConnection(name: string): this;
    addColumn(name: string): ColumnBuilder;
    getColumns(): any[];
    private getAdapter;
    private generateCreateSql;
    exec(): Promise<void>;
    drop(): Promise<void>;
    dropColumn(columnName: string): Promise<void>;
    dropUnique(columnName: string): Promise<void>;
    dropPrimaryKey(columnName: string): Promise<void>;
}
