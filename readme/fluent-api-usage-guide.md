# 🌊 Fluent API Usage Guide

The Fluent API in `@neupgroup/mapper` has been simplified to 4 core commands.

## Table of Contents
- [Initialization](#initialization)
- [Schema Operations (Validated)](#schema-operations-validated)
- [Database Operations (DML)](#database-operations-dml)
- [Migrations (DDL)](#migrations-ddl)
- [Raw Queries](#raw-queries)

---

## Initialization

You can initialize the mapper manually or rely on a `mapper.config.json` file for auto-initialization.

**Option 1: Manual Initialization**
```ts
import { Mapper } from '@neupgroup/mapper';

// Connect to your database
Mapper.init().connect('default', 'sqlite', { filename: './database.sqlite' });
```

**Option 2: Auto-Initialization**
If you have a `mapper.config.json` in your project root, `Mapper` will automatically load it when you call any command.

```json
{
  "connections": [
    { "name": "default", "type": "sqlite", "filename": "database.db" }
  ],
  "schemas": [
    {
      "name": "users",
      "connection": "default",
      "collection": "users",
      "structure": [
        { "name": "id", "type": "int", "isPrimary": true, "autoIncrement": true },
        { "name": "username", "type": "string" }
      ]
    }
  ]
}
```

## Schema Operations (Validated)

Use `Mapper.schemas()` to interact with defined schemas. This provides **client-side validation**, stripping unknown fields before they reach the database.

```ts
// 1. Insert (Validated)
// 'created_by' will be stripped if not in the schema, preventing DB errors
await Mapper.schemas('users').insert({ 
    username: 'Alice', 
    created_by: 'unknown' 
});

// 2. Select
const users = await Mapper.schemas('users')
    .where({ active: 1 }) // Object-style where
    .limit(10)
    .get();

// 3. Update (Fluent Syntax)
await Mapper.schemas('users')
    .where({ id: 123 })
    .set({ status: 'inactive' })
    .update();

// 4. Delete
await Mapper.schemas('users')
    .where({ id: 123 })
    .delete();
```

## Database Operations (DML)

Use `Mapper.base()` for raw CRUD operations. **Note:** This bypasses schema validation and sends queries directly to the database.

```ts
// 1. Select
const users = await Mapper.base('users')
    .select(['id', 'name'])
    .where('active', 1)
    .limit(10)
    .get();

// 2. Insert
await Mapper.base('users')
    .insert({ name: 'Alice', email: 'alice@test.com' })
    .exec();

// 3. Update
await Mapper.base('users')
    .update({ status: 'inactive' })
    .where('id', 123)
    .exec();

// 4. Delete
await Mapper.base('users')
    .delete()
    .where('id', 123)
    .exec();
```

## Migrations (DDL)

Use `Mapper.migrator()` for schema definition and modification.

```ts
// Create a table
await Mapper.migrator().create('users', {
    id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
    name: 'TEXT NOT NULL',
    email: 'TEXT UNIQUE'
});

// Update a table (Add new columns)
await Mapper.migrator().update('users', {
    age: 'INTEGER',
    city: 'TEXT'
});

// Drop a table
await Mapper.migrator().drop('users');

// Truncate a table
await Mapper.migrator().truncate('users');
```

## Raw Queries

For direct SQL execution, use `Mapper.raw()`.

```ts
// Execute raw SQL
const result = await Mapper.raw('SELECT * FROM users WHERE created_at > ?')
    .bind(['2024-01-01'])
    .execute();
```
