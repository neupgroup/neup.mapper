# 🛠️ Complete Usage Examples

### **Example 1: Zero-Configuration Setup**
```ts
import Mapper from '@neupgroup/mapper'

// Works immediately with in-memory storage
const users = await Mapper.get('users') // Returns empty array
```

### **Example 2: Environment-Based Configuration**
```bash
# Set environment variable
export DATABASE_URL=mysql://user:password@localhost:3306/myapp

# Or in browser
window.__MAPPER_CONFIG__ = {
  connection: {
    name: 'mydb',
    type: 'mysql',
    key: { host: 'localhost', user: 'root', password: 'pass', database: 'myapp' }
  }
}
```

```ts
import Mapper from '@neupgroup/mapper'

// Automatically configured from environment
const users = await Mapper.get('users')
```

### **Example 3: Schema with Multiple Field Types**
```ts
import Mapper from '@neupgroup/mapper'

Mapper.schema('products')
  .use({ connection: 'default', collection: 'products' })
  .setStructure([
    { name: 'id', type: 'int', autoIncrement: true },
    { name: 'name', type: 'string' },
    { name: 'price', type: 'number' },
    { name: 'inStock', type: 'boolean' },
    { name: 'createdAt', type: 'date' },
    { name: 'categoryId', type: 'int' }
  ])

// Add product
await Mapper.add('products', {
  name: 'Laptop',
  price: 999.99,
  inStock: true,
  createdAt: new Date(),
  categoryId: 1
})

// Get products with filters
const expensiveProducts = await Mapper.get('products', { price: 500 }, '>')
const inStockProducts = await Mapper.get('products', { inStock: true })
```

### **Example 4: Advanced Query Operations**
```ts
import Mapper from '@neupgroup/mapper'

// Complex queries using the underlying API
const query = Mapper.use('users')
  .where('age', 18, '>=')
  .where('status', 'active')

const activeAdults = await query.get()
const firstActiveAdult = await query.getOne()

// Update multiple records
await query.to({ lastLogin: new Date() }).update()

// Delete with complex conditions
await Mapper.use('users')
  .where('lastLogin', new Date('2023-01-01'), '<')
  .delete()
```

### **Example 5: Multiple Databases**
```ts
import Mapper from '@neupgroup/mapper'

// Connect to multiple databases
Mapper.connect('mysql_db', 'mysql', {
  host: 'localhost',
  user: 'root',
  password: 'password',
  database: 'main_app'
})

Mapper.connect('mongo_cache', 'mongodb', {
  uri: 'mongodb://localhost:27017',
  database: 'cache'
})

// Use different connections for different schemas
Mapper.schema('users')
  .use({ connection: 'mysql_db', collection: 'users' })
  .setStructure([...])

Mapper.schema('sessions')
  .use({ connection: 'mongo_cache', collection: 'sessions' })
  .setStructure([...])

// Query from different databases
const users = await Mapper.get('users')        // From MySQL
const sessions = await Mapper.get('sessions')    // From MongoDB
```
