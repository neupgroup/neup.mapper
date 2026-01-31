// Centralized documentation for @neupgroup/mapper.
// Exports Markdown plus a minimal Markdown→HTML converter so apps can render
// without a heavy dependency. Keep content comprehensive and up-to-date.

export const documentationMd = `
# Mapper Library Documentation

Welcome to \`@neupgroup/mapper\`. This guide covers:
- Installation
- Configuring connections (DSL and UI)
- Using connections in code
- Creating schemas (ORM)
- Configuring and using schemas
- CRUD operations: insert, update, delete, fetch
- Error handling and troubleshooting

---

## Installation

- Install from npm:
  \`npm install @neupgroup/mapper\`
- In this workspace, the app depends on the library via \`workspace:*\`. Build the library when you update it:
  \`cd library && npm run build\`
- Import helpers:
  \`import { parseConnectionsDsl, toNormalizedConnections } from '@neupgroup/mapper'\`

---

## Configure Connections

You can configure connections in two ways:

1) DSL File (recommended)
2) UI Configure page (runtime setup)

### 1) DSL Format

Create \`connections.dsl\` at your project root:

\`\`\`
connections = [
  mysql_prod: {
    type: mysql
    host: 127.0.0.1
    port: 3306
    user: root
    password: "s3cr3t"
    database: appdb
  }

  mongo_dev: {
    type: mongodb
    uri: "mongodb://127.0.0.1:27017"
    database: devdb
  }

  firestore_local: {
    type: firestore
    projectId: my-project
    applicationDefault: true
  }

  http_api: {
    type: api
    baseUrl: "https://api.example.com"
    token: "abc123"
  }
]
\`\`\`

Notes:
- \`type\` (or \`dbType\`) defaults to \`api\` if omitted.
- Values can be unquoted or quoted; comments using \`#\` are ignored.

Parse and normalize:

\`\`\`ts
import { parseConnectionsDsl, toNormalizedConnections } from '@neupgroup/mapper'

const text = await fs.promises.readFile('connections.dsl', 'utf8')
const envMap = parseConnectionsDsl(text)
const connections = toNormalizedConnections(envMap)
// connections: Array<{ name, type, key }>
\`\`\`

### 2) UI Configure Page

- Go to \`/configure\` to define connections at runtime.
- Use \"Generate collective env\" to produce \`connections.dsl\` from configured connections.
- Download the file and commit it or load at startup.

---

## Use Connections in Code

### Normalize and route by type

\`\`\`ts
import { parseConnectionsDsl, toNormalizedConnections } from '@neupgroup/mapper'
import { connection, schema } from '@neupgroup/mapper'

const text = await fs.promises.readFile('connections.dsl', 'utf8')
const envMap = parseConnectionsDsl(text)
const conns = toNormalizedConnections(envMap)

// Register connections
const conRegistry = connection()
for (const c of conns) {
  conRegistry.register({ name: c.name, type: c.type, key: c.key })
}

// Use with schemas
const sm = schema(conRegistry)
\`\`\`

### Direct construction

\`\`\`ts
const conRegistry = connection()
conRegistry.create('mysql_prod', 'mysql').key({
  host: '127.0.0.1',
  port: 3306,
  user: 'root',
  password: 's3cr3t',
  database: 'appdb',
})
\`\`\`

---

## Schemas and Models

Schemas define structure for collections/tables bound to a connection.

### Define and register a schema

\`\`\`ts
import { schema } from '@neupgroup/mapper'

const sm = schema(conRegistry)

sm.create('User')
  .use({ connection: 'mysql_prod', collection: 'users' })
  .setStructure({
    id: 'string primary',
    email: 'string unique',
    name: 'string editable',
    createdAt: 'date',
    '?field': 'allow-undefined', // optional: permit fields not listed
  })

const User = sm.use('User')
\`\`\`

---

## CRUD Operations

All operations return Promises and may throw on errors.

### Insert

\`\`\`ts
const createdId = await User.add({
  id: 'u_123',
  email: 'alice@example.com',
  name: 'Alice',
  createdAt: new Date(),
})
\`\`\`

### Update

\`\`\`ts
await User.where(['id', 'u_123']).to({ name: 'Alice Cooper' }).updateOne()
\`\`\`

### Delete

\`\`\`ts
await User.where(['id', 'u_123']).deleteOne()
\`\`\`

### Fetch / Query

\`\`\`ts
const one = await User.where(['id', 'u_123']).getOne()
const many = await User.where('email', '%@example.com', 'like').get()
\`\`\`

---

## Fluent API Requests

For API connections, you can make fluent HTTP requests without defining a full schema.

\`\`\`ts
const conn = Mapper.connection({ type: 'api', url: 'https://api.example.com' });

// Simple POST
await conn.path("/users").post({ name: 'John Doe' });

// Chained paths and headers
const result = await conn.path("/v1")
  .path("/users/123")
  .header("Authorization", "Bearer my-token")
  .headers({ "X-Custom": "value" })
  .get();

// Support for multiple values for the same header
await conn.path("/notify")
  .header("X-Tag", "news")
  .header("X-Tag", "alerts")
  .post({ body: "Hello" });
\`\`\`

Available methods: \`.get()\`, \`.post(data)\`, \`.put(data)\`, \`.patch(data)\`, \`.delete()\`.

---

## Schema Configuration Details

- \`primary\`: marks primary key; used for updates/deletes.
- \`unique\`: enforces uniqueness in supported backends.
- \`editable\`: indicates fields commonly modified via UI.
- \`type\`: one of \`string\`, \`number\`, \`boolean\`, \`date\`, \`int\`.
- \`?field\`: enables accepting fields not defined in the schema.

---

## Error Handling

Wrap operations in \`try/catch\` and inspect known error shapes.

\`\`\`ts
try {
  const user = await User.where(['id', 'u_404']).getOne()
  if (!user) {
    // handle not found gracefully
  }
} catch (err) {
  if (err && typeof err === 'object' && 'code' in err) {
    console.error('Database error code:', (err as any).code)
  }
  console.error('Unexpected error', err)
}
\`\`\`

Recommendations:
- Validate required creds before initializing connections.
- Prefer parameterized queries or ORM filters over string concatenation.
- Log request IDs and timestamps for audit trails.

---

## Troubleshooting

- \"Connection refused\": check host/port/firewall and credentials.
- \"Authentication failed\": verify tokens/passwords and token scopes.
- \"Timeout\": review network paths and optimize query.
- \"Schema mismatch\": ensure field names/types match the backend.

---

## API Quick Reference

- \`parseConnectionsDsl(text)\` → Map of connectionName → key/value creds
- \`toNormalizedConnections(map)\` → Array of { name, type, key }
- \`connection()\` → Connection registry (create/register/list/get)
- \`schema(connections?)\` → Schema manager; define, register, and use schemas

---

## End-to-End Example

\`\`\`ts
import { parseConnectionsDsl, toNormalizedConnections, connection, schema } from '@neupgroup/mapper'

const text = await fs.promises.readFile('connections.dsl', 'utf8')
const map = parseConnectionsDsl(text)
const conns = toNormalizedConnections(map)

const conRegistry = connection()
for (const c of conns) conRegistry.register({ name: c.name, type: c.type, key: c.key })

const sm = schema(conRegistry)
sm.create('Product')
  .use({ connection: conns[0].name, collection: 'products' })
  .setStructure({
    id: 'string primary',
    title: 'string',
    price: 'number',
    tags: 'string',
  })
const Product = sm.use('Product')

await Product.add({ id: 'p_1', title: 'Widget', price: 9.99, tags: 'sale' })
await Product.where(['id', 'p_1']).to({ price: 7.99 }).updateOne()
const items = await Product.where('price', 10, '<').get()
await Product.where(['id', 'p_1']).deleteOne()
\`\`\`
`;

