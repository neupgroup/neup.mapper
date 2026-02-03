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

### `static base(tableName: string): CrudBase`
Returns a `CrudBase` instance for performing DML (Data Manipulation Language) operations on a specific table.

**Methods:**
- `select(columns: string[] = ['*']): Promise<any[]>`
  - Retrieves records from the table.
- `insert(data: Record<string, any>): Promise<any>`
  - Inserts a new record.
- `update(data: Record<string, any>, where: Record<string, any>): Promise<any>`
  - Updates records matching the `where` clause.
- `delete(where: Record<string, any>): Promise<any>`
  - Deletes records matching the `where` clause.

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
