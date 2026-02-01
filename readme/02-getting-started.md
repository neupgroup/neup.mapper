# Getting Started

## 🚀 Quick Start Options

### **Option 1: Static Fluent API (Recommended)**
**The simplest way to get started - just import and use:**

```ts
import { Mapper } from '@neupgroup/mapper';

// 1. Define a schema (In-memory registration)
Mapper.schema('users')
  .create()
  .structure({
    id: ['int', 'auto-increment'],
    name: 'string',
    email: 'unique'
  });

// 2. Use immediately with Mapper.base()
await Mapper.base('users').insert({ name: 'Alice', email: 'alice@example.com' }).run();

const allUsers = await Mapper.base('users').limit(10).get();

const alice = await Mapper.base('users').where('email', 'alice@example.com').getOne();

await Mapper.base('users')
    .update({ name: 'Alice Cooper' })
    .where('email', 'alice@example.com')
    .run();

await Mapper.base('users').delete().where('email', 'alice@example.com').run();
```

### **Option 2: Connection Management**
**Manually manage connections:**

```ts
import { Mapper } from '@neupgroup/mapper';

// Connect to a database
Mapper.connect('mydb', 'mysql', {
  host: 'localhost',
  user: 'root',
  password: 'password',
  database: 'myapp'
});

// Use the specific connection via schema
Mapper.schema('users')
    .create()
    .useConnection('mydb')
    .structure({ ... });

// Or use raw queries
await Mapper.raw('SELECT * FROM users').get();
```

### **Option 3: Project Discovery Mode**
**Automatically discover connections and schemas from your standard project structure:**

1. Organize your project:
   - `src/config/*.ts` - Connection arrays
   - `src/schemas/*.ts` - Table definitions
   - `src/migration/` - Database migration files

2. Just discover and go:
```ts
import { Mapper } from '@neupgroup/mapper';

// Scans src/config and src/schemas and registers everything
await Mapper.discover();

// Start querying
const users = await Mapper.base('users').limit(10).get();
```

---

## 🛠️ Typical Project Structure
For the best experience (and to use the CLI tools), follow this structure:

```text
your-project/
├── src/
│   ├── config/      # Connection configurations
│   ├── schemas/     # Table/Collection definitions (auto-generated)
│   ├── migration/   # Database migration files
│   └── index.ts     # Your app entry point
└── package.json
```
