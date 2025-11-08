
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Trash2, Play, Wand2 } from 'lucide-react';
import { Connection } from '@/lib/orm/query-builder';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { listConnections } from '@/app/actions';

type Nouns = { container: string; item: string; itemPlural: string };

export function DeleteForm({ nouns }: { nouns?: Nouns }) {
  const container = nouns?.container ?? 'collection';
  const item = nouns?.item ?? 'document';
  const itemPlural = nouns?.itemPlural ?? 'documents';
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const [collectionName, setCollectionName] = useState('');
  const [docId, setDocId] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
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
    if (!collectionName || !docId) {
        toast({ variant: "destructive", title: `${cap(container)} name and ${cap(item)} ID are required.` });
        return;
    }
    const connCtor = connectionName && connectionName !== 'default' ? `new Connection('${connectionName}')` : 'new Connection()';
    const code = `${connCtor}.collection('${collectionName}').delete('${docId}');`;
    setGeneratedCode(code);
  };

  const handleDeleteDocument = async () => {
    setLoading(true);
    try {
        await new Connection(connectionName && connectionName !== 'default' ? connectionName : undefined)
          .collection(collectionName)
          .delete(docId);
        toast({ title: `${cap(item)} Deleted`, description: `The ${item} has been deleted successfully.` });
        setDocId('');
        setGeneratedCode(null);
    } catch (e: any) {
        console.error("Delete error:", e);
        toast({ variant: "destructive", title: `Failed to delete ${item}`, description: e.message });
    } finally {
        setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Delete a {cap(item)}</CardTitle>
        <CardDescription>
          Provide the {container} name and the ID of the {item} you want to delete.
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
                <label htmlFor="delete-collection-name" className="text-sm font-medium">{cap(container)} Name</label>
                <Input
                    id="delete-collection-name"
                    placeholder="e.g., users"
                    value={collectionName}
                    onChange={(e) => setCollectionName(e.target.value)}
                />
            </div>
            <div className="flex flex-col space-y-2">
                <label htmlFor="delete-doc-id" className="text-sm font-medium">{cap(item)} ID</label>
                <Input
                    id="delete-doc-id"
                    placeholder={`${cap(item)} ID to delete`}
                    value={docId}
                    onChange={(e) => setDocId(e.target.value)}
                />
            </div>
        </div>
        
        <Button onClick={handleGenerateCode} disabled={!collectionName || !docId}>
            <Wand2 />
            <span>Generate Code</span>
        </Button>

        {generatedCode && (
            <div className="space-y-4 pt-4">
                <h3 className="text-md font-medium">Generated Code</h3>
                <div className="rounded-lg border bg-card-foreground/5 font-code">
                    <pre className="overflow-x-auto p-4 text-sm text-card-foreground">
                        <code>{generatedCode}</code>
                    </pre>
                </div>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" disabled={loading}>
                            <Play />
                            <span>Run Code</span>
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the {item}
                            with ID <span className="font-bold font-mono">{docId}</span> from the '{collectionName}' {container}.
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteDocument} disabled={loading}>
                            {loading ? <Loader2 className="animate-spin" /> : "Continue"}
                        </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
