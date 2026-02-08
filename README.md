# Documentation

Welcome to the documentation for `@neupgroup/mapper`.

## Introduction

**@neupgroup/mapper**

A lightweight, fluent ORM and query builder designed for simplicity and ease of use. It revolves around a single entry point with four core commands, making it intuitive to manage connections, perform CRUD operations, handle migrations, and execute raw SQL.

### Core Concepts

The library is built around the `Mapper` class, which exposes four static methods:

1.  **`init()`**: Initialize and manage database connections.
2.  **`base()`**: Perform standard CRUD (Create, Read, Update, Delete) operations.
3.  **`migrator()`**: Handle database schema changes (DDL).
4.  **`raw()`**: Execute raw SQL queries directly.

## Installation

```bash
npm install @neupgroup/mapper
```

---

## 🚀 Quick Start

The simplest way to get started is using the new simplified API with configuration files.

### 1. Automatic Initialization

Ensure you have a `mapper.config.ts` file in your project root. `Mapper` will automatically load connections and schemas from this file.

```typescript
import { Mapper } from '@neupgroup/mapper';

// Just start querying!
// The default connection defined in mapper.config.ts will be used.
const users = await Mapper.base('users')
    .select(['id', 'name'])
    .where('id', 1)
    .get();
```

### 2. Manual Initialization (Optional)

If you prefer to control connections manually or don't use the configuration file:

```typescript
import { Mapper } from '@neupgroup/mapper';

// 1. Initialize & Connect
Mapper.init().connect('default', 'sqlite', { filename: './mapper.db' });

// 2. Query
const users = await Mapper.base('users').select().get();
```

---

## 🔌 Connections & Configuration

You can manage database connections via the CLI, which updates your `mapper.config.ts` file.

### Creating Connections (CLI)

Use the CLI to create and register new connections.

```bash
# Create a new SQLite connection
npm run create-connection myapp sqlite
```

This will create/update `mapper.config.ts` in your project root.
*   **SQLite**: Databases are saved as defined in the config.
*   **MySQL/Postgres**: Connection details are added to the config (you should edit the password/host as needed).

### Setting Default Connection

To set a connection as the default (used when no connection is specified):

```bash
# Set 'myapp' as the default connection
npm run create-connection myapp sqlite --default
```

### Programmatic Connection

You can also connect at runtime:

```typescript
import { Mapper } from '@neupgroup/mapper';

Mapper.init().connect('analytics', 'mysql', {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: 'analytics_db'
});
```

---

## 📦 Database Migrations

Migrations allow you to manage your database schema using version-controlled TypeScript functions within `migrations.config.ts`.

### 1. Creating a Migration

Generate a new migration entry in `migrations.config.ts`:

```bash
npm run create-migration create_users_table
```

To target a specific connection for the migration:

```bash
npm run create-migration add_logs --conn analytics
```

**Multiple Migrations per Table**: You can create multiple migrations with the same name (e.g., `users`). They will have unique timestamps and be executed in chronological order.

### 2. Writing Migrations

Edit the generated entry in `migrations.config.ts`. Migrations are defined as executable functions.

#### Creating a Table
```typescript
up: async (Mapper: any) => {
    await Mapper.migrator('users').create()
        .addColumn('id').type('int').autoIncrement().isPrimary()
        .addColumn('username').type('string').unique().notNull()
        .addColumn('email').type('string').length(150)
        .addColumn('is_active').type('boolean').default(true)
        .addColumn('created_at').type('date').default('NOW()')
        .exec();
},
```

#### Updating a Table
```typescript
up: async (Mapper: any) => {
    await Mapper.migrator('users').update()
        .addColumn('age').type('int')
        .dropColumn('old_field')
        .exec();
},
```

#### Dropping a Table
```typescript
down: async (Mapper: any) => {
    await Mapper.migrator('users').drop().exec();
},
```

#### Using Specific Connections
If you need to run a migration on a non-default connection:

```typescript
up: async (Mapper: any) => {
    const migrator = Mapper.migrator('analytics_data');
    migrator.useConnection('analytics'); // Explicitly use 'analytics' connection
    
    await migrator.create()
        .addColumn('id').type('int').isPrimary()
        .exec();
},
```

### 3. Running Migrations

Execute the migrations to apply changes to the database:

```bash
# Run all pending migrations
npm run migrate up

# Revert the last migration
npm run migrate down

# Revert all and re-run all (Fresh start)
npm run migrate refresh
```

---

## 📑 Schema Management

Define your table schemas in `mapper.config.ts` to enable strict validation with `Mapper.schemas`.

