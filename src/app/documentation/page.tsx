
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
                Neup.Mapper is a powerful tool designed to streamline your database operations by providing a unified interface for various data sources, including Firestore, SQL databases, and generic REST APIs. It leverages AI to help you build schemas and operations, and provides a simple, intuitive browser for your data.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
                <CardTitle>1. Configure Your Database</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm md:prose-base max-w-none text-foreground">
                <p>
                    The first step is to connect to your data source on the <strong>Configure</strong> page. This is where you provide the credentials for your database or API.
                </p>
                <ul>
                    <li>Select your database type (e.g., Firestore, SQL, API).</li>
                    <li>Fill in the required credentials for the selected type.</li>
                    <li>Click "Generate .env Content" to create the necessary environment variables.</li>
                    <li>Download the generated <code>.env</code> file and place it in the root of your project. The application will automatically use these credentials.</li>
                </ul>
                <p className="text-muted-foreground">
                    Note: This information is used to generate a local <code>.env</code> file. Your credentials are not stored or transmitted elsewhere.
                </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
                <CardTitle>2. AI Schema Builder</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm md:prose-base max-w-none text-foreground">
                <p>
                    Go to the <strong>AI Schema Builder</strong> page. Here, you can describe your data in plain English.
                </p>
                <ul>
                    <li>Select the database type you configured.</li>
                    <li>Describe the data you want to model (e.g., "A user with a name, email, and a list of blog posts").</li>
                    <li>The AI will generate a suggested JSON schema and provide a rationale for its design choices. This schema can be used as a starting point.</li>
                </ul>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
                <CardTitle>3. Schema Builder</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm md:prose-base max-w-none text-foreground">
                <p>
                    The <strong>Schema Builder</strong> page allows you to formalize the structure of your collections. While the data browser can work without a schema, defining one provides a much richer editing experience.
                </p>
                <ul>
                    <li>Enter a collection name (e.g., `users`).</li>
                    <li>Define the fields and their data types (string, number, boolean, etc.).</li>
                    <li>For API connections, you can specify the endpoints for GET, CREATE, UPDATE, and DELETE operations.</li>
                    <li>Saving a schema will cause the <strong>Data Browser</strong> to render a structured form for creating and editing documents in that collection.</li>
                </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
                <CardTitle>4. Data Browser</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm md:prose-base max-w-none text-foreground">
                <p>
                    The <strong>Data Browser</strong> is your main interface for interacting with your data. It provides a simple ORM-like chainable API to perform CRUD (Create, Read, Update, Delete) operations.
                </p>
                <ul>
                    <li><strong>Get Documents</strong>: Build queries using filters, sorting, limits, and offsets. The tool generates the equivalent code, which you can then execute.</li>
                    <li><strong>Create Document</strong>: If a schema is defined for the collection, a form is automatically generated. Otherwise, you can create a document using raw JSON.</li>
                    <li><strong>Update Document</strong>: Modify existing documents by providing their ID and the JSON data to merge.</li>
                    <li><strong>Delete Document</strong>: Permanently remove a document by its ID.</li>
                </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
                <CardTitle>5. AI Operation Builder</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm md:prose-base max-w-none text-foreground">
                <p>
                    Similar to the Schema Builder, the <strong>AI Operation Builder</strong> helps you generate code for database operations.
                </p>
                 <ul>
                    <li>Describe the operation you want to perform (e.g., "Find all users older than 30 and sort them by name").</li>
                    <li>The AI will generate the corresponding code snippet using the ORM.</li>
                </ul>
            </CardContent>
          </Card>
        </article>
      </div>
    </MainLayout>
  );
}
