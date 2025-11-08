
"use client";

import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Loader2, Wand2, Download, Database, FileJson, Flame, Link, PlusCircle, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const databaseOptions = [
  { value: "MongoDB", label: "MongoDB", icon: FileJson },
  { value: "Firestore", label: "Firestore", icon: Flame },
  { value: "SQL", label: "SQL", icon: Database },
  { value: "API", label: "API", icon: Link },
] as const;

type DatabaseType = typeof databaseOptions[number]["value"];

const baseSchema = z.object({
  dbType: z.enum(["MongoDB", "Firestore", "SQL", "API"]),
  connectionName: z.string().min(1, "Connection name is required.").default('default'),
});

const mongoSchema = baseSchema.extend({
  connectionString: z.string().min(1, "Connection string is required."),
});

const firestoreSchema = baseSchema.extend({
  apiKey: z.string().min(1, "API Key is required."),
  authDomain: z.string().min(1, "Auth Domain is required."),
  projectId: z.string().min(1, "Project ID is required."),
  storageBucket: z.string().min(1, "Storage Bucket is required."),
  messagingSenderId: z.string().min(1, "Messaging Sender ID is required."),
  appId: z.string().min(1, "App ID is required."),
});

const sqlSchema = baseSchema.extend({
  host: z.string().min(1, "Host is required."),
  port: z.coerce.number().min(1, "Port is required."),
  user: z.string().min(1, "User is required."),
  password: z.string(),
  database: z.string().min(1, "Database name is required."),
});

const apiHeaderSchema = z.object({
    key: z.string().min(1, "Header key is required."),
    value: z.string().min(1, "Header value is required."),
});

const apiSchema = baseSchema.extend({
    basePath: z.string().url("Must be a valid URL."),
    apiKey: z.string().optional(),
    headers: z.array(apiHeaderSchema).max(3, "You can add up to 3 global headers.").optional(),
});


const formSchema = z.discriminatedUnion("dbType", [
  mongoSchema.extend({ dbType: z.literal("MongoDB") }),
  firestoreSchema.extend({ dbType: z.literal("Firestore") }),
  sqlSchema.extend({ dbType: z.literal("SQL") }),
  apiSchema.extend({ dbType: z.literal("API") }),
]);

type FormValues = z.infer<typeof formSchema>;

