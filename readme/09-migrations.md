# Database Migrations

Migrations in `@neupgroup/mapper` allow you to manage your database schema using version-controlled TypeScript files.

## CLI Tools

The library provides several CLI tools to help you manage migrations:

*   `npx create-migration <name>`: Creates a new migration file.
*   `npx migrate up`: Runs pending migrations.
*   `npx migrate down`: Reverts the last executed migration.
*   `npx create-schemas`: Generates/updates the `src/mapper/schemas.ts` file based on your migration files.

## Creating a Migration

To create a new migration, run:

```bash
npx create-migration add_users
```

This will append a new migration object to `src/mapper/migrations.ts`. All migrations are stored in this single file as an array:

```typescript
import { Mapper } from '@neupgroup/mapper';

export const migrations = [
  {
    name: '202602040001_add_users',
    async up() {
      const migrator = Mapper.migrator('users').create();
      
      migrator.addColumn('id').type('int').autoIncrement().isPrimary();
      migrator.addColumn('name').type('string');
      migrator.addColumn('email').type('string').unique();
      migrator.addColumn('created_at').type('date').default('NOW()');
      
      await migrator.exec();
    },
    async down() {
      const migrator = Mapper.migrator('users').drop();
      await migrator.exec();
    }
  },
  // ... other migrations
];
```

## Migration API

The `Mapper.migrator(tableName)` returns a builder that supports the following commands:

### Create Table

Use `.create()` to start building a new table.

```typescript
await Mapper.migrator('products').create()
    .addColumn('id').type('int').autoIncrement().isPrimary()
    .addColumn('name').type('string')
    .addColumn('price').type('number')
    .exec();
```

### Update Table

Use `.update()` to modify an existing table (e.g., adding or dropping columns).

```typescript
await Mapper.migrator('products').update()
    .addColumn('description').type('string')
    .dropColumn('old_field')
    .exec();
```

### Drop Table

Use `.drop()` to remove a table.

```typescript
await Mapper.migrator('products').drop().exec();
```

### Truncate Table

Use `.truncate()` to clear all data from a table.

```typescript
await Mapper.migrator('products').truncate().exec();
```

### Column Definitions

When adding columns, you can chain various constraints:

*   `.type(type)`: 'string', 'int', 'number', 'boolean', 'date', 'text'
*   `.isPrimary()`: Marks column as Primary Key
*   `.autoIncrement()`: Enables Auto Increment
*   `.isUnique()`: Adds UNIQUE constraint
*   `.notNull()`: Adds NOT NULL constraint
*   `.default(value)`: Sets a default value
*   `.length(number)`: Sets length for VARCHAR types

## Schema Generation

After writing your migrations, you should generate the static schema definitions used by the ORM/Mapper.

Run the following command:

```bash
npm run create-schemas
```
(or `npx create-schemas`)

This command scans all migration files and generates `src/mapper/schemas.ts`. This file contains the schema definitions that `Mapper` uses at runtime for query building and validation.

**Note:** Unlike previous versions, `create-migration` does not automatically update the schema file. You must run `create-schemas` to sync your schema definitions with your migrations.

