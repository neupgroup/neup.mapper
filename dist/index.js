// Re-export core classes
export { Connections, ConnectionBuilder, connection } from './connections.js';
export { SchemaManager, SchemaBuilder, SchemaQuery, parseDescriptorStructure, schema } from './schema-manager.js';
// Legacy singletons (careful with initialization order)
import { Connections } from './connections.js';
import { SchemaManager } from './schema-manager.js';
export const schemas = (() => {
    const conns = new Connections();
    return new SchemaManager(conns);
})();
export { createOrm } from './orm/index.js';
export { parseConnectionsDsl, toNormalizedConnections } from './env.js';
export { documentationMd, markdownToHtml, getDocumentationHtml } from './docs.js';
// Export the simplified Mapper and default instance
export { Mapper } from './mapper.js';
export { default } from './mapper.js';
// Export new core classes
export { InitMapper } from './core/init-mapper.js';
export { Executor } from './core/executor.js';
export { CrudBase } from './dml/crud-base.js';
export { Migrator } from './ddl/migrator.js';
export { StaticMapper, RawBuilder, BaseDispatcher } from './fluent-mapper.js';
// Export the new config-based system
export { ConfigBasedMapper, ConfigLoader, createConfigMapper, getConfigMapper, createDefaultMapper } from './config.js';
// Export database adapters
export { MySQLAdapter, createMySQLAdapter, PostgreSQLAdapter, createPostgreSQLAdapter, MongoDBAdapter, createMongoDBAdapter, SQLiteAdapter, createSQLiteAdapter, createAdapter, createAdapterFromUrl, autoAttachAdapter } from './adapters/index.js';
export { MapperError, AdapterMissingError, UpdatePayloadMissingError, DocumentMissingIdError, ConnectionExistingError, ConnectionUnknownError, SchemaExistingError, SchemaMissingError, SchemaConfigurationError, } from './errors.js';
export { Connector, mapper } from './connector.js';
export { TableMigrator, ColumnBuilder } from './migrator.js';
