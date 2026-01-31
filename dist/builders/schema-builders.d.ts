export declare class SchemaCreator {
    private mapper;
    private name;
    private type;
    private migrator;
    constructor(mapper: any, name: string, type: string);
    private ensureRegistration;
    addColumn(name: string): import("../migrator.js").ColumnBuilder;
    structure(config: any): this;
    useConnection(connectionName: string): this;
    exec(): Promise<void>;
}
export declare class SchemaUpdater {
    private mapper;
    private name;
    private migrator;
    constructor(mapper: any, name: string);
    addColumn(name: string): import("../migrator.js").ColumnBuilder;
    selectColumn(name: string): import("../migrator.js").ColumnBuilder;
    dropColumn(name: string): this;
    useConnection(connectionName: string): this;
    exec(): Promise<void>;
}
export declare class SchemaDropper {
    private name;
    constructor(name: string);
    private connectionName;
    useConnection(name: string): this;
    exec(): Promise<void>;
}
export declare class SchemaHandler {
    protected mapper: any;
    protected name: string;
    protected schemaType: string;
    constructor(mapper: any, name: string, schemaType: string);
    create(): SchemaCreator;
    update(): SchemaUpdater;
    drop(): SchemaDropper;
}
export declare class SchemaDispatcher {
    private mapper;
    private name;
    constructor(mapper: any, name: string);
    type(type: 'table' | 'api' | 'collection'): SchemaHandler;
    create(): SchemaCreator;
    update(): SchemaUpdater;
    drop(): SchemaDropper;
}
