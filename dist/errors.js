export class MapperError extends Error {
    constructor(message, code, hint) {
        super(message);
        this.code = code;
        this.hint = hint;
        this.name = this.constructor.name;
        // Restore prototype chain for instanceof checks (TS workaround)
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
export class AdapterMissingError extends MapperError {
    constructor(connectionName) {
        super(`No adapter attached for connection '${connectionName}'.`, 'ADAPTER_MISSING', `Ensure you have registered an adapter for '${connectionName}'. You can use 'Mapper.connection().attachAdapter(...)'`);
    }
}
export class UpdatePayloadMissingError extends MapperError {
    constructor() {
        super(`No update payload set for the query.`, 'UPDATE_PAYLOAD_MISSING', `You must call '.to({ ... })' with the data you want to update before executing '.update()' or '.updateOne()'.`);
    }
}
export class DocumentMissingIdError extends MapperError {
    constructor(operation) {
        super(`Document is missing its 'id' field, which is required for '${operation}'.`, 'DOCUMENT_MISSING_ID', `Ensure that the documents you are trying to ${operation} have an 'id' property. If you fetched them, make sure 'id' was included in the fields.`);
    }
}
export class ConnectionExistingError extends MapperError {
    constructor(name) {
        super(`Connection with name '${name}' already exists.`, 'CONNECTION_EXISTS', `Use a unique name for each connection or check if you are registering the same connection twice.`);
    }
}
export class ConnectionUnknownError extends MapperError {
    constructor(method, name) {
        super(`Cannot ${method}: unknown connection '${name}'.`, 'CONNECTION_UNKNOWN', `Check if the connection '${name}' has been created using 'Mapper.connection().create(...)' or registered.`);
    }
}
export class SchemaExistingError extends MapperError {
    constructor(name) {
        super(`Schema with name '${name}' already exists.`, 'SCHEMA_EXISTS', `Use a unique name for each schema.`);
    }
}
export class SchemaMissingError extends MapperError {
    constructor(name) {
        super(`Unknown schema '${name}'.`, 'SCHEMA_UNKNOWN', `The schema '${name}' is not registered. Ensure you have run migrations, called 'Mapper.discover()', or defined it manually using 'Mapper.schema().create("${name}")'.`);
    }
}
export class SchemaConfigurationError extends MapperError {
    constructor(message) {
        super(message, 'SCHEMA_CONFIG_ERROR', 'Ensure "connection" and "collection" are properly set using ".use({ connection, collection })" before defining structure.');
    }
}
