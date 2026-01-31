export type ColumnType = 'string' | 'number' | 'boolean' | 'date' | 'int';
export declare class ColumnBuilder {
    private name;
    private migrator?;
    private def;
    constructor(name: string, migrator?: TableMigrator | undefined);
    type(t: ColumnType | string): this;
    isPrimary(): this;
    isUnique(): this;
    notNull(): this;
    autoIncrement(): this;
    default(val: any): this;
    values(vals: any[]): this;
    foreignKey(table: string, column: string): this;
    /**
     * Queues a unique constraint removal for this column
     */
    dropUnique(): this;
    /**
     * Queues a primary key removal for this column
     */
    dropPrimaryKey(): this;
    /**
     * Queues a column drop
     */
    drop(): this;
    getDefinition(): any;
}
export declare class TableMigrator {
    private name;
    private columns;
    private connectionName;
    private actions;
    constructor(name: string);
    useConnection(name: string): this;
    /**
     * Register a new column for creation
     */
    addColumn(name: string): ColumnBuilder;
    /**
     * Select an existing column for modification or dropping
     */
    selectColumn(name: string): ColumnBuilder;
    dropTable(): this;
    drop(): this;
    dropColumn(columnName: string): this;
    dropUnique(columnName: string): this;
    dropPrimaryKey(columnName: string): this;
    private getAdapter;
    private generateColumnSql;
    exec(): Promise<void>;
}
