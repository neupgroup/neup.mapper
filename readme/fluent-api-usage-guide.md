# 🌊 Fluent API Usage Guide

The Fluent API in `@neupgroup/mapper` has been simplified to 4 core commands.

## Table of Contents
- [Initialization](#initialization)
- [Database Operations (DML)](#database-operations-dml)
- [Migrations (DDL)](#migrations-ddl)
- [Raw Queries](#raw-queries)

---

## Initialization

You start by initializing the mapper and setting up connections.

```ts
import { Mapper } from '@neupgroup/mapper';

// Connect to your database
Mapper.init().connect('default', 'sqlite', { filename: './database.sqlite' });
```

## Database Operations (DML)

Use `Mapper.base()` to perform CRUD operations (Create, Read, Update, Delete).

```ts
// 1. Select
const users = await Mapper.base('users')
    .select(['id', 'name'])
    .where('active', 1)
    .limit(10)
    .get();

// 2. Insert
await Mapper.base('users')
    .insert({ name: 'Alice', email: 'alice@test.com' });

// 3. Update
await Mapper.base('users')
    .update({ status: 'inactive' })
    .where('id', 123);

// 4. Delete
await Mapper.base('users')
    .delete()
    .where('id', 123);
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
