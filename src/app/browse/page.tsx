
'use client';

import { useState } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Search } from 'lucide-react';
import { Database } from '@/lib/orm';
import { useToast } from '@/hooks/use-toast';

export default function BrowsePage() {
  const [collectionName, setCollectionName] = useState('');
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

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
      const docs = await Database.collection(collectionName).getDocuments();
      setDocuments(docs);
      if (docs.length === 0) {
        toast({
            title: 'No Documents Found',
            description: `The collection '${collectionName}' is empty or does not exist.`,
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

  const headers = documents.length > 0 ? Object.keys(documents[0]) : [];

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
                <CardTitle>Browse Collection</CardTitle>
                <CardDescription>
                  Enter the name of a collection to view its documents.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex w-full max-w-sm items-center space-x-2">
                  <Input
                    type="text"
                    placeholder="e.g., users"
                    value={collectionName}
                    onChange={(e) => setCollectionName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleFetch()}
                  />
                  <Button type="submit" onClick={handleFetch} disabled={loading}>
                    {loading ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <Search />
                    )}
                    <span>Fetch</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Results</CardTitle>
                 <CardDescription>
                  Documents from the '{collectionName}' collection.
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
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {headers.map((header) => (
                            <TableHead key={header}>{header}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {documents.map((doc) => (
                          <TableRow key={doc.id}>
                            {headers.map((header) => (
                              <TableCell key={header}>
                                {typeof doc[header] === 'object'
                                  ? JSON.stringify(doc[header])
                                  : String(doc[header])}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
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
