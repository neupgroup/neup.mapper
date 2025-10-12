
"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
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
import { Loader2, Save, Database, FileJson, Flame, Link } from "lucide-react";
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

const apiSchema = baseSchema.extend({
    basePath: z.string().url("Must be a valid URL."),
    apiKey: z.string().optional(),
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

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      dbType: "Firestore",
    },
  });

   const populateEnvContent = (values: FormValues) => {
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
        case 'API':
            content += `
API_BASE_PATH=${values.basePath}
API_KEY=${values.apiKey || ''}
`;
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
    form.setValue("dbType", value);
    const newDefaults = { dbType: value };
    form.reset(newDefaults);
  };

  async function onSubmit(values: FormValues) {
    setLoading(true);
    try {
      const envContent = populateEnvContent(values);
      // Here you would typically make an API call to your backend to save the .env file
      // For this example, we'll simulate it and show a toast.
      console.log("Saving to .env:\n", envContent);
      
      toast({
        title: "Configuration Updated",
        description: `Your .env file has been prepared. Please check your server logs for the content and save it to your project's .env file.`,
      });
    } catch (error) {
      console.error("Error saving configuration:", error);
      toast({
        variant: "destructive",
        title: "An error occurred",
        description: "Failed to save configuration. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }
  
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
                  <FormLabel>API Key (Optional)</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Bearer ..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
            Enter the details for your database connection. This will generate content for your <code>.env</code> file.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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

              <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                {loading ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Save />
                )}
                <span>{loading ? "Saving..." : "Update .env Content"}</span>
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
