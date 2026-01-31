# Configuration

## Auto-Configuration Magic ✨

The Mapper automatically configures itself based on your environment:

- **Environment Variables**: `DATABASE_URL=mysql://user:pass@host:port/db`
- **Browser Global**: `window.__MAPPER_CONFIG__`
- **Default Fallback**: In-memory API connection for instant prototyping

**Connection type auto-detection:**
```
mysql://...      → MySQL
postgres://...   → PostgreSQL  
mongodb://...    → MongoDB
firestore://...  → Firestore
```

## 🏗️ Project Discovery Mode
If you follow the [Standard Project Structure](./02-getting-started.md#🛠️-typical-project-structure), you can initialize everything with a single call:

```ts
import Mapper from '@neupgroup/mapper'

// Scans src/config/*.ts for connections
// Scans src/schemas/*.ts for schema definitions
await Mapper.discover()
```

## Manual Configuration (Optional)

```ts
// Connect to your database
Mapper.connect('mydb', 'mysql', {
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: 'password',
  database: 'myapp'
})

// Or use environment variables
// DATABASE_URL=mysql://root:password@localhost:3306/myapp
```

## 🌍 Environment Configuration Guide

### **Node.js Environment Variables**

The Mapper automatically detects these environment variables:

```bash
# Basic database URL (auto-detects type)
DATABASE_URL=mysql://user:password@localhost:3306/myapp

# Or specific connection types
MYSQL_URL=mysql://user:password@localhost:3306/myapp
POSTGRES_URL=postgres://user:password@localhost:5432/myapp
MONGODB_URL=mongodb://localhost:27017/myapp
FIRESTORE_URL=firestore://project-id
```

### **Browser Environment**

For client-side applications, use the global configuration:

```html
<script>
  window.__MAPPER_CONFIG__ = {
    connection: {
      name: 'api',
      type: 'api',
      key: {
        endpoint: 'https://api.example.com',
        apiKey: 'your-api-key'
      }
    },
    schemas: [
      {
        name: 'users',
        connection: 'api',
        collection: 'users',
        structure: [
          { name: 'id', type: 'int' },
          { name: 'name', type: 'string' }
        ]
      }
    ]
  }
</script>
```

### **Configuration Priority Order**

1. **Manual Configuration**: `Mapper.connect()` calls
2. **Environment Variables**: `DATABASE_URL` and others
3. **Browser Global**: `window.__MAPPER_CONFIG__`
4. **Default Fallback**: In-memory API connection

### **Docker & Production Setup**

```dockerfile
# Dockerfile
ENV DATABASE_URL=mysql://user:password@db:3306/myapp
```

```yaml
# docker-compose.yml
services:
  app:
    environment:
      - DATABASE_URL=mysql://user:password@db:3306/myapp
```

### **Configuration Validation**

```ts
import Mapper from '@neupgroup/mapper'

// Check current configuration
console.log('Connections:', Mapper.getConnections().list())
console.log('Schemas:', Mapper.getSchemaManager().list())

// Verify auto-configuration worked
const config = Mapper.getConnections().get('default')
if (!config) {
  console.log('No auto-configuration detected, using manual setup...')
  Mapper.connect('manual', 'mysql', { /* config */ })
}
```

## Dynamic Connections (Runtime/Connector)

For dynamic environments where connection details come from runtime variables (cookies, session storage, function arguments, etc.), use the `Connector` fluent API. This allows defining ad-hoc connections and queries in a single chain.


```ts
import { mapper } from '@neupgroup/mapper';

// Example 1: Dynamic Database Connection
const dbName = getTenantDbName(); // e.g. from session
const dbPass = getSecurePassword(); 

// Create connection and query 'users' table immediately
await mapper('tenant_db')
  .type('mysql')
  .config({
    host: 'localhost',
    user: 'admin',
    password: dbPass,
    database: dbName
  })
  .table('users')
  .add({ name: 'New User', email: 'user@example.com' });

// Example 2: Dynamic API Endpoint
const apiToken = sessionStorage.getItem('apiKey');

const api = mapper('my_api')
  .type('api')
  .basePath('https://api.example.com')
  .config({ headers: { Authorization: apiToken } })
  .subpath('prospects'); // treats 'prospects' as the collection/table

// Perform operations
await api.add({ name: 'Lead 1' });
const leads = await api.where('status', 'new').get();
```

This approach bypasses the global static configuration and creates/registers connections on the fly.
