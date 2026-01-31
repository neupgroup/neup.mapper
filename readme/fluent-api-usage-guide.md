# 🌊 Fluent API Usage Guide

The Fluent API in \`@neupgroup/mapper\` allows for rapid interaction with REST APIs and database connections without the need for pre-defined schemas. This is particularly useful for external API calls, one-off queries, or prototyping.

## Table of Contents
- [Initialization](#initialization)
- [Path Building](#path-building)
- [Headers Management](#headers-management)
- [HTTP Methods](#http-methods)
- [Database Operations](#database-operations)

---

## Initialization

You can get a connection selector by passing a connection name or a configuration object.

\`\`\`ts
import Mapper from '@neupgroup/mapper';

// 1. By connection name (already registered)
const db = Mapper.connection('mysql_prod');

// 2. By configuration object (auto-creates a temporary connection)
const api = Mapper.connection({ 
  type: 'api', 
  url: 'https://api.example.com' 
});
\`\`\`

## Path Building

The \`.path()\` method allows you to build the request URL. You can chain multiple \`.path()\` calls, and they will be automatically joined with slashes.

\`\`\`ts
// Results in: https://api.example.com/v1/users/123
await api.path('/v1').path('users').path('123').get();

// You can also include multiple segments in one call
await api.path('/v1/users/active').get();
\`\`\`

## Headers Management

The Fluent API provides flexible ways to manage headers.

### Single Header
\`\`\`ts
await api.path('/data')
  .header('Authorization', 'Bearer token123')
  .get();
\`\`\`

### Object or Multiple Headers
\`\`\`ts
await api.path('/data')
  .headers({
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest'
  })
  .get();
\`\`\`

### "Header: Value" String
\`\`\`ts
await api.path('/data')
  .header('Authorization: Bearer token123')
  .get();
\`\`\`

### Multiple Values for Same Header
Calling \`.header()\` with the same key multiple times will append the values.
\`\`\`ts
// Results in X-Tags: tag1, tag2
await api.path('/data')
  .header('X-Tags', 'tag1')
  .header('X-Tags', 'tag2')
  .get();
\`\`\`

## HTTP Methods

The following standard HTTP methods are available:

- \`.get()\`
- \`.post(data?)\`
- \`.put(data?)\`
- \`.patch(data?)\`
- \`.delete()\`

\`\`\`ts
// POST with body
const user = await api.path('/users').post({ name: 'Alice' });

// DELETE request
await api.path('/users/123').delete();
\`\`\`

## Database Operations

For database connections (mysql, postgres, mongodb), the connection selector also provides methods for schema access.

\`\`\`ts
const db = Mapper.connection('mysql_db');

// Access a schema and perform standard query
const activeUsers = await db.query('users')
  .where('status', 'active')
  .get();

// You can still use table() or collection() as aliases
const sessions = await db.table('sessions').get();
\`\`\`

---

## Best Practices

1. **Reuse Connection Selectors**: If you're making multiple requests to the same service, store the connection selector in a variable.
2. **Error Handling**: Always wrap API calls in \`try/catch\` as they may throw network or HTTP errors.
3. **Type Safety**: While the Fluent API is flexible, consider defining schemas for complex data models to gain better type safety and validation.
