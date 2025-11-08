import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function DocumentationPage() {
  return (
    <MainLayout>
      <div className="space-y-8">
        <h1 className="font-headline text-2xl font-bold tracking-tight sm:text-3xl">
          Documentation
        </h1>
        <article className="prose prose-invert max-w-none">
          <Card>
            <CardHeader>
              <CardTitle>Welcome to Neup.Mapper</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm md:prose-base max-w-none text-foreground">
              <p>
                Neup.Mapper is a powerful tool designed to streamline your database operations by providing a unified interface for various data sources, including Firestore, SQL databases, MongoDB, and generic REST APIs. It provides simple, consistent interfaces, optional schema-driven forms, and AI helpers for modeling and operations.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>1. Create a Connection</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm md:prose-base max-w-none text-foreground">
              <p>
                Use the <strong>Configure</strong> page to add one or more connections. Each connection must have a unique <em>connection name</em> (e.g., <code>default</code>, <code>analytics</code>). Duplicate names are not allowed.
              </p>
              <ul>
                <li>Select the database type: <code>Firestore</code>, <code>SQL</code>, <code>MongoDB</code>, or <code>API</code>.</li>
                <li>Provide the required credentials for the selected type.</li>
                <li>Click <strong>Apply Runtime Config</strong> to register the connection in the current session.</li>
                <li>Use <strong>Generate collective .env</strong> to produce environment variables for all configured connections of the selected type.</li>
                <li>Download the generated <code>.env</code> and place it at your project root.</li>
              </ul>
              <p className="text-muted-foreground">
                Tip: Non-default connections in the generated <code>.env</code> use a suffix format like <code>__ANALYTICS</code>. For example, <code>CONNECTION_TYPE__ANALYTICS=Firestore</code>.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>2. Config File Placement & Access</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm md:prose-base max-w-none text-foreground">
              <p>
                Place your <code>.env</code> at the <strong>project root</strong> (same level as <code>package.json</code>). The app reads environment variables to build a default runtime configuration if no session connections exist.
              </p>
              <p>
                You can also hardcode configuration in code for development and testing. Use a server-side initializer to call <code>setRuntimeDbConfig</code> with your config.
              </p>
              <pre><code>{`// Example: hardcode a Firestore connection during development
'use server';
import { setRuntimeDbConfig } from '@/app/actions';

export async function initDevConnections() {
  await setRuntimeDbConfig({
    dbType: 'Firestore',
    apiKey: '...',
    authDomain: '...',
    projectId: '...',
    storageBucket: '...',
    messagingSenderId: '...',
    appId: '...'
  }, 'default');

  await setRuntimeDbConfig({
    dbType: 'API',
    basePath: 'https://api.example.com/v1',
    apiKey: 'Bearer <token>'
  }, 'analytics');
}
`}</code></pre>
              <p>
                To access configs later, use:
              </p>
              <pre><code>{`import { listConnections, getRuntimeDbConfig } from '@/app/actions';

const names = await listConnections(); // ['default', 'analytics']
const defaultCfg = await getRuntimeDbConfig('default');
`}</code></pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>3. Build Schemas</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm md:prose-base max-w-none text-foreground">
              <p>
                Use the <strong>Schemas</strong> page to create schemas tied to a configured connection. Select a connection and define collection fields; API connections also allow endpoint hints.
              </p>
              <ul>
                <li>Schemas are stored per connection and can be downloaded as <code>schemas.&lt;connection&gt;.json</code>.</li>
                <li>Defining a schema enhances the Data Browser experience for create/update screens.</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>4. Access Data (env & hardcoded)</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm md:prose-base max-w-none text-foreground">
              <p>
                Use the client-side <code>Connection</code> helper with an optional named connection to run queries. When omitted, the <code>default</code> connection is used (from env or session).
              </p>
              <pre><code>{`import { Connection } from '@/lib/orm/query-builder';

// Read (with filters and fields)
const users = await new Connection('default')
  .collection('users')
  .where('age', '>=', 18)
  .sortBy('name', 'asc')
  .limit(20)
  .get('name', 'email');

// Create
const id = await new Connection('analytics')
  .collection('events')
  .add({ type: 'click', ts: Date.now() });

// Update
await new Connection()
  .collection('users')
  .update(id, { premium: true });

// Delete
await new Connection('default')
  .collection('users')
  .delete(id);
`}</code></pre>
              <p className="text-muted-foreground">
                Environment-based configs are read automatically for <code>default</code>. Named connections require runtime config registration (via Configure page or hardcoded initializer).
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>5. Fetch Using Schemas</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm md:prose-base max-w-none text-foreground">
              <p>
                Schemas enhance forms and defaults in the UI; programmatically, you continue using the <code>Connection</code> API. Choose the same connection in the Schemas page as in your code.
              </p>
              <p>
                For API connections, endpoint hints in schemas are used by the UI; your code remains the same:
              </p>
              <pre><code>{`// Using a schema-defined 'products' collection
const docs = await new Connection('default')
  .collection('products')
  .get('name', 'price');
`}</code></pre>
            </CardContent>
          </Card>
        </article>
      </div>
    </MainLayout>
  );
}
