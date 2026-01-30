# Connections DSL

You can define connections in a simple DSL and load them at runtime.

`connections.dsl` example:

```
connections = [
  mysql_prod = [
    type: mysql,
    host: 127.0.0.1,
    port: 3306,
    user: root,
    password: "s3cr3t",
    database: appdb,
  ],

  mongo_dev = [
    type: mongodb,
    uri: "mongodb://127.0.0.1:27017",
    database: devdb,
  ],
]
```

Load and normalize:

```ts
import { parseConnectionsDsl, toNormalizedConnections, connection, schema } from '@neupgroup/mapper'

const text = await fs.promises.readFile('connections.dsl', 'utf8')
const envMap = parseConnectionsDsl(text)
const conns = toNormalizedConnections(envMap)

const conRegistry = connection()
for (const c of conns) {
  conRegistry.register({ name: c.name, type: c.type, key: c.key })
}
const sm = schema(conRegistry)
```

Notes:
- `type` (or `dbType`) defaults to `api` if omitted.
- Values can be quoted or unquoted; `#` comments are ignored.
