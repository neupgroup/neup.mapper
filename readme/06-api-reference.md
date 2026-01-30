# API Reference

### **Core Functions**
- `connection()` → create connections registry (see `src/index.ts:299`–`301`)
- `schema(conns?)` → create `SchemaManager` (see `src/index.ts:303`–`306`)
- `schemas` → singleton `SchemaManager` (see `src/index.ts:308`–`311`)
- `createOrm(adapter)` → wrapper around a `DbAdapter` (see `src/orm/index.ts:3`–`27`)
- `parseConnectionsDsl(text)`, `toNormalizedConnections(map)` (see `src/env.ts:31`–`75`, `87`–`95`)
- `documentationMd`, `markdownToHtml`, `getDocumentationHtml` (see `src/docs.ts:5`–`275`, `277`–`356`)

### **Configuration-Based API**
- `createConfigMapper(config)` → Create mapper from configuration object
- `createDefaultMapper()` → Create mapper with default configuration
- `ConfigBasedMapper` → Class for configuration-based mapping
  - `configure(config)` → Configure the mapper
  - `makeConnection(name, type, config)` → Add connection
  - `connection(name)` → Use specific connection
  - `getConnection(name)` → Get connection details

### **Fluent API (StaticMapper)**
- `StaticMapper.makeConnection(name, type, config)` → Create persistent connection
- `StaticMapper.connection(name)` → Use existing connection
- `StaticMapper.connection(config)` → Create temporary connection
- `StaticMapper.getConnection(name)` → Get connection by name
- `StaticMapper.listConnections()` → List all connections

### **Query Builder Methods**
- `table(name)` / `collection(name)` → Specify table/collection
- `select()` / `find()` / `get()` → Start select query / execute
- `where(field, value, operator?)` → Add where condition
- `orderBy(field, direction?)` → Add ordering
- `limit(count)` → Limit results
- `offset(count)` → Offset results
- `get()` / `getOne()` → Execute query
- `insert(data)` → Insert data (alias: `add`)
- `update(data)` → Update data
- `delete()` → Delete data

### **Types**
- `DbAdapter`, `QueryOptions`, `EnvDslConnections`, `NormalizedConnection`
- `ConnectionConfig`, `MapperConfig`, `FluentConnectionBuilder`
- `ConnectionType`: `'sql' | 'mysql' | 'postgres' | 'mongodb' | 'firestore' | 'api'`
