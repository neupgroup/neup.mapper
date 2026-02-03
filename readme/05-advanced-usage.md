# Advanced Usage

## Raw SQL Execution

For complex queries that go beyond standard CRUD operations, you can use the `Mapper.raw()` command. This gives you full control over the SQL being executed.

```typescript
import { Mapper } from '@neupgroup/mapper';

// Execute a complex join
const results = await Mapper.raw(`
    SELECT u.name, o.total 
    FROM users u 
    JOIN orders o ON u.id = o.user_id 
    WHERE o.total > 100
`).execute();

console.log(results);
```

## Parameter Binding (Security)

When using `raw()`, always use parameter binding to prevent SQL injection. The syntax depends on your underlying adapter (e.g., `?` for SQLite/MySQL, `$1` for Postgres).

```typescript
// SQLite example
const userId = 5;
await Mapper.raw(`SELECT * FROM users WHERE id = ${userId}`).execute(); // ⚠️ UNSAFE

// Better (Implementation depends on adapter support for binding)
// Currently, the raw executor passes the string directly. 
// Ensure you sanitize inputs if constructing strings manually.
```

*Note: Future versions will support strict parameter binding in `raw()`.*

## Direct Access to InitMapper

If you need to check the status of connections or access the internal connection registry, you can use `Mapper.init()`.

```typescript
const init = Mapper.init();
// Access internal properties if needed (mostly for internal use)
```

## Customizing the Migrator

The `Migrator` class is designed to be simple. If you need complex DDL that isn't supported (like adding constraints or indexes), use `Mapper.raw()`.

```typescript
await Mapper.raw('CREATE INDEX idx_user_email ON users(email)').execute();
```