export function ConfigureDBForm() {
  const [loading, setLoading] = useState(false);
  const [dbType, setDbType] = useState<DatabaseType>("Firestore");
  const { toast } = useToast();
  // Track generated collective .env content for all configured connections
  const [envContentAll, setEnvContentAll] = useState<string | null>(null);
  const [connections, setConnections] = useState<string[]>([]);
  const [connectionDbTypes, setConnectionDbTypes] = useState<Record<string, DatabaseType>>({});


  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      dbType: "Firestore",
      // @ts-ignore
      connectionName: 'default',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    // @ts-ignore
    name: "headers",
  });

   const populateEnvContent = (values: any) => {
    let content = `DB_TYPE=${values.dbType}\n`;
    switch (values.dbType) {
        case 'Firestore':
            content += `
FIRESTORE_API_KEY=${values.apiKey}
FIRESTORE_AUTH_DOMAIN=${values.authDomain}
FIRESTORE_PROJECT_ID=${values.projectId}
FIRESTORE_STORAGE_BUCKET=${values.storageBucket}
FIRESTORE_MESSAGING_SENDER_ID=${values.messagingSenderId}
FIRESTORE_APP_ID=${values.appId}
`;
            break;
        case 'MongoDB':
            content += `
MONGODB_CONNECTION_STRING=${values.connectionString}
`;
            break;
        case 'API':
            content += `
API_BASE_PATH=${values.basePath}
API_KEY=${values.apiKey || ''}
`;
            values.headers?.forEach((header, index) => {
              if (header.key && header.value) {
                content += `API_HEADER_${index+1}_KEY=${header.key}\n`;
                content += `API_HEADER_${index+1}_VALUE=${header.value}\n`;
              }
            });
            break;
        case 'SQL':
            content += `
SQL_HOST=${values.host}
SQL_PORT=${values.port}
SQL_USER=${values.user}
SQL_PASSWORD=${values.password || ''}
SQL_DATABASE=${values.database}
`;
            break;
    }
    return content;
  };

  const handleDbTypeChange = (value: DatabaseType) => {
    setDbType(value);
    // No env generation during creation
    const newDefaults = { dbType: value, connectionName: form.getValues().connectionName || 'default' };
    // @ts-ignore
    form.reset(newDefaults);
  };

  // Build an env block for a specific connection, with suffixed keys for non-default
  const toEnvBlock = (name: string, cfg: any) => {
    const suffix = name === 'default' ? '' : `__${name.toUpperCase()}`;
    let content = `# Connection: ${name}\n`;
    content += `DB_TYPE${suffix}=${cfg.dbType}\n`;
    switch (cfg.dbType) {
      case 'Firestore':
        content += `FIRESTORE_API_KEY${suffix}=${cfg.apiKey}\n`;
        content += `FIRESTORE_AUTH_DOMAIN${suffix}=${cfg.authDomain}\n`;
        content += `FIRESTORE_PROJECT_ID${suffix}=${cfg.projectId}\n`;
        content += `FIRESTORE_STORAGE_BUCKET${suffix}=${cfg.storageBucket}\n`;
        content += `FIRESTORE_MESSAGING_SENDER_ID${suffix}=${cfg.messagingSenderId}\n`;
        content += `FIRESTORE_APP_ID${suffix}=${cfg.appId}\n`;
        break;
      case 'MongoDB':
        content += `MONGODB_CONNECTION_STRING${suffix}=${cfg.connectionString}\n`;
        if (cfg.dbName) content += `MONGODB_DB_NAME${suffix}=${cfg.dbName}\n`;
        break;
      case 'API':
        content += `API_BASE_PATH${suffix}=${cfg.basePath}\n`;
        content += `API_KEY${suffix}=${cfg.apiKey || ''}\n`;
        if (cfg.headers && Array.isArray(cfg.headers)) {
          cfg.headers.forEach((h: any, index: number) => {
            if (h.key && h.value) {
              content += `API_HEADER_${index + 1}_KEY${suffix}=${h.key}\n`;
              content += `API_HEADER_${index + 1}_VALUE${suffix}=${h.value}\n`;
            }
          });
        }
        break;
      case 'SQL':
        content += `SQL_HOST${suffix}=${cfg.host}\n`;
        content += `SQL_PORT${suffix}=${cfg.port}\n`;
        content += `SQL_USER${suffix}=${cfg.user}\n`;
        content += `SQL_PASSWORD${suffix}=${cfg.password || ''}\n`;
        content += `SQL_DATABASE${suffix}=${cfg.database}\n`;
        break;
      default:
        break;
    }
    return content + '\n';
  };

  const generateEnvForAllConnections = async () => {
    try {
      const { getRuntimeDbConfig } = await import('@/app/actions');
      const sections: string[] = [];
      const filtered = connections.filter((n) => connectionDbTypes[n] === dbType);
      for (const name of filtered) {
        const cfg = await getRuntimeDbConfig(name);
        if (cfg) {
          sections.push(toEnvBlock(name, cfg));
        }
      }
      if (sections.length === 0) {
        toast({ variant: 'destructive', title: 'No connections', description: `No configured ${dbType} connections found.` });
        return;
      }
      const header = '# Collective .env for all configured connections\n# Non-default connections use __NAME suffixes\n\n';
      const content = header + sections.join('\n');
      setEnvContentAll(content);
      toast({ title: 'Collective .env generated', description: 'Generated .env content for all configured connections.' });
    } catch (error) {
      console.error('Error generating collective .env:', error);
      toast({ variant: 'destructive', title: 'Failed to generate .env', description: 'Please try again.' });
    }
  };

  const downloadCollectiveEnv = () => {
    if (!envContentAll) return;
    const blob = new Blob([envContentAll], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '.env';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const applyRuntimeConfig = async () => {
    try {
      const values = form.getValues();
      const name = (values as any).connectionName || 'default';
      // Prevent duplicate name or override
      if (connections.includes(name)) {
        toast({ variant: 'destructive', title: 'Duplicate connection name', description: `Connection '${name}' already exists. Please use a different name.` });
        return;
      }
      const base: any = { dbType: values.dbType };
      let config: any = base;
      switch (values.dbType) {
        case 'Firestore':
          config = {
            ...base,
            apiKey: (values as any).apiKey,
            authDomain: (values as any).authDomain,
            projectId: (values as any).projectId,
            storageBucket: (values as any).storageBucket,
            messagingSenderId: (values as any).messagingSenderId,
            appId: (values as any).appId,
          };
          break;
        case 'MongoDB':
          config = { ...base, connectionString: (values as any).connectionString };
          break;
        case 'SQL':
          config = {
            ...base,
            host: (values as any).host,
            port: (values as any).port,
            user: (values as any).user,
            password: (values as any).password,
            database: (values as any).database,
          };
          break;
        case 'API':
          config = {
            ...base,
            basePath: (values as any).basePath,
            apiKey: (values as any).apiKey,
            headers: (values as any).headers,
          };
          break;
      }
      const { setRuntimeDbConfig } = await import('@/app/actions');
      await setRuntimeDbConfig(config, name);
      try {
        const { listConnections, getRuntimeDbConfig } = await import('@/app/actions');
        const names = await listConnections();
        setConnections(names);
        const types: Record<string, DatabaseType> = {} as any;
        for (const n of names) {
          try {
            const cfg = await getRuntimeDbConfig(n);
            if (cfg?.dbType) types[n] = cfg.dbType as DatabaseType;
          } catch {}
        }
        setConnectionDbTypes(types);
      } catch {}
      toast({ title: 'Runtime Config Applied', description: 'Database configuration has been applied for this session.' });
    } catch (e: any) {
      console.error(e);
      const msg = typeof e?.message === 'string' ? e.message : 'Please check your inputs and try again.';
      toast({ variant: 'destructive', title: 'Failed to apply config', description: msg });
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const { listConnections, getRuntimeDbConfig } = await import('@/app/actions');
        const names = await listConnections();
        setConnections(names);
        const types: Record<string, DatabaseType> = {} as any;
        for (const n of names) {
          try {
            const cfg = await getRuntimeDbConfig(n);
            if (cfg?.dbType) types[n] = cfg.dbType as DatabaseType;
          } catch {}
        }
        setConnectionDbTypes(types);
      } catch {}
    })();
  }, []);
  
  const renderFormFields = () => {
    switch (dbType) {
      case "MongoDB":
        return (
          <FormField
            control={form.control}
            name="connectionString"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Connection String</FormLabel>
                <FormControl>
                  <Input placeholder="mongodb+srv://..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );
      case "Firestore":
        return (
          <>
            <FormField
              control={form.control}
              name="apiKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>API Key</FormLabel>
                  <FormControl>
                    <Input placeholder="AIza..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="authDomain"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Auth Domain</FormLabel>
                  <FormControl>
                    <Input placeholder="your-project-id.firebaseapp.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="projectId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project ID</FormLabel>
                  <FormControl>
                    <Input placeholder="your-project-id" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="storageBucket"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Storage Bucket</FormLabel>
                  <FormControl>
                    <Input placeholder="your-project-id.appspot.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="messagingSenderId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Messaging Sender ID</FormLabel>
                  <FormControl>
                    <Input placeholder="1234567890" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="appId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>App ID</FormLabel>
                  <FormControl>
                    <Input placeholder="1:1234567890:web:..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        );
      case "SQL":
        return (
          <>
            <FormField
              control={form.control}
              name="host"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Host</FormLabel>
                  <FormControl>
                    <Input placeholder="localhost" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="port"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Port</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="5432" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="user"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>User</FormLabel>
                  <FormControl>
                    <Input placeholder="postgres" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="database"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Database</FormLabel>
                  <FormControl>
                    <Input placeholder="mydatabase" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        );
        case "API":
        return (
          <>
            <FormField
              control={form.control}
              name="basePath"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Base Path</FormLabel>
                  <FormControl>
                    <Input placeholder="https://api.example.com/v1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="apiKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Authorization Header (Optional)</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="e.g., Bearer <token>" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div>
              <FormLabel>Global API Headers</FormLabel>
              <div className="space-y-4 pt-2">
                {fields.map((field, index) => (
                    <div key={field.id} className="flex flex-wrap items-start gap-2 rounded-lg border p-3">
                        <FormField
                            control={form.control}
                            // @ts-ignore
                            name={`headers.${index}.key`}
                            render={({ field }) => (
                            <FormItem className="flex-1">
                                <FormControl>
                                <Input placeholder="Header Name (e.g. X-API-Key)" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            // @ts-ignore
                            name={`headers.${index}.value`}
                            render={({ field }) => (
                            <FormItem className="flex-1">
                                <FormControl>
                                <Input type="password" placeholder="Header Value" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            onClick={() => remove(index)}
                        >
                            <Trash2 />
                        </Button>
                    </div>
                ))}
                 <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => append({ key: '', value: '' })}
                  disabled={fields.length >= 3}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Header
                </Button>
              </div>
            </div>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Database Credentials</CardTitle>
          <CardDescription>
            Enter the details for your database connection. Apply the runtime config to register a connection.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form className="space-y-6">
          <FormItem>
            <FormLabel>Connection Name</FormLabel>
            <FormField
              control={form.control}
              name="connectionName"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input placeholder="default or custom name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </FormItem>
          
          <FormItem>
            <FormLabel>Database Type</FormLabel>
            <Select
              onValueChange={(value) => handleDbTypeChange(value as DatabaseType)}
              value={dbType}
            >
                  <FormControl>
                    <SelectTrigger className="w-full sm:w-64">
                      <SelectValue placeholder="Select a database type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {databaseOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <option.icon className="h-4 w-4 text-muted-foreground" />
                          <span>{option.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
              
              {renderFormFields()}
              
              <div className="flex flex-wrap gap-4">
                <Button type="button" variant="outline" onClick={applyRuntimeConfig} className="w-full sm:w-auto">
                  <Database />
                  <span>Apply Runtime Config</span>
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      {connections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Configured Connections</CardTitle>
            <CardDescription>
              Filtering by selected database type: <code>{dbType}</code>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <ul className="list-disc pl-6 space-y-1">
                {connections
                  .filter((name) => connectionDbTypes[name] === dbType)
                  .map((name) => (
                    <li key={name}><code>{name}</code></li>
                  ))}
              </ul>
              <div className="flex flex-wrap gap-3 pt-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={generateEnvForAllConnections}
                  disabled={connections.filter((n) => connectionDbTypes[n] === dbType).length === 0}
                >
                  <Wand2 className="mr-2 h-4 w-4" />
                  Generate collective .env
                </Button>
                <Button type="button" size="sm" variant="secondary" onClick={downloadCollectiveEnv} disabled={!envContentAll}>
                  <Download className="mr-2 h-4 w-4" />
                  Download .env
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

    
