# Best Practices

## 1. Singleton Initialization

Initialize your database connection once at the start of your application. The `Mapper` class maintains this connection state globally.

```typescript
// src/db.ts
import { Mapper } from '@neupgroup/mapper';

export const initDB = async () => {
    Mapper.init().connect('default', 'sqlite', { filename: 'db.sqlite' });
};

// src/index.ts
import { initDB } from './db';
await initDB();
```

## 2. Separate Migrations

Don't mix migration logic with your application logic. Create a separate script or function to handle schema updates.

```typescript
// src/migrate.ts
import { Mapper } from '@neupgroup/mapper';

export const runMigrations = async () => {
    console.log('Running migrations...');
    await Mapper.migrator().create('users', { id: 'INTEGER PRIMARY KEY', name: 'TEXT' });
    await Mapper.migrator().update('users', { email: 'TEXT' });
    console.log('Migrations complete.');
};
```

## 3. Use Fluent API for Standard CRUD

For 90% of your database interactions, use `Mapper.base()`. It's cleaner, safer, and easier to read than raw SQL.

```typescript
// Good
await Mapper.base('users').insert({ name: 'John' });

// Avoid unless necessary
await Mapper.raw("INSERT INTO users (name) VALUES ('John')").execute();
```

## 4. Handle Updates Gracefully

When modifying schemas, use `Mapper.migrator().update()`. It is designed to be safe to run multiple times (idempotent), so you don't need to write complex checks for "if column exists".

## 5. Type Safety

While the library is loosely typed (returning `any`), you should define interfaces for your data models in your application code to ensure type safety.

```typescript
interface User {
    id: number;
    name: string;
    email?: string;
}

const users = await Mapper.base('users').select() as User[];
```
