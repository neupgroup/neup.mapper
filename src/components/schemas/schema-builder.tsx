'use client';

import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useForm, useFieldArray } from 'react-hook-form';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, PlusCircle, Save, Trash2, Download, Terminal } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { listConnections, getRuntimeDbConfig } from '@/app/actions';

type ConnectionInfo = { name: string; dbType: string };

const fieldSchema = z.object({
  fieldName: z.string().min(1),
  fieldType: z.enum(['string', 'number', 'boolean', 'array', 'object', 'int', 'enum']),
  unique: z.boolean().optional(),
  indexed: z.boolean().optional(),
  nullable: z.boolean().optional(),
  length: z.number().int().positive().optional(),
  enumOptions: z.array(z.string()).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
});

const schemaFormSchema = z.object({
  collectionName: z.string().min(1),
  allowExtraKeyValue: z.boolean().optional(),
  fields: z.array(fieldSchema).min(1),
  apiEndpoint: z.string().optional(),
  apiUrlParamsCsv: z.string().optional(),
  apiRequestSchema: z.string().optional(),
  apiResponseSuccessSchema: z.string().optional(),
  apiResponseErrorSchema: z.string().optional(),
});

type SchemaFormValues = z.infer<typeof schemaFormSchema>;

export function SchemaBuilder() {
  const [connections, setConnections] = useState<ConnectionInfo[]>([]);
  const [selectedConnectionName, setSelectedConnectionName] = useState('');
  const [selectedDbType, setSelectedDbType] = useState('');
  const [schemas, setSchemas] = useState<Record<string, SchemaFormValues>>({});
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      try {
        const names = await listConnections();
        const infos: ConnectionInfo[] = [];
        for (const n of names) {
          try {
            const cfg = await getRuntimeDbConfig(n);
            if (cfg && cfg.dbType) infos.push({ name: n, dbType: cfg.dbType });
          } catch {}
        }
        setConnections(infos);
      } catch (e) {
        console.error('Failed to list connections', e);
      }
    })();
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('collectionSchemasByConnection');
      const parsed = saved ? JSON.parse(saved) : {};
      setSchemas(parsed?.[selectedConnectionName] ?? {});
    } catch {}
  }, [selectedConnectionName]);

  const form = useForm<SchemaFormValues>({
    resolver: zodResolver(schemaFormSchema),
    defaultValues: {
      collectionName: '',
      allowExtraKeyValue: false,
      fields: [{ fieldName: '', fieldType: 'string', unique: false, indexed: false, nullable: true }],
      apiEndpoint: '',
      apiUrlParamsCsv: '',
      apiRequestSchema: '',
      apiResponseSuccessSchema: '',
      apiResponseErrorSchema: '',
    },
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'fields' });

  const onSubmit = (values: SchemaFormValues) => {
    setSaving(true);
    try {
      const saved = localStorage.getItem('collectionSchemasByConnection');
      const parsed = saved ? JSON.parse(saved) : {};
      parsed[selectedConnectionName] = { ...(parsed[selectedConnectionName] || {}), [values.collectionName]: values };
      localStorage.setItem('collectionSchemasByConnection', JSON.stringify(parsed));
      setSchemas(parsed[selectedConnectionName]);
      toast({ title: 'Schema saved', description: `Saved for ${selectedConnectionName}` });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Failed to save schema' });
    } finally {
      setSaving(false);
    }
  };

  const loadSchema = (name: string) => {
    const s = schemas[name];
    if (!s) return;
    form.reset(s);
  };

  const deleteSchema = (name: string) => {
    const ok = confirm(`Delete schema "${name}" from ${selectedConnectionName}?`);
    if (!ok) return;
    try {
      const saved = localStorage.getItem('collectionSchemasByConnection');
      const parsed = saved ? JSON.parse(saved) : {};
      if (parsed[selectedConnectionName]) {
        delete parsed[selectedConnectionName][name];
        localStorage.setItem('collectionSchemasByConnection', JSON.stringify(parsed));
        setSchemas(parsed[selectedConnectionName] || {});
      }
      toast({ title: 'Schema deleted', description: name });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Failed to delete schema' });
    }
  };

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

  const selectedConn = connections.find(c => c.name === selectedConnectionName);

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

      {!selectedConnectionName && connections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Define a Schema</CardTitle>
            <CardDescription>Select a connection above to start building your schema.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Schema creation is disabled until you choose an active connection.</p>
          </CardContent>
        </Card>
      )}

      {selectedConnectionName && (
        <Card>
          <CardHeader>
            <CardTitle>Define a Schema</CardTitle>
            <CardDescription>
              {selectedDbType === 'SQL' ? 'Provide a table name, fields, and constraints.' : selectedDbType === 'API' ? 'Define endpoint, URL params, and request/response schemas.' : 'Provide a collection name and fields. Optionally allow extra key-values.'}
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
                      <FormLabel>{selectedDbType === 'SQL' ? 'Table Name' : selectedDbType === 'API' ? 'Resource Name' : 'Collection Name'}</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., users, products" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {selectedDbType !== 'SQL' && selectedDbType !== 'API' && (
                  <FormField
                    control={form.control}
                    name="allowExtraKeyValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Allow extra key-value fields</FormLabel>
                        <FormControl>
                          <Input type="checkbox" checked={!!field.value} onChange={(e) => field.onChange(e.target.checked)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <div>
                  <FormLabel>Fields</FormLabel>
                  <div className="space-y-4 pt-2">
                    {fields.map((f, index) => (
                      <div key={f.id} className="flex flex-wrap items-start gap-2 rounded-lg border p-3">
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
                                  <SelectItem value="int">Int (SQL)</SelectItem>
                                  <SelectItem value="enum">Enum (SQL)</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {selectedDbType === 'SQL' && (
                          <div className="w-full grid gap-2 sm:grid-cols-3">
                            <FormField control={form.control} name={`fields.${index}.unique`} render={({ field }) => (
                              <FormItem>
                                <FormLabel>Unique</FormLabel>
                                <FormControl>
                                  <Input type="checkbox" checked={!!field.value} onChange={(e) => field.onChange(e.target.checked)} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                            <FormField control={form.control} name={`fields.${index}.indexed`} render={({ field }) => (
                              <FormItem>
                                <FormLabel>Indexed</FormLabel>
                                <FormControl>
                                  <Input type="checkbox" checked={!!field.value} onChange={(e) => field.onChange(e.target.checked)} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                            <FormField control={form.control} name={`fields.${index}.nullable`} render={({ field }) => (
                              <FormItem>
                                <FormLabel>Nullable</FormLabel>
                                <FormControl>
                                  <Input type="checkbox" checked={field.value !== false} onChange={(e) => field.onChange(e.target.checked)} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                            <FormField control={form.control} name={`fields.${index}.length`} render={({ field }) => (
                              <FormItem>
                                <FormLabel>Length (string)</FormLabel>
                                <FormControl>
                                  <Input type="number" min={1} placeholder="e.g., 255" value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                            <FormField control={form.control} name={`fields.${index}.enumOptions`} render={({ field }) => (
                              <FormItem className="sm:col-span-2">
                                <FormLabel>Enum Options (comma-separated)</FormLabel>
                                <FormControl>
                                  <Input placeholder="e.g., pending,active,archived" value={(field.value || []).join(',')} onChange={(e) => field.onChange(e.target.value.split(',').map(s => s.trim()).filter(Boolean))} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                            <FormField control={form.control} name={`fields.${index}.min`} render={({ field }) => (
                              <FormItem>
                                <FormLabel>Min</FormLabel>
                                <FormControl>
                                  <Input type="number" placeholder="e.g., 0" value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                            <FormField control={form.control} name={`fields.${index}.max`} render={({ field }) => (
                              <FormItem>
                                <FormLabel>Max</FormLabel>
                                <FormControl>
                                  <Input type="number" placeholder="e.g., 100" value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                          </div>
                        )}

                        <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)} disabled={fields.length <= 1}>
                          <Trash2 />
                        </Button>
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => append({ fieldName: '', fieldType: 'string' })}>
                      <PlusCircle className="mr-2 h-4 w-4" /> Add Field
                    </Button>
                  </div>
                </div>

                {selectedDbType === 'API' && (
                  <div className="space-y-4 pt-4">
                    <h3 className="text-lg font-medium">API Schema</h3>
                    <FormField control={form.control} name="apiEndpoint" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Endpoint Path</FormLabel>
                        <FormControl><Input placeholder="/products or /products/{id}" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="apiUrlParamsCsv" render={({ field }) => (
                      <FormItem>
                        <FormLabel>URL Params (comma-separated)</FormLabel>
                        <FormControl><Input placeholder="e.g., id, lang" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <div className="grid gap-4 md:grid-cols-3">
                      <FormField control={form.control} name="apiRequestSchema" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Request Schema (JSON)</FormLabel>
                          <FormControl><Textarea rows={8} placeholder='{"name":"string","price":"number"}' {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="apiResponseSuccessSchema" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Response (Success) Schema (JSON)</FormLabel>
                          <FormControl><Textarea rows={8} placeholder='{"data":[]}' {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="apiResponseErrorSchema" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Response (Error) Schema (JSON)</FormLabel>
                          <FormControl><Textarea rows={8} placeholder='{"error":{"code":"string","message":"string"}}' {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  </div>
                )}

                <Button type="submit" disabled={saving || !selectedConnectionName} className="w-full sm:w-auto">
                  {saving ? <Loader2 className="animate-spin" /> : <Save />}
                  <span>{saving ? 'Saving...' : 'Save Schema'}</span>
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

