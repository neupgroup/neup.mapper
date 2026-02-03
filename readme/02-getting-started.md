# Getting Started

## 🚀 Quick Start

The Mapper library is designed to be minimal and effective. You only need to import the `Mapper` class and use its four static methods.

### 1. Initialize Connection

First, establish a connection to your database. This is usually done at the entry point of your application.

```typescript
import { Mapper } from '@neupgroup/mapper';

// Initialize and connect
// Mapper.init().connect(connectionName, type, config)
Mapper.init().connect('default', 'sqlite', {
    filename: './mydb.sqlite'
});
```

### 2. Create a Table (Migration)

Use the `migrator()` command to define your schema.

```typescript
await Mapper.migrator().create('users', {
    id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
    name: 'TEXT NOT NULL',
    email: 'TEXT UNIQUE'
});
```

### 3. Insert Data

Use the `base()` command for data manipulation.

```typescript
await Mapper.base('users').insert({
    name: 'Alice',
    email: 'alice@example.com'
});
```

### 4. Fetch Data

Retrieve data using the same `base()` command.

```typescript
const users = await Mapper.base('users').select();
console.log(users);
```

### 5. Update Schema

Need to add a column? Use the `migrator()` update command.

```typescript
// Add an 'age' column if it doesn't exist
await Mapper.migrator().update('users', {
    age: 'INTEGER'
});
```

### 6. Raw SQL

For complex queries, drop down to raw SQL.

```typescript
await Mapper.raw("UPDATE users SET name = 'Alice Wonderland' WHERE id = 1").execute();
```

---

## 🛠️ Typical Project Structure

Since the Mapper is code-centric, you don't need a complex folder structure for configuration files. A simple structure works best:

```text
your-project/
├── src/
│   ├── db/
│   │   ├── init.ts       # Connection setup
│   │   └── migrations.ts # Schema definitions
│   ├── services/
│   │   └── user-service.ts
│   └── index.ts
└── package.json
```
