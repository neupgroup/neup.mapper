
'use client';

import { useState } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Search, PlusCircle, XCircle } from 'lucide-react';
import { Database } from '@/lib/orm';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type WhereClause = {
  field: string;
  operator: '==' | '<' | '>' | '<=' | '>=' | '!=';
  value: string;
};

type SortBy = {
  field: string;
  direction: 'asc' | 'desc';
};

export default function BrowsePage() {
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

  const handleFetch = async () => {
    if (!collectionName) {
      toast({
        variant: 'destructive',
        title: 'Collection Name Required',
        description: 'Please enter a collection name to fetch documents.',
      });
      return;
    }
    setLoading(true);
    setError(null);
    setDocuments([]);
    try {
      let query = Database.collection(collectionName);
      
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
            title: 'No Documents Found',
            description: `Your query on '${collectionName}' returned no results.`,
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


  return (
    <MainLayout>
      <div className="flex h-full flex-col">
        <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm sm:h-16 sm:px-6">
          <h1 className="font-headline text-xl font-bold tracking-tight sm:text-2xl">
            Data Browser
          </h1>
        </header>
        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-6xl space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Build Your Query</CardTitle>
                <CardDescription>
                  Enter a collection name and add conditions to build your database query.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col space-y-2">
                        <label htmlFor="collection-name" className="text-sm font-medium">Collection Name</label>
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
                
                {/* Query Parameters */}
                <div className="space-y-4 pt-4">
                    <CardTitle className="text-lg">Query Parameters</CardTitle>
                    {/* Where Clauses */}
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
                        <Button variant="outline" size="sm" onClick={addWhereClause}><PlusCircle/> Add Condition</Button>
                    </div>
                    
                    {/* Sort By */}
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

                    {/* Limit and Offset */}
                    <div className="flex flex-wrap items-center gap-2">
                        <Input type="number" placeholder="Limit" onChange={e => setLimit(e.target.value ? Number(e.target.value) : null)} className="w-full sm:w-1/4"/>
                        <Input type="number" placeholder="Offset" onChange={e => setOffset(e.target.value ? Number(e.target.value) : null)} className="w-full sm:w-1/4"/>
                    </div>
                </div>

                <Button type="submit" onClick={handleFetch} disabled={loading || !collectionName}>
                    {loading ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <Search />
                    )}
                    <span>Fetch Documents</span>
                </Button>

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
                {loading ? (
                  <div className="flex justify-center items-center h-40">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : error ? (
                    <div className="text-destructive-foreground bg-destructive/90 p-4 rounded-md">
                        <p className="font-bold">Error:</p>
                        <p>{error}</p>
                    </div>
                ) : documents.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {documents.map((doc, index) => (
                      <Card key={doc.id || index}>
                          <CardHeader>
                              <CardTitle className="text-lg truncate">{doc.id || `Document ${index + 1}`}</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2 text-sm">
                                {Object.entries(doc).map(([key, value]) => (
                                    <div key={key} className="flex justify-between items-start gap-4">
                                        <span className="font-semibold text-muted-foreground">{key}</span>
                                        <span className="text-foreground break-words text-right">
                                            {typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                          </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-10">
                    No documents to display.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </MainLayout>
  );
}
