# Best Practices & Quick Reference

### **One-Import Benefits**

✅ **Zero Configuration**: Works out of the box  
✅ **Auto-Detection**: Automatically configures from environment  
✅ **Universal**: Works in Node.js and browsers  
✅ **Type Safe**: Full TypeScript support  
✅ **Progressive**: Start simple, scale to complex  
✅ **Lightweight**: Minimal overhead, maximum performance  

### **Migration from Original API**

The new `Mapper` default export is fully compatible with the original API:

```ts
// Old way (still works)
import { connection, schema } from '@neupgroup/mapper'
const conns = connection()
const sm = schema(conns)

// New way (recommended)
import Mapper from '@neupgroup/mapper'
// Mapper is pre-configured and ready to use

// Access underlying managers if needed
const conns = Mapper.getConnections()
const sm = Mapper.getSchemaManager()
```

### **Best Practices**

1. **Start with defaults**: Let Mapper auto-configure itself
2. **Use environment variables**: Set `DATABASE_URL` for production
3. **Define schemas early**: Create schemas at app startup
4. **Use TypeScript**: Get full type safety and IntelliSense
5. **Handle errors**: Wrap operations in try/catch blocks

### **Common Patterns**

```ts
// Pattern 1: Quick CRUD (One-Import)
await Mapper.add('users', data)
const users = await Mapper.get('users')

// Pattern 2: Configuration-Based
const mapper = createConfigMapper(config)
await mapper.useConnection('mydb').table('users').add(data)

// Pattern 3: Fluent API
await StaticMapper.useConnection('mydb').table('users').add(data).execute()

// Pattern 4: Complex queries
const results = await Mapper.use('users')
  .where('age', 18, '>=')
  .where('country', 'US')
  .get()

// Pattern 5: Batch operations
const users = await Mapper.get('users')
for (const user of users) {
  await Mapper.update('users', { id: user.id }, { lastSeen: new Date() })
}
```

## 🔄 **Choosing the Right Approach**

### **When to Use Each Method**

| Approach | Best For | Example Use Case |
|----------|----------|------------------|
| **One-Import** | Quick prototyping, simple apps | `Mapper.add('users', data)` |
| **Configuration-Based** | Enterprise apps, multiple environments | Load from config files |
| **Fluent API** | Dynamic connections, runtime decisions | Create temp connections on-demand |
