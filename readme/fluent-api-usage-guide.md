# 🌊 Fluent API Usage Guide

The Fluent API in `@neupgroup/mapper` allows for rapid interaction with databases and APIs.

## Table of Contents
- [Initialization](#initialization)
- [Database Operations](#database-operations)
- [Raw Queries](#raw-queries)

---

## Initialization

You can start using the mapper immediately by importing the static class.

```ts
import { Mapper } from '@neupgroup/mapper';
```

## Database Operations

Use `Mapper.base()` (or alias `Mapper.query()`) to start a query chain.

```ts
// 1. Select
const users = await Mapper.base('users')
    .select(['id', 'name'])
    .where('active', true)
    .limit(10)
    .get();

// 2. Insert
await Mapper.base('users')
    .insert({ name: 'Alice', email: 'alice@test.com' })
    .run();

// 3. Update
await Mapper.base('users')
    .update({ status: 'inactive' })
    .where('id', 123)
    .run();

// 4. Delete
await Mapper.base('users')
    .delete()
    .where('id', 123)
    .run();
```

## Raw Queries

For complex queries not supported by the fluent builder, use `Mapper.raw()`.

```ts
const result = await Mapper.raw('SELECT * FROM users WHERE created_at > NOW()').get();
```
