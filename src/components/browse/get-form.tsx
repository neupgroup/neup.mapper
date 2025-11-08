
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Search, PlusCircle, XCircle, Pencil, Trash2, Play, Wand2 } from 'lucide-react';
import { Connection } from '@/lib/orm/query-builder';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { listConnections } from '@/app/actions';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Textarea } from '@/components/ui/textarea';


type WhereClause = {
  field: string;
  operator: '==' | '<' | '>' | '<=' | '>=' | '!=';
  value: string;
};

type SortBy = {
  field: string;
  direction: 'asc' | 'desc';
};

type Nouns = { container: string; item: string; itemPlural: string };

export function GetForm({ nouns }: { nouns?: Nouns }) {
  const container = nouns?.container ?? 'collection';
  const item = nouns?.item ?? 'document';
  const itemPlural = nouns?.itemPlural ?? 'documents';
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const [collectionName, setCollectionName] = useState('');
  const [fields, setFields] = useState('');
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const [limit, setLimit] = useState<number | null>(null);
  const [offset, setOffset] = useState<number | null>(null);
  const [whereClauses, setWhereClauses] = useState<WhereClause[]>([]);
  const [sortBy, setSortBy] = useState<SortBy | null>(null);
  
  const [isEditDialogOpen, setEditDialogOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<any>(null);
  const [editingDocContent, setEditingDocContent] = useState('');

  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [connectionName, setConnectionName] = useState<string>('default');
  const [availableConnections, setAvailableConnections] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const names = await listConnections();
        setAvailableConnections(names);
        if (names.includes('default')) setConnectionName('default');
      } catch {}
    })();
  }, []);

  const handleGenerateCode = () => {
    if (!collectionName) {
      toast({
        variant: 'destructive',
        title: `${cap(container)} Name Required`,
        description: `Please enter a ${container} name to generate code.`,
      });
      return;
    }

    let code = connectionName && connectionName !== 'default'
      ? `new Connection('${connectionName}').collection('${collectionName}')`
      : `new Connection().collection('${collectionName}')`;

    whereClauses.forEach(clause => {
      if (clause.field && clause.value) {
        const valueStr = isNaN(Number(clause.value)) ? `'${clause.value}'` : clause.value;
        code += `.where('${clause.field}', '${clause.operator}', ${valueStr})`;
      }
    });

    if (sortBy && sortBy.field) {
      code += `.sortBy('${sortBy.field}', '${sortBy.direction}')`;
    }
    
    if (limit !== null && limit > 0) {
      code += `.limit(${limit})`;
    }

    if (offset !== null && offset >= 0) {
      code += `.offset(${offset})`;
    }

    const fieldsToFetch = fields.split(',').map(f => f.trim()).filter(f => f);
    const fieldsArg = fieldsToFetch.map(f => `'${f}'`).join(', ');

    code += `.getDocuments(${fieldsArg})`;

    setGeneratedCode(code);
    setDocuments([]);
    setError(null);
  };

  const handleFetch = async () => {
    setLoading(true);
    setError(null);
    setDocuments([]);
    try {
      let query = new Connection(connectionName && connectionName !== 'default' ? connectionName : undefined).collection(collectionName);
      
      whereClauses.forEach(clause => {
        if (clause.field && clause.value) {
            const numericValue = Number(clause.value);
            const valueToUse = isNaN(numericValue) ? clause.value : numericValue;
            query = query.where(clause.field, clause.operator, valueToUse);
        }
      });

      if (sortBy && sortBy.field) {
        query = query.sortBy(sortBy.field, sortBy.direction);
      }

      if (limit !== null && limit > 0) {
        query = query.limit(limit);
      }
      
      if (offset !== null && offset >= 0) {
        query = query.offset(offset);
      }

      const fieldsToFetch = fields.split(',').map(f => f.trim()).filter(f => f);
      const docs = await query.getDocuments(...fieldsToFetch);

      setDocuments(docs);
      if (docs.length === 0) {
        toast({
            title: `No ${cap(itemPlural)} Found`,
            description: `Your query on '${collectionName}' returned no ${itemPlural}.`,
        });
      }
    } catch (e: any) {
      console.error(e);
      setError(e.message);
      toast({
        variant: 'destructive',
        title: 'An Error Occurred',
        description: e.message || 'Failed to fetch documents.',
      });
    } finally {
      setLoading(false);
    }
  };
  
  const addWhereClause = () => {
    setWhereClauses([...whereClauses, { field: '', operator: '==', value: '' }]);
  };

  const updateWhereClause = (index: number, part: Partial<WhereClause>) => {
    const newClauses = [...whereClauses];
    newClauses[index] = { ...newClauses[index], ...part };
    setWhereClauses(newClauses);
  };
  
  const removeWhereClause = (index: number) => {
    setWhereClauses(whereClauses.filter((_, i) => i !== index));
  };

  const openEditDialog = (doc: any) => {
    setEditingDoc(doc);
    const { id, ...data } = doc;
    setEditingDocContent(JSON.stringify(data, null, 2));
    setEditDialogOpen(true);
  };
  
  const handleUpdateDocument = async () => {
    if (!collectionName || !editingDoc?.id) return;
    try {
      const docData = JSON.parse(editingDocContent);
      setLoading(true);
      await new Connection().collection(collectionName).update(editingDoc.id, docData);
      toast({ title: `${cap(item)} Updated`, description: `The ${item} has been updated successfully.` });
      setEditDialogOpen(false);
      await handleFetch(); // Refresh list
    } catch (e: any) {
      console.error("Update error:", e);
      toast({ variant: "destructive", title: `Failed to update ${item}`, description: e.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!collectionName || !docId) return;
    if (!confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
        return;
    }
    try {
        setLoading(true);
        await new Connection().collection(collectionName).delete(docId);
        toast({ title: `${cap(item)} Deleted`, description: `The ${item} has been deleted successfully.` });
        await handleFetch(); // Refresh list
    } catch (e: any) {
        console.error("Delete error:", e);
        toast({ variant: "destructive", title: `Failed to delete ${item}`, description: e.message });
    } finally {
        setLoading(false);
    }
  };

  return (
    <>
        <Card>
            <CardHeader>
            <CardTitle>Build Your Query</CardTitle>
            <CardDescription>
                Enter a {container} name and add conditions to generate the query code.
            </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col space-y-2">
                <label className="text-sm font-medium">Connection</label>
                <Select value={connectionName} onValueChange={setConnectionName}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select connection" />
                  </SelectTrigger>
                  <SelectContent>
                    {['default', ...availableConnections.filter(n => n !== 'default')].map((name) => (
                      <SelectItem key={name} value={name}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col space-y-2">
                    <label htmlFor="collection-name" className="text-sm font-medium">{cap(container)} Name</label>
                    <Input
                        id="collection-name"
                        type="text"
                        placeholder="e.g., users"
                        value={collectionName}
                        onChange={(e) => setCollectionName(e.target.value)}
                    />
                </div>
                    <div className="flex flex-col space-y-2">
                    <label htmlFor="fields" className="text-sm font-medium">Fields (comma-separated)</label>
                    <Input
                        id="fields"
                        type="text"
                        placeholder="e.g., name, email (optional)"
                        value={fields}
                        onChange={(e) => setFields(e.target.value)}
                    />
                </div>
            </div>
            
            <div className="space-y-4 pt-4">
                <h3 className="text-md font-medium">Query Parameters</h3>
                <div className="space-y-2">
                    {whereClauses.map((clause, index) => (
                    <div key={index} className="flex flex-wrap items-center gap-2 p-2 border rounded-lg">
                        <Input placeholder="Field" value={clause.field} onChange={e => updateWhereClause(index, { field: e.target.value })} className="w-full sm:w-1/3"/>
                        <Select value={clause.operator} onValueChange={(op: WhereClause['operator']) => updateWhereClause(index, { operator: op })}>
                            <SelectTrigger className="w-full sm:w-auto">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="==">==</SelectItem>
                                <SelectItem value="!=">!=</SelectItem>
                                <SelectItem value=">">&gt;</SelectItem>
                                <SelectItem value="<">&lt;</SelectItem>
                                <SelectItem value=">=">&gt;=</SelectItem>
                                <SelectItem value="<=">&lt;=</SelectItem>
                            </SelectContent>
                        </Select>
                        <Input placeholder="Value" value={clause.value} onChange={e => updateWhereClause(index, { value: e.target.value })} className="w-full sm:w-1/3" />
                        <Button variant="ghost" size="icon" onClick={() => removeWhereClause(index)}>
                            <XCircle className="text-destructive" />
                        </Button>
                    </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={addWhereClause}><PlusCircle className="mr-2 h-4 w-4"/> Add Condition</Button>
                </div>
                
                <div className="flex flex-wrap items-center gap-2">
                    <Input placeholder="Sort by Field" value={sortBy?.field || ''} onChange={e => setSortBy({ ...sortBy, field: e.target.value, direction: sortBy?.direction || 'asc'})} className="w-full sm:w-1/2"/>
                    <Select value={sortBy?.direction || 'asc'} onValueChange={(dir: 'asc' | 'desc') => setSortBy({ ...sortBy, field: sortBy?.field || '', direction: dir })}>
                        <SelectTrigger className="w-full sm:w-auto">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="asc">Ascending</SelectItem>
                            <SelectItem value="desc">Descending</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <Input type="number" placeholder="Limit" onChange={e => setLimit(e.target.value ? Number(e.target.value) : null)} className="w-full sm:w-1/4"/>
                    <Input type="number" placeholder="Offset" onChange={e => setOffset(e.target.value ? Number(e.target.value) : null)} className="w-full sm:w-1/4"/>
                </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-4">
                <Button type="submit" onClick={handleGenerateCode} disabled={!collectionName}>
                    <Wand2 />
                    <span>Generate Code</span>
                </Button>
            </div>
            
            {generatedCode && (
                <div className="space-y-4 pt-4">
                    <h3 className="text-md font-medium">Generated Code</h3>
                    <div className="rounded-lg border bg-card-foreground/5 font-code">
                        <pre className="overflow-x-auto p-4 text-sm text-card-foreground">
                            <code>{generatedCode}</code>
                        </pre>
                    </div>
                    <Button onClick={handleFetch} disabled={loading}>
                        {loading ? <Loader2 className="animate-spin" /> : <Play />}
                        <span>Run Code</span>
                    </Button>
                </div>
            )}

            </CardContent>
        </Card>

        <Card>
            <CardHeader>
            <CardTitle>Results</CardTitle>
                <CardDescription>
                {collectionName ? `Documents from the '${collectionName}' collection.` : 'Your query results will appear here.'}
            </CardDescription>
            </CardHeader>
            <CardContent>
            {loading && documents.length === 0 ? (
                <div className="flex justify-center items-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : error ? (
                <div className="text-destructive-foreground bg-destructive/90 p-4 rounded-md">
                    <p className="font-bold">Error:</p>
                    <p>{error}</p>
                </div>
            ) : documents.length > 0 ? (
                <Accordion type="single" collapsible className="w-full">
                {documents.map((doc, index) => (
                    <AccordionItem key={doc.id || index} value={`item-${index}`}>
                    <AccordionTrigger>
                        <span className="font-mono text-sm">{doc.id || `Document ${index + 1}`}</span>
                    </AccordionTrigger>
                    <AccordionContent>
                        <div className="space-y-3 text-sm p-2">
                            <div className="flex gap-2 justify-end">
                                <Button size="sm" variant="outline" onClick={() => openEditDialog(doc)}><Pencil className="mr-2 h-4 w-4" /> Edit</Button>
                                <Button size="sm" variant="destructive" onClick={() => handleDeleteDocument(doc.id)}><Trash2 className="mr-2 h-4 w-4" /> Delete</Button>
                            </div>
                            {Object.entries(doc).map(([key, value]) => (
                                <div key={key} className="grid grid-cols-[1fr_2fr] items-center gap-2">
                                    <span className="font-semibold text-muted-foreground truncate">{key}</span>
                                    <pre className="font-mono text-foreground break-words bg-muted/50 p-2 rounded text-xs col-span-1">
                                        {typeof value === 'object' && value !== null ? JSON.stringify(value, null, 2) : String(value)}
                                    </pre>
                                </div>
                            ))}
                        </div>
                    </AccordionContent>
                    </AccordionItem>
                ))}
                </Accordion>
            ) : (
                <p className="text-muted-foreground text-center py-10">
                No documents to display. Run a query to see results.
                </p>
            )}
            </CardContent>
        </Card>

        <Dialog open={isEditDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogContent>
            <DialogHeader>
                <DialogTitle>Edit Document</DialogTitle>
                <DialogDescription>ID: <span className="font-mono">{editingDoc?.id}</span></DialogDescription>
            </DialogHeader>
            <Textarea
                className="min-h-[300px] font-code"
                value={editingDocContent}
                onChange={(e) => setEditingDocContent(e.target.value)}
            />
            <DialogFooter>
                <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
                <Button onClick={handleUpdateDocument} disabled={loading}>{loading ? <Loader2 className="animate-spin" /> : "Save Changes"}</Button>
            </DialogFooter>
            </DialogContent>
        </Dialog>
    </>
  );
}
