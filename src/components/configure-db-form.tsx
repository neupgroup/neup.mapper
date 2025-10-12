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
import { Loader2, Save, Database, FileJson, Flame } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const databaseOptions = [
  { value: "MongoDB", label: "MongoDB", icon: FileJson },
  { value: "Firestore", label: "Firestore", icon: Flame },
  { value: "SQL", label: "SQL", icon: Database },
] as const;

type DatabaseType = typeof databaseOptions[number]["value"];

const baseSchema = z.object({
  dbType: z.enum(["MongoDB", "Firestore", "SQL"]),
});

const mongoSchema = baseSchema.extend({
  connectionString: z.string().min(1, "Connection string is required."),
});

const firestoreSchema = baseSchema.extend({
  projectId: z.string().min(1, "Project ID is required."),
  clientEmail: z.string().email("Invalid email format."),
  privateKey: z.string().min(1, "Private key is required."),
});

const sqlSchema = baseSchema.extend({
  host: z.string().min(1, "Host is required."),
  port: z.coerce.number().min(1, "Port is required."),
  user: z.string().min(1, "User is required."),
  password: z.string(),
  database: z.string().min(1, "Database name is required."),
});

const formSchema = z.discriminatedUnion("dbType", [
  mongoSchema.extend({ dbType: z.literal("MongoDB") }),
  firestoreSchema.extend({ dbType: z.literal("Firestore") }),
  sqlSchema.extend({ dbType: z.literal("SQL") }),
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

  useEffect(() => {
    try {
      const savedConfig = localStorage.getItem("dbConfig");
      if (savedConfig) {
        const parsedConfig = JSON.parse(savedConfig);
        form.reset(parsedConfig);
        if (parsedConfig.dbType) {
          setDbType(parsedConfig.dbType);
        }
      }
    } catch (error) {
      console.error("Failed to load configuration from local storage", error);
    }
  }, [form]);

  const handleDbTypeChange = (value: DatabaseType) => {
    setDbType(value);
    form.setValue("dbType", value);
    // Reset other fields when type changes
    const newDefaults = { dbType: value };
    form.reset(newDefaults);
  };

  async function onSubmit(values: FormValues) {
    setLoading(true);
    try {
      localStorage.setItem("dbConfig", JSON.stringify(values));
      toast({
        title: "Configuration Saved",
        description: `Your ${values.dbType} configuration has been saved locally.`,
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
              name="projectId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project ID</FormLabel>
                  <FormControl>
                    <Input placeholder="your-firebase-project-id" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="clientEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client Email</FormLabel>
                  <FormControl>
                    <Input placeholder="firebase-adminsdk-..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="privateKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Private Key</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="-----BEGIN PRIVATE KEY-----" {...field} />
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
            Enter the details for your database connection.
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
                <span>{loading ? "Saving..." : "Save Configuration"}</span>
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
