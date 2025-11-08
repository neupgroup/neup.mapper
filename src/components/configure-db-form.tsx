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
import { Download, Database, FileJson, Flame, Link, PlusCircle, Trash2, Pencil } from "lucide-react";
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
  connectionName: z.string().min(1, "Connection name is required.").default("default"),
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
  const [dbType, setDbType] = useState<DatabaseType>("Firestore");
  const { toast } = useToast();
  const [envContentAll, setEnvContentAll] = useState<string | null>(null);
  const [connections, setConnections] = useState<string[]>([]);
  const [connectionDbTypes, setConnectionDbTypes] = useState<Record<string, DatabaseType>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [showAddFlow, setShowAddFlow] = useState(false);
  const [addFlowDbType, setAddFlowDbType] = useState<DatabaseType | null>(null);
  const [testing, setTesting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      dbType: "Firestore",
      apiKey: "",
      authDomain: "",
      projectId: "",
      storageBucket: "",
      messagingSenderId: "",
      appId: "",
      connectionName: "default",
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "headers" });

  useEffect(() => {
    (async () => {
      try {
        const { listConnections, getRuntimeDbConfig } = await import("@/app/actions");
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

  const toEnvBlock = (name: string, cfg: any) => {
    const suffix = name === "default" ? "" : `__${name.toUpperCase()}`;
    let content = `# Connection: ${name}\n`;
    content += `CONNECTION_TYPE${suffix}=${cfg.dbType}\n`;
    switch (cfg.dbType) {
      case "Firestore":
        content += `FIRESTORE_API_KEY${suffix}=${cfg.apiKey}\n`;
        content += `FIRESTORE_AUTH_DOMAIN${suffix}=${cfg.authDomain}\n`;
        content += `FIRESTORE_PROJECT_ID${suffix}=${cfg.projectId}\n`;
        content += `FIRESTORE_STORAGE_BUCKET${suffix}=${cfg.storageBucket}\n`;
        content += `FIRESTORE_MESSAGING_SENDER_ID${suffix}=${cfg.messagingSenderId}\n`;
        content += `FIRESTORE_APP_ID${suffix}=${cfg.appId}\n`;
        break;
      case "MongoDB":
        content += `MONGODB_CONNECTION_STRING${suffix}=${cfg.connectionString}\n`;
        break;
      case "API":
        content += `API_BASE_PATH${suffix}=${cfg.basePath}\n`;
        content += `API_KEY${suffix}=${cfg.apiKey || ""}\n`;
        if (cfg.headers && Array.isArray(cfg.headers)) {
          cfg.headers.forEach((h: any, index: number) => {
            if (h.key && h.value) {
              content += `API_HEADER_${index + 1}_KEY${suffix}=${h.key}\n`;
              content += `API_HEADER_${index + 1}_VALUE${suffix}=${h.value}\n`;
            }
          });
        }
        break;
      case "SQL":
        content += `SQL_HOST${suffix}=${cfg.host}\n`;
        content += `SQL_PORT${suffix}=${cfg.port}\n`;
        content += `SQL_USER${suffix}=${cfg.user}\n`;
        content += `SQL_PASSWORD${suffix}=${cfg.password || ""}\n`;
        content += `SQL_DATABASE${suffix}=${cfg.database}\n`;
        break;
    }
    return content + "\n";
  };

  const generateEnvForAllConnections = async () => {
    try {
      const { getRuntimeDbConfig } = await import("@/app/actions");
      const sections: string[] = [];
      for (const name of connections) {
        const cfg = await getRuntimeDbConfig(name);
        if (cfg) sections.push(toEnvBlock(name, cfg));
      }
      if (sections.length === 0) {
        toast({ variant: "destructive", title: "No connections", description: "No configured connections found." });
        return;
      }
      const header = "# Collective .env for all configured connections\n# Non-default connections use __NAME suffixes\n\n";
      setEnvContentAll(header + sections.join("\n"));
      toast({ title: "Collective .env generated", description: ".env content generated for all connections." });
    } catch (error) {
      console.error("Error generating collective .env:", error);
      toast({ variant: "destructive", title: "Failed to generate .env", description: "Please try again." });
    }
  };

  const downloadCollectiveEnv = async () => {
    try {
      const { getRuntimeDbConfig } = await import("@/app/actions");
      const sections: string[] = [];
      for (const name of connections) {
        const cfg = await getRuntimeDbConfig(name);
        if (cfg) sections.push(toEnvBlock(name, cfg));
      }
      if (sections.length === 0) return;
      const header = "# Collective .env for all configured connections\n# Non-default connections use __NAME suffixes\n\n";
      const content = header + sections.join("\n");
      setEnvContentAll(content);
      const blob = new Blob([content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = ".env";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "Downloaded .env", description: "Env file downloaded for current connections." });
    } catch (error) {
      console.error("Error downloading .env:", error);
      toast({ variant: "destructive", title: "Failed to download .env" });
    }
  };

  const applyRuntimeConfig = async () => {
    try {
      const values = form.getValues();
      const name = (values as any).connectionName || "default";
      if (!isEditing && connections.includes(name)) {
        toast({ variant: "destructive", title: "Duplicate connection name", description: `Connection '${name}' already exists.` });
        return;
      }
      const base: any = { dbType: values.dbType };
      let config: any = base;
      switch (values.dbType) {
        case "Firestore":
          config = { ...base, apiKey: (values as any).apiKey, authDomain: (values as any).authDomain, projectId: (values as any).projectId, storageBucket: (values as any).storageBucket, messagingSenderId: (values as any).messagingSenderId, appId: (values as any).appId };
          break;
        case "MongoDB":
          config = { ...base, connectionString: (values as any).connectionString };
          break;
        case "SQL":
          config = { ...base, host: (values as any).host, port: (values as any).port, user: (values as any).user, password: (values as any).password, database: (values as any).database };
          break;
        case "API":
          config = { ...base, basePath: (values as any).basePath, apiKey: (values as any).apiKey, headers: (values as any).headers };
          break;
      }
      if (isEditing) {
        const { updateRuntimeDbConfig } = await import("@/app/actions");
        await updateRuntimeDbConfig(config, name);
        toast({ title: "Connection Updated", description: `Changes saved for '${name}'.` });
        setIsEditing(false);
        setEditingName(null);
      } else {
        const { setRuntimeDbConfig } = await import("@/app/actions");
        await setRuntimeDbConfig(config, name);
        toast({ title: "Runtime Config Applied", description: "Configuration applied for this session." });
      }
      try {
        const { listConnections, getRuntimeDbConfig } = await import("@/app/actions");
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
    } catch (e: any) {
      console.error(e);
      const msg = typeof e?.message === "string" ? e.message : "Please check your inputs and try again.";
      toast({ variant: "destructive", title: "Failed to apply config", description: msg });
    }
  };

  const testConnection = async () => {
    try {
      setTesting(true);
      const values = form.getValues();
      const base: any = { dbType: values.dbType };
      let config: any = base;
      switch (values.dbType) {
        case "Firestore":
          config = { ...base, apiKey: (values as any).apiKey, authDomain: (values as any).authDomain, projectId: (values as any).projectId, storageBucket: (values as any).storageBucket, messagingSenderId: (values as any).messagingSenderId, appId: (values as any).appId };
          break;
        case "MongoDB":
          config = { ...base, connectionString: (values as any).connectionString };
          break;
        case "SQL":
          config = { ...base, host: (values as any).host, port: (values as any).port, user: (values as any).user, password: (values as any).password, database: (values as any).database };
          break;
        case "API":
          config = { ...base, basePath: (values as any).basePath, apiKey: (values as any).apiKey, headers: (values as any).headers };
          break;
      }
      const { testRuntimeDbConnection } = await import("@/app/actions");
      const result = await testRuntimeDbConnection(config);
      if (result.ok) {
        toast({ title: "Connection OK", description: result.message });
      } else {
        toast({ variant: "destructive", title: "Connection Failed", description: result.message });
      }
    } catch (e: any) {
      const msg = typeof e?.message === "string" ? e.message : "Connection test failed.";
      toast({ variant: "destructive", title: "Error", description: msg });
    } finally {
      setTesting(false);
    }
  };

  const startEditConnection = async (name: string) => {
    try {
      const { getRuntimeDbConfig } = await import("@/app/actions");
      const cfg = await getRuntimeDbConfig(name);
      if (!cfg) {
        toast({ variant: "destructive", title: "Not found", description: `No config found for '${name}'.` });
        return;
      }
      setIsEditing(true);
      setEditingName(name);
      setDbType(cfg.dbType as DatabaseType);
      const baseValues: any = { ...(baseDefaultValues as any), dbType: cfg.dbType, connectionName: name };
      switch (cfg.dbType) {
        case "Firestore":
          Object.assign(baseValues, { apiKey: cfg.apiKey ?? "", authDomain: cfg.authDomain ?? "", projectId: cfg.projectId ?? "", storageBucket: cfg.storageBucket ?? "", messagingSenderId: cfg.messagingSenderId ?? "", appId: cfg.appId ?? "" });
          break;
        case "MongoDB":
          Object.assign(baseValues, { connectionString: cfg.connectionString ?? "" });
          break;
        case "SQL":
          Object.assign(baseValues, { host: cfg.host ?? "", port: (cfg.port ?? "") as any, user: cfg.user ?? "", password: cfg.password ?? "", database: cfg.database ?? "" });
          break;
        case "API":
          Object.assign(baseValues, { basePath: cfg.basePath ?? "", apiKey: (cfg as any).apiKey ?? "", headers: (cfg.headers ?? []).map((h: any) => ({ key: h.key, value: h.value })) });
          break;
      }
      // @ts-ignore
      form.reset(baseValues);
      toast({ title: "Editing Connection", description: `Loaded '${name}' into the form.` });
    } catch (e) {
      console.error("Failed to start edit:", e);
      toast({ variant: "destructive", title: "Edit failed", description: "Could not load the selected connection." });
    }
  };

  const deleteConnection = async (name: string) => {
    try {
      if (!confirm(`Delete connection "${name}"? This cannot be undone.`)) return;
      const { deleteRuntimeDbConfig, listConnections } = await import("@/app/actions");
      await deleteRuntimeDbConfig(name);
      const names = await listConnections();
      setConnections(names);
      const types: Record<string, DatabaseType> = {} as any;
      for (const n of names) {
        try {
          const cfg = await (await import("@/app/actions")).getRuntimeDbConfig(n);
          if (cfg?.dbType) types[n] = cfg.dbType as DatabaseType;
        } catch {}
      }
      setConnectionDbTypes(types);
      if (editingName === name) {
        cancelEdit();
      }
      toast({ title: "Connection Deleted", description: `"${name}" was removed.` });
    } catch (e: any) {
      console.error("Delete connection failed:", e);
      const msg = typeof e?.message === "string" ? e.message : "Could not delete the connection.";
      toast({ variant: "destructive", title: "Delete failed", description: msg });
    }
  };

  const startAddConnection = () => {
    setShowAddFlow(true);
    setAddFlowDbType(null);
    setIsEditing(false);
    setEditingName(null);
  };

  const selectAddType = (value: DatabaseType) => {
    setAddFlowDbType(value);
    setDbType(value);
    // @ts-ignore
    form.reset({ dbType: value, connectionName: form.getValues().connectionName || "default" });
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditingName(null);
    // @ts-ignore
    form.reset({ dbType, connectionName: form.getValues().connectionName || "default" });
  };

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
            <FormField control={form.control} name="apiKey" render={({ field }) => (
              <FormItem>
                <FormLabel>API Key</FormLabel>
                <FormControl>
                  <Input placeholder="AIza..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="authDomain" render={({ field }) => (
              <FormItem>
                <FormLabel>Auth Domain</FormLabel>
                <FormControl>
                  <Input placeholder="your-project-id.firebaseapp.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="projectId" render={({ field }) => (
              <FormItem>
                <FormLabel>Project ID</FormLabel>
                <FormControl>
                  <Input placeholder="your-project-id" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="storageBucket" render={({ field }) => (
              <FormItem>
                <FormLabel>Storage Bucket</FormLabel>
                <FormControl>
                  <Input placeholder="your-project-id.appspot.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="messagingSenderId" render={({ field }) => (
              <FormItem>
                <FormLabel>Messaging Sender ID</FormLabel>
                <FormControl>
                  <Input placeholder="1234567890" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="appId" render={({ field }) => (
              <FormItem>
                <FormLabel>App ID</FormLabel>
                <FormControl>
                  <Input placeholder="1:1234567890:web:..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </>
        );
      case "SQL":
        return (
          <>
            <FormField control={form.control} name="host" render={({ field }) => (
              <FormItem>
                <FormLabel>Host</FormLabel>
                <FormControl>
                  <Input placeholder="localhost" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="port" render={({ field }) => (
              <FormItem>
                <FormLabel>Port</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="5432" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="user" render={({ field }) => (
              <FormItem>
                <FormLabel>User</FormLabel>
                <FormControl>
                  <Input placeholder="postgres" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="password" render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input type="password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="database" render={({ field }) => (
              <FormItem>
                <FormLabel>Database</FormLabel>
                <FormControl>
                  <Input placeholder="mydatabase" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </>
        );
      case "API":
        return (
          <>
            <FormField control={form.control} name="basePath" render={({ field }) => (
              <FormItem>
                <FormLabel>Base Path</FormLabel>
                <FormControl>
                  <Input placeholder="https://api.example.com/v1" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="apiKey" render={({ field }) => (
              <FormItem>
                <FormLabel>Authorization Header (Optional)</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="e.g., Bearer <token>" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div>
              <FormLabel>Global API Headers</FormLabel>
              <div className="space-y-4 pt-2">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex flex-wrap items-start gap-2 rounded-lg border p-3">
                    <FormField control={form.control} name={`headers.${index}.key`} render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input placeholder="Header Name (e.g. X-API-Key)" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name={`headers.${index}.value`} render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input type="password" placeholder="Header Value" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}>
                      <Trash2 />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => append({ key: "", value: "" })} disabled={fields.length >= 3}>
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
          <CardTitle>Configured Connections</CardTitle>
          <CardDescription>All connections registered in this session and their types.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {connections.length === 0 ? (
              <p className="text-sm text-muted-foreground">No connections configured yet.</p>
            ) : (
              <ul className="list-disc pl-6 space-y-1">
                {connections.map((name) => (
                  <li key={name} className="flex items-center gap-2">
                    <code>{name}</code>
                    <span className="text-xs text-muted-foreground">— {connectionDbTypes[name] ?? "Unknown"}</span>
                    <Button type="button" variant="ghost" size="icon" aria-label={`Edit ${name}`} onClick={() => startEditConnection(name)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" aria-label={`Delete ${name}`} onClick={() => deleteConnection(name)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap gap-3 pt-2">
              {connections.length === 0 ? (
                <Button type="button" size="sm" variant="outline" onClick={startAddConnection}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add a connection
                </Button>
              ) : (
                <>
                  <Button type="button" size="sm" variant="secondary" onClick={downloadCollectiveEnv} disabled={connections.length === 0}>
                    <Download className="mr-2 h-4 w-4" />
                    Download .env
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={startAddConnection}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add a connection
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {showAddFlow && !isEditing && (
        <Card>
          <CardHeader>
            <CardTitle>Select Connection Type</CardTitle>
            <CardDescription>Choose a connection type to continue.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {databaseOptions.map((option) => (
                <Button key={option.value} variant={dbType === option.value ? "default" : "outline"} onClick={() => selectAddType(option.value)}>
                  {option.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {(isEditing || (showAddFlow && addFlowDbType !== null)) && (
        <Card>
          <CardHeader>
            <CardTitle>Connection Settings</CardTitle>
            <CardDescription>Enter the details and apply the runtime config.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form className="space-y-6">
                <FormField control={form.control} name="connectionName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Connection Name</FormLabel>
                    <FormControl>
                      <Input placeholder="default or custom name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                {/* Keep dbType in form for validation, but don’t show a second selector */}
                <div className="text-sm text-muted-foreground">Type: <span className="font-medium">{dbType}</span></div>
                <input type="hidden" value={dbType} {...form.register('dbType')} />

                {renderFormFields()}

                <div className="flex flex-wrap gap-4">
                  <Button type="button" variant="outline" onClick={testConnection} className="w-full sm:w-auto" disabled={testing}>
                    <span>Test Connection</span>
                  </Button>
                  <Button type="button" variant="outline" onClick={applyRuntimeConfig} className="w-full sm:w-auto">
                    <Database />
                    <span>{isEditing ? "Save Changes" : "Apply Runtime Config"}</span>
                  </Button>
                  {isEditing && (
                    <Button type="button" variant="secondary" onClick={cancelEdit} className="w-full sm:w-auto">
                      Cancel Edit
                    </Button>
                  )}
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
