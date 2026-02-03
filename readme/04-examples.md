# 🛠️ Complete Usage Examples

### **Example 1: Basic Setup**
```ts
import { Mapper } from '@neupgroup/mapper';

// Connect to SQLite
Mapper.init().connect('default', 'sqlite', { filename: './db.sqlite' });

// Create Table
await Mapper.migrator().create('products', {
    id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
    name: 'TEXT',
    price: 'REAL'
});

// Update Table (Add new column)
await Mapper.migrator().update('products', {
    description: 'TEXT'
});

// Add Data
await Mapper.base('products').insert({ name: 'Laptop', price: 999.99 });
```

### **Example 2: CRUD Operations**
```ts
// Select
const expensive = await Mapper.base('products')
    .select()
    .where('price', 500, '>')
    .get();

// Update
await Mapper.base('products')
    .update({ price: 899.99 })
    .where('name', 'Laptop');

// Delete
await Mapper.base('products')
    .delete()
    .where('price', 100, '<');
```

### **Example 3: Raw SQL**
```ts
// Complex Join
const report = await Mapper.raw(`
    SELECT u.name, count(o.id) as orders 
    FROM users u 
    JOIN orders o ON u.id = o.user_id 
    GROUP BY u.name
`).execute();
```

### **Example 4: Migrations**
```ts
// Schema Management
await Mapper.migrator().drop('old_table');
await Mapper.migrator().truncate('logs');
```