// Minimal Markdown → HTML converter (headings, lists, code fences, inline code, paragraphs)
export function markdownToHtml(md: string): string {
  const lines = md.split(/\r?\n/)
  let html: string[] = []
  let inCode = false
  let codeBuf: string[] = []

  function escapeHtml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  }
  function inline(s: string): string {
    s = s.replace(/`([^`]+)`/g, (_m, g1) => `<code>${escapeHtml(g1)}</code>`)
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>')
    s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    return s
  }
  function flushParagraph(buf: string[]) {
    const text = buf.join(' ').trim()
    if (!text) return
    html.push(`<p>${inline(escapeHtml(text))}</p>`)
    buf.length = 0
  }

  let paraBuf: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.trim().startsWith('```')) {
      if (inCode) {
        html.push(`<pre><code>${escapeHtml(codeBuf.join('\n'))}</code></pre>`)
        codeBuf = []
        inCode = false
      } else {
        flushParagraph(paraBuf)
        inCode = true
      }
      continue
    }
    if (inCode) {
      codeBuf.push(line)
      continue
    }
    const hMatch = /^(#{1,6})\s+(.*)$/.exec(line)
    if (hMatch) {
      flushParagraph(paraBuf)
      const level = hMatch[1].length
      const content = hMatch[2]
      html.push(`<h${level}>${inline(escapeHtml(content))}</h${level}>`)
      continue
    }
    if (/^\s*[-*]\s+/.test(line)) {
      flushParagraph(paraBuf)
      let ulItems: string[] = []
      ulItems.push(line.replace(/^\s*[-*]\s+/, ''))
      while (i + 1 < lines.length && /^\s*[-*]\s+/.test(lines[i + 1])) {
        i++
        ulItems.push(lines[i].replace(/^\s*[-*]\s+/, ''))
      }
      const lis = ulItems.map(item => `<li>${inline(escapeHtml(item))}</li>`).join('')
      html.push(`<ul>${lis}</ul>`)
      continue
    }
    if (/^\s*$/.test(line)) {
      flushParagraph(paraBuf)
      continue
    }
    paraBuf.push(line)
  }

  if (inCode) {
    html.push(`<pre><code>${codeBuf.map(s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')).join('\n')}</code></pre>`)
  }
  flushParagraph(paraBuf)
  return html.join('\n')
}

export function getDocumentationHtml(): string {
  return markdownToHtml(documentationMd)
}

