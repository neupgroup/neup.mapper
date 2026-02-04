# API Reference

The library exposes a single static class `Mapper` with four main methods.

## `Mapper` Class

### `static init(): InitMapper`
Returns the singleton `InitMapper` instance to manage connections.

**Methods:**
- `connect(name: string, type: string, config: any): void`
  - Establishes a new connection.
  - **name**: Unique name for the connection (use `'default'` for the primary one).
  - **type**: Database type (`'sqlite'`, `'mysql'`, `'postgres'`, etc.).
  - **config**: Adapter-specific configuration object.

---

### `static schemas(name: string): SchemaQuery`
Returns a `SchemaQuery` instance for validated operations against a registered schema. Auto-initializes if config is present.

**Methods:**
- `get(): Promise<any[]>`
  - Retrieves records.
- `insert(data: Record<string, any>): Promise<any>`
  - Inserts a record with schema validation (strips unknown fields).
- `set(data: Record<string, any>): this`
  - Sets data for update operations.
- `update(): Promise<void>`
  - Updates records matching the `where` clause with data from `set()`.
- `delete(): Promise<void>`
  - Deletes records matching the `where` clause.
- `where(condition: Record<string, any> | string, value?: any): this`
  - Adds filter conditions. Supports object style (`{ id: 1 }`) or key-value (`'id', 1`).

---

### `static base(tableName: string): CrudBase`
Returns a `CrudBase` instance for performing raw DML operations. Bypasses schema validation.

**Methods:**
- `select(columns: string[] = ['*']): SelectBuilder`
  - Returns a builder to retrieve records. Use `.get()` to execute.
- `insert(data: Record<string, any>): InsertBuilder`
  - Returns a builder to insert a record. Use `.exec()` to execute.
- `update(data: Record<string, any>): UpdateBuilder`
  - Returns a builder to update records. Chain `.where()` and use `.exec()`.
- `delete(): DeleteBuilder`
  - Returns a builder to delete records. Chain `.where()` and use `.exec()`.

---

### `static migrator(): Migrator`
Returns a `Migrator` instance for performing DDL (Data Definition Language) operations.

**Methods:**
- `create(tableName: string, schema: Record<string, string>): Promise<any>`
  - Creates a new table with the specified schema.
  - **schema**: Key-value pair of column name and SQL type definition (e.g., `{ id: 'INTEGER PRIMARY KEY' }`).
- `update(tableName: string, schema: Record<string, string>): Promise<any>`
  - Adds new columns to an existing table.
  - Gracefully handles "duplicate column" errors for idempotency.
- `drop(tableName: string): Promise<any>`
  - Drops the specified table.
- `truncate(tableName: string): Promise<any>`
  - Removes all data from the table (via `DELETE FROM` or `TRUNCATE`).

---

### `static raw(sql: string): Executor`
Returns an `Executor` instance for executing raw SQL queries.

**Methods:**
- `bind(bindings: any[] | any): Executor`
  - Binds parameters to the SQL query (e.g., replace `?` or `$1`).
- `execute(): Promise<any>`
  - Executes the SQL query and returns the result.

---

## Architecture Overview

- **InitMapper**: Singleton handling connection state.
- **CrudBase**: Builder for standard CRUD queries. Delegates execution to `Executor`.
- **Migrator**: Builder for Schema queries. Delegates execution to `Executor`.
- **Executor**: Wraps the adapter execution logic, handling parameter binding and execution.