```typescript
export const config: MapperConfig = {
    connections: [ ... ],
    schemas: [
        {
            table: "users",
            connection: "default", // Optional
            columns: {
                id: { type: "integer", primaryKey: true, autoIncrement: true },
                username: { type: "string", length: 255, nullable: false },
                created_at: { type: "timestamp", default: "CURRENT_TIMESTAMP" }
            }
        }
    ]
};
```

---

## 🛠️ Data Operations (CRUD)

There are two ways to interact with your data: **Validated** (using Schemas) and **Standard** (using Base).

### 1. Validated Operations (`Mapper.schemas`)

Use this when you want strict validation against your defined schema in `mapper.config.ts`. Fields not defined in the schema will be stripped.

```typescript
// Insert (Validated)
await Mapper.schemas('users').insert({
    username: 'john_doe',
    email: 'john@example.com',
    unknown_field: 'this will be ignored' 
});

// Get Data
const users = await Mapper.schemas('users').get();

// Update Data
await Mapper.schemas('users')
    .set({ is_active: false })
    .where('username', 'john_doe')
    .update();

// Delete Data
await Mapper.schemas('users')
    .where('id', 5)
    .delete();
```

### 2. Standard Operations (`Mapper.base`)

Use this for direct access. It bypasses schema validation but still handles connection logic. Useful for dynamic queries or tables not in your schema configuration.

```typescript
// Insert
await Mapper.base('users').insert({
    username: 'jane_doe',
    meta_data: 'some dynamic data' // This will be sent to DB even if not in schema
}).exec();

// Select
const activeUsers = await Mapper.base('users')
    .select(['id', 'username'])
    .where('is_active', true)
    .get();

// Update
await Mapper.base('users')
    .update({ last_login: new Date() })
    .where('id', 1)
    .exec();

// Delete
await Mapper.base('users')
    .delete()
    .where('is_active', false)
    .exec();
```

---

## ⚡ Advanced Usage

### Raw SQL

For complex queries (Joins, Unions, etc.), use `Mapper.raw()`.

```typescript
const result = await Mapper.raw(`
    SELECT u.name, count(o.id) as order_count 
    FROM users u 
    JOIN orders o ON u.id = o.user_id 
    WHERE o.status = ?
`).bind(['completed']).execute();
```

### API Reference

#### `Mapper.init()`
*   `connect(name, type, config)`: Register a connection.
*   `getDefaultConnection()`: Get the active default connection.

#### `Mapper.base(table)`
*   `select(fields)`: Start a SELECT query.
*   `insert(data)`: Start an INSERT query.
*   `update(data)`: Start an UPDATE query.
*   `delete()`: Start a DELETE query.

#### `Mapper.migrator(table)`
*   `create()`: Create table builder.
*   `update()`: Update table builder.
*   `drop()`: Drop table builder.
*   `truncate()`: Truncate table builder.

---

## 🏆 Best Practices

1.  **Use Migrations**: Always change your DB schema via migrations, never manually.
2.  **Define Schemas**: Keep your `mapper.config.ts` schemas in sync with your database structure.
3.  **Type Safety**: While Mapper returns `any`, define TypeScript interfaces for your models for better developer experience.

```typescript
interface User {
    id: number;
    username: string;
}
const users = await Mapper.base('users').select() as User[];
```

---

## 🔐 Transactions

Transactions allow you to execute multiple operations as a single atomic unit. This is supported for PostgreSQL, MySQL, SQLite, and MongoDB.

### Basic Usage

```typescript
// 1. Start a transaction
const tx = await Mapper.beginTransaction();

try {
    // 2. Use the transaction in operations
    // Note: You must chain .useTransaction(tx) to include the operation in the transaction
    
    // Insert a record
    const userId = await Mapper.base('users')
        .insert({ name: 'Alice', balance: 100 })
        .useTransaction(tx)
        .exec();

    // Update another record
    await Mapper.base('accounts')
        .update({ status: 'active' })
        .where('user_id', userId)
        .useTransaction(tx) // Important!
        .exec();

    // 3. Commit the changes
    await Mapper.commitTransaction(tx);
    
} catch (error) {
    // 4. Rollback on error
    await Mapper.rollbackTransaction(tx);
    console.error('Transaction failed:', error);
}
```

### Using Specific Connections

If you have multiple connections, you can start a transaction on a specific one:

```typescript
const tx = await Mapper.beginTransaction('analytics'); // 'analytics' is the connection name
```

The transaction handle automatically knows which connection it belongs to, so you don't need to specify it again when committing or rolling back.

**Note:** For MongoDB, transactions require a Replica Set.
