export interface DdlExecutor {
    exec(): Promise<void>;
}
export declare class CreateTableBuilder implements DdlExecutor {
    private tableName;
    private columns;
    private connectionName;
    constructor(tableName: string);
    useConnection(name: string): this;
    addColumn(name: string): ColumnBuilder;
    exec(): Promise<void>;
}
export declare class UpdateTableBuilder implements DdlExecutor {
    private tableName;
    private migrator;
    private connectionName;
    constructor(tableName: string);
    useConnection(name: string): this;
    addColumn(name: string): ColumnBuilder;
    dropColumn(name: string): this;
    modifyColumn(name: string): ColumnBuilder;
    exec(): Promise<void>;
}
export declare class DropTableBuilder implements DdlExecutor {
    private tableName;
    private connectionName;
    constructor(tableName: string);
    useConnection(name: string): this;
    exec(): Promise<void>;
}
export declare class TruncateTableBuilder implements DdlExecutor {
    private tableName;
    private connectionName;
    constructor(tableName: string);
    useConnection(name: string): this;
    exec(): Promise<void>;
}
export type ColumnType = 'string' | 'number' | 'boolean' | 'date' | 'int';
export declare class ColumnBuilder {
    private name;
    private migrator?;
    private def;
    constructor(name: string, migrator?: Migrator | undefined);
    type(t: ColumnType | string): this;
    length(len: number): this;
    isPrimary(): this;
    isUnique(): this;
    unique(): this;
    notNull(): this;
    isNullable(): this;
    autoIncrement(): this;
    default(val: any): this;
    values(vals: any[]): this;
    foreignKey(table: string, column: string): this;
    dropUnique(): this;
    dropPrimaryKey(): this;
    drop(): this;
    getDefinition(): any;
}
export declare class Migrator {
    private tableName?;
    private columns;
    private actions;
    private isCreateMode;
    private connectionName;
    constructor(tableName?: string | undefined);
    _setCreateMode(): void;
    useConnection(name: string): this;
    create(): CreateTableBuilder;
    create(tableName: string, schema: Record<string, string>): Promise<any>;
    update(): UpdateTableBuilder;
    update(tableName: string, schema: Record<string, string>): Promise<any>;
    drop(): DropTableBuilder;
    drop(tableName: string): Promise<any>;
    truncate(): TruncateTableBuilder;
    truncate(tableName: string): Promise<any>;
    _addColumn(name: string): ColumnBuilder;
    _dropColumn(columnName: string): this;
    _modifyColumn(name: string): ColumnBuilder;
    _dropTable(name?: string): this;
    dropUnique(columnName: string): this;
    dropPrimaryKey(columnName: string): this;
    private legacyCreate;
    private legacyUpdate;
    private legacyDrop;
    private legacyTruncate;
    private generateColumnSql;
    exec(): Promise<void>;
    execute(): Promise<void>;
}
