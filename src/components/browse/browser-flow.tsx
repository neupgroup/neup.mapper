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
type Operation = 'select' | 'get' | 'getOne' | 'updateOne';

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
  const [manualApiBasePath, setManualApiBasePath] = useState<string>('');

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
        // Load schemas from localStorage under connection-aware storage
        const saved = localStorage.getItem('collectionSchemasByConnection');
        const parsed = saved ? JSON.parse(saved) : {};
        const perConn = parsed?.[connName ?? 'default'] ?? {};
        setSchemaNames(Object.keys(perConn));
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
    if ((!selectedSchema || selectedSchema === 'undefined') && !collectionName && (operation === 'get' || operation === 'getOne' || operation === 'select' || operation === 'updateOne')) {
      toast({ variant: 'destructive', title: 'Provide a collection or pick a schema.' });
      return;
    }
    let code = 'mapper()';
    if (selectedConnection && selectedConnection !== 'undefined') {
      code += `.useConnection('${selectedConnection}')`;
    }
    if (selectedSchema && selectedSchema !== 'undefined') {
      code += `.useSchema('${selectedSchema}')`;
    } else {
      code += `.collection('${effectiveCollection}')`;
    }
    whereClauses.forEach(c => {
      if (c.field && c.value) {
        const vStr = isNaN(Number(c.value)) ? `'${c.value}'` : c.value;
        code += `.where('${c.field}', '${c.operator}', ${vStr})`;
      }
    });
    if (sortBy && sortBy.field) code += `.sortBy('${sortBy.field}', '${sortBy.direction}')`;
    if (limit !== null && limit > 0) code += `.limit(${limit})`;
    if (offset !== null && offset >= 0) code += `.offset(${offset})`;
    const fieldsToFetch = fields.split(',').map(f => f.trim()).filter(Boolean);
    const fieldsArg = fieldsToFetch.map(f => `'${f}'`).join(', ');
    if (operation === 'select' || operation === 'get') {
      code += `.get(${fieldsArg})`;
    } else if (operation === 'getOne') {
      code += `.getOne(${fieldsArg})`;
    } else if (operation === 'updateOne') {
      code += `.updateOne('${docId}', ${updateJson || '{}'})`;
    }
    // Include manual API base path in generated snippet as comment when undefined + API
    if ((!selectedConnection || selectedConnection === 'undefined') && manualDbType === 'API' && manualApiBasePath) {
      code = `// basePath: ${manualApiBasePath}\n` + code;
    }
    setGeneratedCode(code);
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
      if (operation === 'select' || operation === 'get') {
        const docs = await query.get(...fieldsToFetch);
        setResults(Array.isArray(docs) ? docs : []);
      } else if (operation === 'getOne') {
        const doc = await query.getOne(...fieldsToFetch);
        setResults(doc ? [doc] : []);
      } else if (operation === 'updateOne') {
        const data = updateJson ? JSON.parse(updateJson) : {};
        // update returns void; show success toast, no results
        await query.update(docId, data);
        toast({ title: 'Updated successfully', description: 'The document has been updated.' });
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
      {/* Step 1: Mixed button group for connection::name and schema::name, plus undefineds */}
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
              onClick={() => setSelectedConnection('undefined')}
            >
              connection::undefined
            </Button>
            {/* schema::undefined */}
            <Button
              variant={selectedSchema === 'undefined' ? 'default' : 'outline'}
              onClick={() => setSelectedSchema('undefined')}
            >
              schema::undefined
            </Button>

            {/* connection::name buttons */}
            {connections.map((name) => (
              <Button
                key={`conn-${name}`}
                variant={selectedConnection === name ? 'default' : 'outline'}
                onClick={() => setSelectedConnection(name)}
              >
                {`connection::${name}`}
              </Button>
            ))}

            {/* schema::name buttons */}
            {schemaNames.map((name) => (
              <Button
                key={`schema-${name}`}
                variant={selectedSchema === name ? 'default' : 'outline'}
                onClick={() => setSelectedSchema(name)}
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

      {/* Step 2: Ask details based on selection */}
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
          <CardDescription>Based on your choices above, fill required fields.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* If schema is selected, collection is auto-selected and locked */}
          <div className="flex items-center gap-3">
            <Input
              placeholder="Collection name"
              value={collectionName}
              onChange={(e) => setCollectionName(e.target.value)}
              disabled={!!selectedSchema && selectedSchema !== 'undefined'}
            />
          </div>

          {/* If connection is selected, show its type and API base path (if API) */}
          {selectedConnection && selectedConnection !== 'undefined' && (
            <div className="space-y-2">
              <div className="text-sm">Connection type: <span className="font-medium">{selectedDbType ?? 'Unknown'}</span></div>
              {selectedDbType === 'API' && (
                <Input
                  placeholder="API Base Path"
                  value={manualApiBasePath}
                  onChange={(e) => setManualApiBasePath(e.target.value)}
                />
              )}
            </div>
          )}

          {/* If undefined for both, ask everything: db type, base path for API */}
          {(!selectedConnection || selectedConnection === 'undefined') && (!selectedSchema || selectedSchema === 'undefined') && (
            <div className="space-y-3">
              <div className="text-sm font-medium">No connection or schema selected — provide details:</div>
              <div className="flex items-center gap-3">
                <Select value={manualDbType ?? undefined} onValueChange={(val) => setManualDbType(val as DbType)}>
                  <SelectTrigger className="w-48"><SelectValue placeholder="DB Type" /></SelectTrigger>
                  <SelectContent>
                    {(['Firestore', 'SQL', 'MongoDB', 'API'] as DbType[]).map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {manualDbType === 'API' && (
                  <Input
                    placeholder="API Base Path"
                    value={manualApiBasePath}
                    onChange={(e) => setManualApiBasePath(e.target.value)}
                  />
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 3: Choose operation */}
      <Card>
        <CardHeader>
          <CardTitle>Select Operation</CardTitle>
          <CardDescription>Pick an operation to perform.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {(['select', 'get', 'getOne', 'updateOne'] as Operation[]).map((op) => (
              <Button
                key={op}
                variant={operation === op ? 'default' : 'outline'}
                onClick={() => setOperation(op)}
              >
                {op}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Step 4: Fill form (no connection selection here) */}
      {operation && (
        <Card>
          <CardHeader>
            <CardTitle>Fill Parameters</CardTitle>
            <CardDescription>Provide filters, fields, and options.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(operation === 'select' || operation === 'get' || operation === 'getOne') && (
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

            {/* Step 5: Generate Code */}
            <div className="flex items-center gap-3">
              <Button onClick={handleGenerateCode} variant="secondary">
                <Wand2 className="mr-2 h-4 w-4" /> Generate Code
              </Button>
              {generatedCode && (
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
