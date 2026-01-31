# Getting Started

## 🚀 Quick Start Options

### **Option 1: One-Import Quick Start**
**The simplest way to get started - just import and use:**

```ts
import Mapper from '@neupgroup/mapper'

// 1. Define a schema (Mapper auto-configures with sensible defaults)
Mapper.schema('users')
  .use({ connection: 'default', collection: 'users' })
  .setStructure([
    { name: 'id', type: 'int', autoIncrement: true },
    { name: 'name', type: 'string' },
    { name: 'email', type: 'string' }
  ])

// 2. Use immediately - no setup required!
await Mapper.add('users', { name: 'Alice', email: 'alice@example.com' })
const users = await Mapper.get('users')
const user = await Mapper.getOne('users', { email: 'alice@example.com' })
await Mapper.update('users', { email: 'alice@example.com' }, { name: 'Alice Cooper' })
await Mapper.delete('users', { email: 'alice@example.com' })
```

### **Option 2: Configuration-Based Approach**
**Use configuration files to manage connections and schemas:**

```ts
import { createConfigMapper } from '@neupgroup/mapper'

// Define your configuration
const config = {
  connections: [
    ['mydb', 'sql', 'user', 'myapp', 'localhost', 5432],
    ['myapi', 'api', 'https://api.example.com']
  ],
  schemas: {
    users: {
      connection: 'mydb',
      collection: 'users',
      structure: [
        { name: 'id', type: 'int', autoIncrement: true },
        { name: 'name', type: 'string' },
        { name: 'email', type: 'string' }
      ]
    }
  }
}

// Create mapper from config
const mapper = createConfigMapper(config)

// Use the mapper
// Use the mapper
await mapper.connection('mydb').table('users').insert({ name: 'Alice', email: 'alice@example.com' })
const users = await mapper.connection('mydb').table('users').get()
```

### **Option 3: PHP-Style Fluent API**
**Use static method chaining for dynamic connections:**

```ts
import { StaticMapper as Mapper } from '@neupgroup/mapper'

// Create persistent connections
Mapper.makeConnection('mydb', 'mysql', {
  host: 'localhost',
  user: 'root', 
  password: 'password',
  database: 'myapp'
})

// Use connections with method chaining
const users = await Mapper.connection('mydb')
  .table('users')
  .where('active', true)
  .get()

// Create temporary connections on-the-fly
const tempData = await Mapper.connection({
  type: 'mongodb',
  url: 'mongodb://localhost:27017',
  database: 'temp'
})
  .where('expired', false)
  .get()

// SQLite connection
const sqliteData = await Mapper.connection({
  type: 'sqlite',
  filename: './local_store.db'
})
  .table('logs')
  .get()
```

### **Option 4: Project Discovery Mode (Recommended)**
**Automatically discover connections and schemas from your standard project structure:**

1. Organize your project:
   - `src/config/*.ts` - Connection arrays
   - `src/schemas/*.ts` - Table definitions

2. Just discover and go:
```ts
import Mapper from '@neupgroup/mapper'

// Scans src/config and src/schemas and registers everything
await Mapper.discover()

// Start querying
const users = await Mapper.get('users')
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
