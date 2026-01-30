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
await mapper.useConnection('mydb').table('users').add({ name: 'Alice', email: 'alice@example.com' })
const users = await mapper.useConnection('mydb').table('users').select().execute()
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
const users = await Mapper.useConnection('mydb')
  .table('users')
  .select()
  .where('active', true)
  .execute()

// Create temporary connections on-the-fly
const tempData = await Mapper.makeTempConnection('mongodb', {
  url: 'mongodb://localhost:27017',
  database: 'temp'
})
  .collection('cache')
  .find({ expired: false })
  .execute()
```
