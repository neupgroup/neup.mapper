export declare class MapperError extends Error {
    readonly code: string;
    readonly hint?: string | undefined;
    constructor(message: string, code: string, hint?: string | undefined);
}
export declare class AdapterMissingError extends MapperError {
    constructor(connectionName: string);
}
export declare class UpdatePayloadMissingError extends MapperError {
    constructor();
}
export declare class DocumentMissingIdError extends MapperError {
    constructor(operation: string);
}
export declare class ConnectionExistingError extends MapperError {
    constructor(name: string);
}
export declare class ConnectionUnknownError extends MapperError {
    constructor(method: string, name: string);
}
export declare class SchemaExistingError extends MapperError {
    constructor(name: string);
}
export declare class SchemaMissingError extends MapperError {
    constructor(name: string);
}
export declare class SchemaConfigurationError extends MapperError {
    constructor(message: string);
}
