
'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Save, Trash2, Download } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Terminal } from 'lucide-react';
import { listConnections, getRuntimeDbConfig } from '@/app/actions';

const fieldSchema = z.object({
  fieldName: z.string().min(1, 'Field name is required.'),
  fieldType: z.enum(['string', 'number', 'boolean', 'array', 'object']),
});

const schemaFormSchema = z.object({
  collectionName: z.string().min(1, 'Collection name is required.'),
  fields: z.array(fieldSchema).min(1, 'At least one field is required.'),
  // API specific fields
  getEndpoint: z.string().optional(),
  createEndpoint: z.string().optional(),
  updateEndpoint: z.string().optional(),
  deleteEndpoint: z.string().optional(),
});

type SchemaFormValues = z.infer<typeof schemaFormSchema>;

type ConnectionInfo = { name: string; dbType: string };

export function SchemaBuilder() {
  const [loading, setLoading] = useState(false);
  const [connections, setConnections] = useState<ConnectionInfo[]>([]);
  const [selectedConnectionName, setSelectedConnectionName] = useState<string>('');
  const [selectedDbType, setSelectedDbType] = useState<string>('');
  const [schemas, setSchemas] = useState<Record<string, SchemaFormValues>>({});
  const { toast } = useToast();

  // Load configured connections and their types
  useEffect(() => {
    (async () => {
      try {
        const names = await listConnections();
        const infos: ConnectionInfo[] = [];
        for (const n of names) {
          try {
            const cfg = await getRuntimeDbConfig(n);
            if (cfg && cfg.dbType) {
              infos.push({ name: n, dbType: cfg.dbType });
            }
          } catch {
            // skip broken config
          }
        }
        setConnections(infos);
        // Prefer default if available, else first
        const defaultConn = infos.find(i => i.name === 'default') ?? infos[0];
        if (defaultConn) {
          setSelectedConnectionName(defaultConn.name);
          setSelectedDbType(defaultConn.dbType);
        }
      } catch (error) {
        console.error('Failed to load connections', error);
      }
    })();
  }, []);

  // Load schemas for selected connection
  useEffect(() => {
    try {
      const saved = localStorage.getItem('collectionSchemasByConnection');
      const parsed = saved ? JSON.parse(saved) : {};
      const perConn = parsed?.[selectedConnectionName] ?? {};
      setSchemas(perConn);
    } catch (e) {
      console.error('Failed to load schemas for connection', e);
    }
  }, [selectedConnectionName]);

  const form = useForm<SchemaFormValues>({
    resolver: zodResolver(schemaFormSchema),
    defaultValues: {
      collectionName: '',
      fields: [{ fieldName: '', fieldType: 'string' }],
      getEndpoint: '',
      createEndpoint: '',
      updateEndpoint: '',
      deleteEndpoint: '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'fields',
  });

  const onSubmit = (values: SchemaFormValues) => {
    setLoading(true);
    try {
      if (!selectedConnectionName) {
        toast({ variant: 'destructive', title: 'Select a connection before saving.' });
        return;
      }
      const newSchemas = { ...schemas, [values.collectionName]: values };
      // Save under connection-aware storage
      const saved = localStorage.getItem('collectionSchemasByConnection');
      const parsed = saved ? JSON.parse(saved) : {};
      parsed[selectedConnectionName] = newSchemas;
      localStorage.setItem('collectionSchemasByConnection', JSON.stringify(parsed));
      setSchemas(newSchemas);
      toast({
        title: 'Schema Saved',
        description: `Schema for "${values.collectionName}" saved under connection "${selectedConnectionName}".`,
      });
    } catch (error) {
      console.error('Error saving schema:', error);
      toast({
        variant: 'destructive',
        title: 'An error occurred',
        description: 'Failed to save schema. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSchema = (collectionName: string) => {
    const schema = schemas[collectionName];
    if (schema) {
      form.reset(schema);
    }
  };
  
  const deleteSchema = (collectionName: string) => {
    if (window.confirm(`Are you sure you want to delete the schema for "${collectionName}"?`)) {
      const newSchemas = { ...schemas };
      delete newSchemas[collectionName];
      // Update connection-aware storage
      const saved = localStorage.getItem('collectionSchemasByConnection');
      const parsed = saved ? JSON.parse(saved) : {};
      if (selectedConnectionName) {
        parsed[selectedConnectionName] = newSchemas;
        localStorage.setItem('collectionSchemasByConnection', JSON.stringify(parsed));
      }
      setSchemas(newSchemas);
      form.reset({
        collectionName: '',
        fields: [{ fieldName: '', fieldType: 'string' }],
        getEndpoint: '',
        createEndpoint: '',
        updateEndpoint: '',
        deleteEndpoint: '',
      });
      toast({
        title: 'Schema Deleted',
        description: `Schema for "${collectionName}" deleted from connection "${selectedConnectionName}".`,
      });
    }
  };

  const renderApiEndpoints = () => {
    if (selectedDbType !== 'API') {
      return null;
    }
    return (
        <div className="space-y-4 pt-4">
            <h3 className="text-lg font-medium">API Endpoints</h3>
            <FormField
              control={form.control}
              name="getEndpoint"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>GET Endpoint</FormLabel>
                  <FormControl>
                    <Input placeholder="/items or /items/{id}" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="createEndpoint"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CREATE (POST) Endpoint</FormLabel>
                  <FormControl>
                    <Input placeholder="/items" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="updateEndpoint"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>UPDATE (PUT/PATCH) Endpoint</FormLabel>
                  <FormControl>
                    <Input placeholder="/items/{id}" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="deleteEndpoint"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>DELETE Endpoint</FormLabel>
                  <FormControl>
                    <Input placeholder="/items/{id}" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
        </div>
    )
  }

  const handleDownloadSchemas = () => {
    try {
      const blob = new Blob([JSON.stringify(schemas, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `schemas.${selectedConnectionName || 'unnamed'}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Failed to download schemas' });
    }
  };

  const selectedConn: ConnectionInfo | undefined = connections.find(c => c.name === selectedConnectionName);

  return (
    <div className="space-y-8">
      {connections.length === 0 && (
        <Alert>
          <Terminal className="h-4 w-4" />
          <AlertTitle>Database Not Configured</AlertTitle>
          <AlertDescription>
            Please go to the <a href="/configure" className="font-bold underline">Configure</a> page to set up your database connection first.
          </AlertDescription>
        </Alert>
      )}

      {/* Connection selector */}
      {connections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Active Connection</CardTitle>
            <CardDescription>Select which configured connection to attach schemas to.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <div className="w-full sm:w-64">
              <Select
                value={selectedConnectionName}
                onValueChange={(val) => {
                  setSelectedConnectionName(val);
                  const info = connections.find(c => c.name === val);
                  setSelectedDbType(info?.dbType || '');
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select connection" />
                </SelectTrigger>
                <SelectContent>
                  {connections.map((c) => (
                    <SelectItem key={c.name} value={c.name}>
                      {c.name} ({c.dbType})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedConn && (
              <div className="text-sm text-muted-foreground">Using: <span className="font-medium">{selectedConn.name}</span> · Type: <span className="font-medium">{selectedConn.dbType}</span></div>
            )}
          </CardContent>
        </Card>
      )}

      {Object.keys(schemas).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Existing Schemas</CardTitle>
            <CardDescription>Load or delete an existing schema for the active connection.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-3 flex flex-wrap gap-2">
              {Object.keys(schemas).map(name => (
                <div key={name} className="flex items-center gap-1 rounded-full border bg-muted/50 pl-3">
                  <span className="text-sm font-medium">{name}</span>
                  <Button variant="ghost" size="sm" onClick={() => loadSchema(name)}>Load</Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteSchema(name)}>
                    <Trash2 className="h-4 w-4 text-destructive"/>
                  </Button>
                </div>
              ))}
            </div>
            <Button variant="outline" onClick={handleDownloadSchemas} disabled={!selectedConnectionName}>
              <Download className="mr-2 h-4 w-4"/>
              Download Schemas JSON
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Define a Schema</CardTitle>
          <CardDescription>
            Specify the collection name and its fields.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="collectionName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Collection Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., users, products" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div>
                <FormLabel>Fields</FormLabel>
                <div className="space-y-4 pt-2">
                  {fields.map((field, index) => (
                    <div key={field.id} className="flex flex-wrap items-start gap-2 rounded-lg border p-3">
                      <FormField
                        control={form.control}
                        name={`fields.${index}.fieldName`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormControl>
                              <Input placeholder="Field Name" {...field} />
                            </FormControl>
                             <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`fields.${index}.fieldType`}
                        render={({ field }) => (
                          <FormItem className="w-full sm:w-48">
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="string">String</SelectItem>
                                <SelectItem value="number">Number</SelectItem>
                                <SelectItem value="boolean">Boolean</SelectItem>
                                <SelectItem value="array">Array</SelectItem>
                                <SelectItem value="object">Object</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        onClick={() => remove(index)}
                        disabled={fields.length <= 1}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={() => append({ fieldName: '', fieldType: 'string' })}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Field
                  </Button>
                </div>
              </div>

              {renderApiEndpoints()}

              <Button type="submit" disabled={loading || !selectedConnectionName} className="w-full sm:w-auto">
                {loading ? <Loader2 className="animate-spin" /> : <Save />}
                <span>{loading ? 'Saving...' : 'Save Schema'}</span>
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
