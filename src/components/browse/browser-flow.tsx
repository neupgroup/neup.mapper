'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Textarea } from '@/components/ui/textarea';
import { Wand2, Play, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Connection } from '@/lib/orm/query-builder';
import { listConnections, getRuntimeDbConfig } from '@/app/actions';

type DbType = 'Firestore' | 'SQL' | 'MongoDB' | 'API';
type Operation = 'get' | 'getOne' | 'updateOne' | 'deleteOne' | 'add';

type WhereClause = { field: string; operator: '==' | '<' | '>' | '<=' | '>=' | '!='; value: string };
type SortBy = { field: string; direction: 'asc' | 'desc' };

export function BrowserFlow() {
  const { toast } = useToast();
  const [connections, setConnections] = useState<string[]>([]);
  const [selectedConnection, setSelectedConnection] = useState<string | 'undefined' | null>(null);
  const [selectedDbType, setSelectedDbType] = useState<DbType | null>(null);
  const [schemaNames, setSchemaNames] = useState<string[]>([]);
  const [selectedSchema, setSelectedSchema] = useState<string | 'undefined' | null>(null);
  const [operation, setOperation] = useState<Operation | null>(null);
  const [collectionName, setCollectionName] = useState('');
  const [fields, setFields] = useState('');
  const [whereClauses, setWhereClauses] = useState<WhereClause[]>([]);
  const [sortBy, setSortBy] = useState<SortBy | null>(null);
  const [limit, setLimit] = useState<number | null>(null);
  const [offset, setOffset] = useState<number | null>(null);
  const [docId, setDocId] = useState('');
  const [updateJson, setUpdateJson] = useState('');
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<any[]>([]);
  // Manual DB type and API base path when undefined is used
  const [manualDbType, setManualDbType] = useState<DbType | null>(null);
  // API base URL for concrete connections (read-only display)
  const [selectedApiBasePath, setSelectedApiBasePath] = useState<string | null>(null);
  // Manual schema type when schema::undefined is selected
  const [manualSchemaType, setManualSchemaType] = useState<DbType | null>(null);
  // Add JSON for add/addOne operations
  const [addJson, setAddJson] = useState('');
  // Per-connection schema map to load structure
  const [schemaMap, setSchemaMap] = useState<Record<string, any>>({});
  // API-specific controls
  const [apiQueryParams, setApiQueryParams] = useState<{ key: string; value: string }[]>([]);
  const [apiBodyType, setApiBodyType] = useState<'json' | 'form' | 'urlencoded'>('json');
  const [apiUpdateMethod, setApiUpdateMethod] = useState<'PUT' | 'PATCH'>('PUT');

  // Step 1: Load connections
  useEffect(() => {
    (async () => {
      try {
        const names = await listConnections();
        setConnections(names);
      } catch (e) {}
    })();
  }, []);

  // When a connection is selected, determine db type and load its schemas
  useEffect(() => {
    (async () => {
      try {
        let connName: string | undefined = undefined;
        if (selectedConnection && selectedConnection !== 'undefined') connName = selectedConnection;
        // Determine db type of the effective connection (default if undefined)
        const cfg = await getRuntimeDbConfig(connName ?? 'default');
        setSelectedDbType((cfg?.dbType ?? null) as DbType | null);
        setSelectedApiBasePath(cfg?.dbType === 'API' ? (cfg?.basePath ?? null) : null);
        // Load schemas from localStorage under connection-aware storage
        const saved = localStorage.getItem('collectionSchemasByConnection');
        const parsed = saved ? JSON.parse(saved) : {};
        const perConn = parsed?.[connName ?? 'default'] ?? {};
        setSchemaNames(Object.keys(perConn));
        setSchemaMap(perConn);
      } catch (e) {
        setSelectedDbType(null);
        setSchemaNames([]);
      }
    })();
  }, [selectedConnection]);

  // Helpers
  const effectiveCollection = useMemo(() => {
    if (selectedSchema && selectedSchema !== 'undefined') return selectedSchema;
    return collectionName;
  }, [selectedSchema, collectionName]);
  const selectedSchemaStructure = useMemo(() => {
    if (selectedSchema && selectedSchema !== 'undefined') {
      return schemaMap[selectedSchema] ?? null;
    }
    return null;
  }, [selectedSchema, schemaMap]);

  // Whether the current selection implies API behavior
  const isApiSelected = useMemo(() => {
    if (selectedConnection && selectedConnection !== 'undefined') return selectedDbType === 'API';
    if (selectedConnection === 'undefined') return manualDbType === 'API';
    if (selectedSchema === 'undefined') return manualSchemaType === 'API';
    return false;
  }, [selectedConnection, selectedDbType, manualDbType, selectedSchema, manualSchemaType]);

  // Only show operations after required details are provided
  const canShowOperations = useMemo(() => {
    const hasConn = !!selectedConnection;
    const hasSchema = !!selectedSchema;
    if (!hasConn && !hasSchema) return false;

    // If a concrete schema is selected, details are satisfied
    if (selectedSchema && selectedSchema !== 'undefined') return true;
    // If schema::undefined, require schema type
    if (selectedSchema === 'undefined') return !!manualSchemaType;

    // If API is selected, allow operations without collection
    if (isApiSelected) {
      if (selectedConnection && selectedConnection !== 'undefined') return true;
      if (selectedConnection === 'undefined') return !!manualDbType;
      if (selectedSchema && selectedSchema !== 'undefined') return true;
      if (selectedSchema === 'undefined') return !!manualSchemaType;
      return false;
    }

    // Non-API: require collection name for connection-based flows
    if (selectedConnection && selectedConnection !== 'undefined') return collectionName.trim().length > 0;
    if (selectedConnection === 'undefined') return !!manualDbType && collectionName.trim().length > 0;

    return false;
  }, [selectedConnection, selectedSchema, manualDbType, manualSchemaType, collectionName]);

  const addWhereClause = () => setWhereClauses([...whereClauses, { field: '', operator: '==', value: '' }]);
  const updateWhereClause = (index: number, part: Partial<WhereClause>) => {
    const newClauses = [...whereClauses];
    newClauses[index] = { ...newClauses[index], ...part } as WhereClause;
    setWhereClauses(newClauses);
  };
  const removeWhereClause = (index: number) => setWhereClauses(whereClauses.filter((_, i) => i !== index));

  // Step: Generate code based on current state
  const handleGenerateCode = () => {
    setError(null);
    setResults([]);
    if (!operation) {
      toast({ variant: 'destructive', title: 'Select an operation first.' });
      return;
    }
    if (!isApiSelected) {
      const collCheck = (selectedSchema && selectedSchema !== 'undefined') ? selectedSchema : collectionName;
      if (!collCheck) {
        toast({ variant: 'destructive', title: 'Provide a collection or pick a schema.' });
        return;
      }
    }
    // Build snippet reflecting actual runtime QueryBuilder API
    const connArg = selectedConnection && selectedConnection !== 'undefined' ? `'${selectedConnection}'` : '';
    let codeLines: string[] = [];
    // Show imports that callers need for the generated snippet
    codeLines.push(`import { Connection } from '@/lib/orm/query-builder';`);
    codeLines.push('');
    codeLines.push(`const conn = new Connection(${connArg});`);
    if (!isApiSelected) {
      const coll = selectedSchema && selectedSchema !== 'undefined' ? selectedSchema : effectiveCollection;
      codeLines.push(`let q = conn.collection('${coll}');`);
      whereClauses.forEach(c => {
        if (c.field && c.value) {
          const vStr = isNaN(Number(c.value)) ? `'${c.value}'` : c.value;
          codeLines.push(`q = q.where('${c.field}', '${c.operator}', ${vStr});`);
        }
      });
      if (sortBy && sortBy.field) codeLines.push(`q = q.sortBy('${sortBy.field}', '${sortBy.direction}');`);
      if (limit !== null && limit > 0) codeLines.push(`q = q.limit(${limit});`);
      if (offset !== null && offset >= 0) codeLines.push(`q = q.offset(${offset});`);
      const fieldsToFetch = fields.split(',').map(f => f.trim()).filter(Boolean);
      const fieldsArg = fieldsToFetch.map(f => `'${f}'`).join(', ');
      if (operation === 'get') {
        codeLines.push(`const docs = await q.get(${fieldsArg});`);
      } else if (operation === 'getOne') {
        codeLines.push(`const doc = await q.getOne(${fieldsArg});`);
      } else if (operation === 'updateOne') {
        codeLines.push(`await q.update('${docId}', ${updateJson || '{}'});`);
      } else if (operation === 'deleteOne') {
        codeLines.push(`await q.delete('${docId}');`);
      } else if (operation === 'add') {
        codeLines.push(`const id = await q.add(${addJson || '{}'});`);
      }
    } else {
      // API: no collection shown in snippet; show endpoint placeholder for clarity
      codeLines.push(`// API connection: methods map to HTTP requests`);
      codeLines.push(`const endpoint = '<your-endpoint>'; // e.g. '/users'`);
      codeLines.push(`let q = conn.connection(endpoint);`);
      // query params
      if (apiQueryParams.length > 0) {
        const qpObj = apiQueryParams.filter(p => p.key && p.value).reduce((acc, cur) => ({ ...acc, [cur.key]: cur.value }), {} as Record<string,string>);
        codeLines.push(`q = q.queryParams(${JSON.stringify(qpObj)});`);
      }
      // body type for POST/PUT/PATCH
      if (operation === 'add' || operation === 'updateOne') {
        codeLines.push(`q = q.bodyType('${apiBodyType}');`);
      }
      if (operation === 'updateOne' && apiUpdateMethod === 'PATCH') {
        codeLines.push(`q = q.method('PATCH');`);
      }
      if (operation === 'get') {
        codeLines.push(`const docs = await q.get();`);
      } else if (operation === 'add') {
        codeLines.push(`const id = await q.add(${addJson || '{}'});`);
      } else if (operation === 'updateOne') {
        codeLines.push(`await q.update('${docId}', ${updateJson || '{}'});`);
      } else if (operation === 'deleteOne') {
        codeLines.push(`await q.delete('${docId}');`);
      }
    }
    setGeneratedCode(codeLines.join('\n'));
  };

  // Step: Run the code using existing Connection helper
  const handleRun = async () => {
    if (!generatedCode) {
      toast({ variant: 'destructive', title: 'Generate code before running.' });
      return;
    }
    try {
      setLoading(true);
      setError(null);
      setResults([]);
      const connectionName = selectedConnection === 'undefined' ? undefined : selectedConnection ?? undefined;
      const fieldsToFetch = fields.split(',').map(f => f.trim()).filter(Boolean);
      let query = new Connection(connectionName).collection(effectiveCollection);
      whereClauses.forEach(c => {
        if (c.field && c.value) {
          const numericValue = Number(c.value);
          const valueToUse = isNaN(numericValue) ? c.value : numericValue;
          query = query.where(c.field, c.operator, valueToUse);
        }
      });
      if (sortBy && sortBy.field) query = query.sortBy(sortBy.field, sortBy.direction);
      if (limit !== null && limit > 0) query = query.limit(limit);
      if (offset !== null && offset >= 0) query = query.offset(offset);
      if (isApiSelected) {
        if (apiQueryParams.length > 0) {
          const qpObj = apiQueryParams.filter(p => p.key && p.value).reduce((acc, cur) => ({ ...acc, [cur.key]: cur.value }), {} as Record<string,string>);
          query = query.queryParams(qpObj);
        }
        if (operation === 'add' || operation === 'updateOne') {
          query = query.bodyType(apiBodyType);
        }
        if (operation === 'updateOne' && apiUpdateMethod === 'PATCH') {
          query = query.method('PATCH');
        }
      }
      if (operation === 'get') {
        const docs = await query.get(...fieldsToFetch);
        setResults(Array.isArray(docs) ? docs : []);
      } else if (operation === 'getOne') {
        const doc = await query.getOne(...fieldsToFetch);
        setResults(doc ? [doc] : []);
      } else if (operation === 'updateOne') {
        const data = updateJson ? JSON.parse(updateJson) : {};
        await query.update(docId, data);
        toast({ title: 'Updated successfully', description: 'The document has been updated.' });
      } else if (operation === 'deleteOne') {
        await query.delete(docId);
        toast({ title: 'Deleted successfully', description: 'The document has been deleted.' });
      } else if (operation === 'add') {
        const data = addJson ? JSON.parse(addJson) : {};
        const res = await query.add(data);
        setResults(res ? (Array.isArray(res) ? res : [res]) : []);
      }
    } catch (e: any) {
      console.error(e);
      setError(e?.message || 'Error');
      throw e; // as requested: for updates, surface errors
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Step 1: Mixed button group for connection::name and schema::name, plus undefineds (exclusive selection) */}
      <Card>
        <CardHeader>
          <CardTitle>Select From Connections and Schemas</CardTitle>
          <CardDescription>Buttons include connection::name and schema::name; undefined options included.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {/* connection::undefined */}
            <Button
              variant={selectedConnection === 'undefined' ? 'default' : 'outline'}
              onClick={() => { setSelectedConnection('undefined'); setSelectedSchema(null); }}
            >
              connection::undefined
            </Button>
            {/* schema::undefined */}
            <Button
              variant={selectedSchema === 'undefined' ? 'default' : 'outline'}
              onClick={() => { setSelectedSchema('undefined'); setSelectedConnection(null); }}
            >
              schema::undefined
            </Button>

            {/* connection::name buttons */}
            {connections.map((name) => (
              <Button
                key={`conn-${name}`}
                variant={selectedConnection === name ? 'default' : 'outline'}
                onClick={() => { setSelectedConnection(name); setSelectedSchema(null); }}
              >
                {`connection::${name}`}
              </Button>
            ))}

            {/* schema::name buttons */}
            {schemaNames.map((name) => (
              <Button
                key={`schema-${name}`}
                variant={selectedSchema === name ? 'default' : 'outline'}
                onClick={() => { setSelectedSchema(name); setSelectedConnection(null); }}
              >
                {`schema::${name}`}
              </Button>
            ))}
          </div>
          {selectedConnection && (
            <div className="mt-3 text-sm text-muted-foreground">
              Type: <span className="font-medium">{selectedDbType ?? 'Unknown'}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 2: Ask details based on selection and undefined type prompts (only after a selection) */}
      {(selectedConnection !== null || selectedSchema !== null) && (
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
            <CardDescription>Based on your choices above, fill required fields.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
          

          {/* If connection is selected, show its type and API base path (if API) */}
          {selectedConnection && selectedConnection !== 'undefined' && (
            <div className="space-y-2">
              <div className="text-sm">Connection type: <span className="font-medium">{selectedDbType ?? 'Unknown'}</span></div>
              {selectedDbType === 'API' && (
                <div className="text-sm">Base URL: <span className="font-medium">{selectedApiBasePath ?? 'Unknown'}</span></div>
              )}
            </div>
          )}

          {/* If connection::undefined, ask type first using buttons */}
          {selectedConnection === 'undefined' && (
            <div className="space-y-3">
              <div className="text-sm font-medium">Select connection type</div>
              <div className="flex flex-wrap gap-2">
                {(['Firestore', 'SQL', 'MongoDB', 'API'] as DbType[]).map((t) => (
                  <Button key={t} variant={manualDbType === t ? 'default' : 'outline'} onClick={() => setManualDbType(t)}>
                    {`type::${t}`}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* If schema::undefined, ask type first using buttons and show a warning */}
          {selectedSchema === 'undefined' && (
            <div className="space-y-3">
              <div className="text-sm font-medium">Select schema type</div>
              <div className="flex flex-wrap gap-2">
                {(['Firestore', 'SQL', 'MongoDB', 'API'] as DbType[]).map((t) => (
                  <Button key={t} variant={manualSchemaType === t ? 'default' : 'outline'} onClick={() => setManualSchemaType(t)}>
                    {`type::${t}`}
                  </Button>
                ))}
              </div>
              <div className="text-sm text-amber-600">Warning: You must comply with your schema to perform operations in real production settings.</div>
            </div>
          )}

            {/* Show collection input below type selection when applicable (not for API) */}
            {selectedSchema === null && !isApiSelected && (
              (selectedConnection && selectedConnection !== 'undefined') ||
              (selectedConnection === 'undefined' && !!manualDbType)
            ) && (
              <div className="space-y-2">
                <div className="text-sm font-medium">Collection</div>
                <Input
                  placeholder="Collection name"
                  value={collectionName}
                  onChange={(e) => setCollectionName(e.target.value)}
                />
              </div>
            )}

            {/* Show schema structure when a schema is selected */}
            {selectedSchemaStructure && (
              <Accordion type="single" collapsible>
                <AccordionItem value="schema-structure">
                  <AccordionTrigger>Loaded Schema Structure</AccordionTrigger>
                  <AccordionContent>
                    <pre className="rounded-md border bg-muted p-3 text-xs overflow-auto"><code>{JSON.stringify(selectedSchemaStructure, null, 2)}</code></pre>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3: Choose operation (shown only after details are provided) */}
      {canShowOperations && (
        <Card>
          <CardHeader>
            <CardTitle>Select Operation</CardTitle>
            <CardDescription>{isApiSelected ? 'HTTP requests' : 'Data operations'}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {isApiSelected ? (
                <>
                  <Button variant={operation === 'get' ? 'default' : 'outline'} onClick={() => setOperation('get')}>GET</Button>
                  <Button variant={operation === 'add' ? 'default' : 'outline'} onClick={() => setOperation('add')}>POST</Button>
                  <Button variant={operation === 'updateOne' ? 'default' : 'outline'} onClick={() => setOperation('updateOne')}>PUT</Button>
                  <Button variant={operation === 'deleteOne' ? 'default' : 'outline'} onClick={() => setOperation('deleteOne')}>DELETE</Button>
                </>
              ) : (
                (['get', 'getOne', 'updateOne', 'deleteOne', 'add'] as Operation[]).map((op) => (
                  <Button
                    key={op}
                    variant={operation === op ? 'default' : 'outline'}
                    onClick={() => setOperation(op)}
                  >
                    {op}
                  </Button>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Fill form (no connection selection here) */}
      {operation && (
        <Card>
          <CardHeader>
            <CardTitle>Fill Parameters</CardTitle>
            <CardDescription>{isApiSelected ? 'Provide request inputs when required.' : 'Provide filters, fields, and options.'}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(operation === 'get' || operation === 'getOne') && !isApiSelected && (
              <>
                <Input
                  placeholder="Fields to fetch (comma-separated)"
                  value={fields}
                  onChange={(e) => setFields(e.target.value)}
                />
                <Accordion type="single" collapsible>
                  <AccordionItem value="where">
                    <AccordionTrigger>Where Clauses</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3">
                        {whereClauses.map((c, i) => (
                          <div key={i} className="flex gap-2">
                            <Input
                              placeholder="field"
                              value={c.field}
                              onChange={(e) => updateWhereClause(i, { field: e.target.value })}
                            />
                            <Select value={c.operator} onValueChange={(val) => updateWhereClause(i, { operator: val as any })}>
                              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {['==', '!=', '<', '>', '<=', '>='].map((op) => (
                                  <SelectItem key={op} value={op}>{op}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Input
                              placeholder="value"
                              value={c.value}
                              onChange={(e) => updateWhereClause(i, { value: e.target.value })}
                            />
                            <Button variant="ghost" onClick={() => removeWhereClause(i)}>Remove</Button>
                          </div>
                        ))}
                        <Button variant="outline" onClick={addWhereClause}>Add Where</Button>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
                <div className="flex gap-2">
                  <Input placeholder="Sort field" value={sortBy?.field ?? ''} onChange={(e) => setSortBy({ field: e.target.value, direction: sortBy?.direction ?? 'asc' })} />
                  <Select value={sortBy?.direction ?? 'asc'} onValueChange={(val) => setSortBy({ field: sortBy?.field ?? '', direction: val as any })}>
                    <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asc">asc</SelectItem>
                      <SelectItem value="desc">desc</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Input placeholder="Limit" value={limit ?? ''} onChange={(e) => setLimit(e.target.value ? Number(e.target.value) : null)} />
                  <Input placeholder="Offset" value={offset ?? ''} onChange={(e) => setOffset(e.target.value ? Number(e.target.value) : null)} />
                </div>
              </>
            )}

            {operation === 'updateOne' && (
              <>
                <Input placeholder="Document ID" value={docId} onChange={(e) => setDocId(e.target.value)} />
                <Textarea placeholder="Update JSON" value={updateJson} onChange={(e) => setUpdateJson(e.target.value)} />
              </>
            )}

            {(operation === 'deleteOne') && (
              <Input placeholder="Document ID" value={docId} onChange={(e) => setDocId(e.target.value)} />
            )}

            {operation === 'add' && (
              <Textarea placeholder="Add JSON" value={addJson} onChange={(e) => setAddJson(e.target.value)} />
            )}

            {/* API-specific parameter editors */}
            {isApiSelected && (
              <div className="space-y-4">
                {(operation === 'get' || operation === 'deleteOne' || operation === 'add' || operation === 'updateOne') && (
                  <div>
                    <div className="text-sm font-medium mb-2">Query Parameters</div>
                    <div className="space-y-2">
                      {apiQueryParams.map((p, i) => (
                        <div key={i} className="flex gap-2">
                          <Input placeholder="key" value={p.key} onChange={(e) => {
                            const next = [...apiQueryParams]; next[i] = { ...next[i], key: e.target.value }; setApiQueryParams(next);
                          }} />
                          <Input placeholder="value" value={p.value} onChange={(e) => {
                            const next = [...apiQueryParams]; next[i] = { ...next[i], value: e.target.value }; setApiQueryParams(next);
                          }} />
                          <Button variant="ghost" onClick={() => setApiQueryParams(apiQueryParams.filter((_, idx) => idx !== i))}>Remove</Button>
                        </div>
                      ))}
                      <Button variant="outline" onClick={() => setApiQueryParams([...apiQueryParams, { key: '', value: '' }])}>Add Parameter</Button>
                    </div>
                  </div>
                )}
                {(operation === 'add' || operation === 'updateOne') && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Body Type</div>
                    <div className="flex flex-wrap gap-2">
                      {(['json', 'form', 'urlencoded'] as const).map(bt => (
                        <Button key={bt} variant={apiBodyType === bt ? 'default' : 'outline'} onClick={() => setApiBodyType(bt)}>
                          {bt}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
                {operation === 'updateOne' && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Update Method</div>
                    <div className="flex flex-wrap gap-2">
                      {(['PUT', 'PATCH'] as const).map(m => (
                        <Button key={m} variant={apiUpdateMethod === m ? 'default' : 'outline'} onClick={() => setApiUpdateMethod(m)}>
                          {m}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 5: Generate Code */}
            <div className="flex items-center gap-3">
              <Button onClick={handleGenerateCode} variant="secondary">
                <Wand2 className="mr-2 h-4 w-4" /> Generate Code
              </Button>
              {/* Hide Run when connection::undefined or schema::undefined */}
              {generatedCode && !(selectedConnection === 'undefined' || selectedSchema === 'undefined') && (
                <Button onClick={handleRun} disabled={loading}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                  Run Code
                </Button>
              )}
            </div>

            {generatedCode && (
              <pre className="mt-3 rounded-md border bg-muted p-3 text-xs"><code>{generatedCode}</code></pre>
            )}

            {/* Step 6: Results or Errors */}
            {error && <div className="text-sm text-destructive">{error}</div>}
            {results.length > 0 && (
              <div className="space-y-2">
                {results.map((r, idx) => (
                  <pre key={idx} className="rounded-md border bg-muted p-3 text-xs overflow-auto"><code>{JSON.stringify(r, null, 2)}</code></pre>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
