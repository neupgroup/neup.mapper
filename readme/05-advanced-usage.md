# Advanced Usage (Original API)

For more control, you can still use the original granular API:

```ts
import { connection, schema } from '@neupgroup/mapper'
import type { DbAdapter, QueryOptions } from '@neupgroup/mapper'

// 1) Define connections
const conRegistry = connection()
conRegistry.create('mysql_prod', 'mysql').key({
  host: '127.0.0.1',
  port: 3306,
  user: 'root',
  password: 's3cr3t',
  database: 'appdb',
})

// 2) Attach an adapter for the connection
const adapter: DbAdapter = {
  async getDocuments(options: QueryOptions) { return [] },
  async addDocument(collectionName: string, data: Record<string, any>) { return 'new-id' },
  async updateDocument(collectionName: string, docId: string, data: Record<string, any>) { },
  async deleteDocument(collectionName: string, docId: string) { },
}
conRegistry.attachAdapter('mysql_prod', adapter)

// 3) Register schema and run CRUD
const sm = schema(conRegistry)
sm.create('User')
  .use({ connection: 'mysql_prod', collection: 'users' })
  .setStructure({
    id: 'string',
    email: 'string',
    name: 'string editable',
    createdAt: 'date',
    '?field': 'allow-undefined',
  })

const User = sm.use('User')
await User.add({ id: 'u_1', email: 'alice@example.com', name: 'Alice', createdAt: new Date() })
await User.where(['id', 'u_1']).to({ name: 'Alice Cooper' }).updateOne()
const one = await User.where(['id', 'u_1']).getOne()
await User.where(['id', 'u_1']).deleteOne()
```

## Documentation Helpers

For apps that want to render built-in documentation:

```ts
import { documentationMd, markdownToHtml, getDocumentationHtml } from '@neupgroup/mapper'

const html = getDocumentationHtml()
```
