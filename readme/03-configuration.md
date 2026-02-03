# Configuration

Configuration in `@neupgroup/mapper` is handled programmatically via the `Mapper.init()` command. This singleton instance manages your connections.

## Connecting to a Database

The `connect` method takes a connection name, a type (e.g., `'sqlite'`, `'mysql'`, `'postgres'`), and a configuration object specific to that adapter.

```typescript
import { Mapper } from '@neupgroup/mapper';

// SQLite
Mapper.init().connect('default', 'sqlite', {
    filename: './database.sqlite'
});

// You can register multiple connections
Mapper.init().connect('analytics', 'mysql', {
    host: 'localhost',
    user: 'root',
    password: 'password',
    database: 'analytics_db'
});
```

## Using Specific Connections

By default, `Mapper` uses the connection named `'default'`. To use a different connection, currently, the architecture focuses on a primary default connection. If multi-connection switching is required for specific queries, you would manage that by re-initializing or extending the `InitMapper` capabilities (future feature).

For now, `Mapper.init().connect(...)` sets the active connection that subsequent `base()`, `migrator()`, and `raw()` calls will use.

## Environment Variables

You can easily use environment variables in your initialization code:

```typescript
Mapper.init().connect('default', 'postgres', {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
});
```
