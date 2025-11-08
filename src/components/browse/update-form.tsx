
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Pencil, Play, Wand2 } from 'lucide-react';
import { Connection } from '@/lib/orm/query-builder';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { listConnections, getRuntimeDbConfig } from '@/app/actions';

type Nouns = { container: string; item: string; itemPlural: string };
type DbType = 'Firestore' | 'SQL' | 'MongoDB' | 'API';

export function UpdateForm({ nouns, dbType }: { nouns?: Nouns; dbType?: DbType | null }) {
  const container = nouns?.container ?? 'collection';
  const item = nouns?.item ?? 'document';
  const itemPlural = nouns?.itemPlural ?? 'documents';
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const [collectionName, setCollectionName] = useState('');
  const [docId, setDocId] = useState('');
  const [updateContent, setUpdateContent] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [connectionName, setConnectionName] = useState<string>('default');
  const [availableConnections, setAvailableConnections] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const names = await listConnections();
        if (dbType) {
          const filtered: string[] = [];
          for (const name of names) {
            const cfg = await getRuntimeDbConfig(name);
            if (cfg?.dbType === dbType) filtered.push(name);
          }
          setAvailableConnections(filtered);
          if (filtered.includes('default')) setConnectionName('default');
          else if (filtered.length > 0) setConnectionName(filtered[0]);
        } else {
          setAvailableConnections(names);
          if (names.includes('default')) setConnectionName('default');
        }
      } catch {}
    })();
  }, [dbType]);

  const handleGenerateCode = () => {
    if (!collectionName || !docId) {
        toast({ variant: "destructive", title: `${cap(container)} name and ${cap(item)} ID are required.` });
        return;
    }
     if (!updateContent) {
        toast({ variant: "destructive", title: "Update content is missing." });
        return;
    }
    try {
        // Validate JSON
        JSON.parse(updateContent);
        const connCtor = connectionName && connectionName !== 'default' ? `new Connection('${connectionName}')` : 'new Connection()';
        const code = `${connCtor}.collection('${collectionName}').update('${docId}', ${updateContent});`;
        setGeneratedCode(code);
    } catch(e) {
        toast({ variant: "destructive", title: "Invalid JSON format", description: "Please check the update JSON content." });
    }
  };


  const handleUpdateDocument = async () => {
    try {
        const docData = JSON.parse(updateContent);
        setLoading(true);
        await new Connection(connectionName && connectionName !== 'default' ? connectionName : undefined)
          .collection(collectionName)
          .update(docId, docData);
        toast({ title: `${cap(item)} Updated`, description: `The ${item} has been updated successfully.` });
        setGeneratedCode(null);
    } catch (e: any) {
        console.error("Update error:", e);
        toast({ variant: "destructive", title: `Failed to update ${item}`, description: e.message });
    } finally {
        setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Update a {cap(item)}</CardTitle>
        <CardDescription>
          Provide the {container} name, {item} ID, and the JSON data to update.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col space-y-2">
                <label htmlFor="update-collection-name" className="text-sm font-medium">{cap(container)} Name</label>
                <Input
                    id="update-collection-name"
                    placeholder="e.g., users"
                    value={collectionName}
                    onChange={(e) => setCollectionName(e.target.value)}
                />
            </div>
            <div className="flex flex-col space-y-2">
                <label htmlFor="update-doc-id" className="text-sm font-medium">{cap(item)} ID</label>
                <Input
                    id="update-doc-id"
                    placeholder={`${cap(item)} ID to update`}
                    value={docId}
                    onChange={(e) => setDocId(e.target.value)}
                />
            </div>
        </div>
         <div className="flex flex-col space-y-2">
            <label htmlFor="update-content" className="text-sm font-medium">Update JSON</label>
            <Textarea
                id="update-content"
                placeholder='{ "age": 31, "status": "active" }'
                className="min-h-[200px] font-code"
                value={updateContent}
                onChange={(e) => setUpdateContent(e.target.value)}
            />
        </div>
        <Button onClick={handleGenerateCode} disabled={!collectionName || !docId || !updateContent}>
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
                <Button onClick={handleUpdateDocument} disabled={loading}>
                    {loading ? <Loader2 className="animate-spin" /> : <Play />}
                    <span>Run Code</span>
                </Button>
            </div>
        )}

      </CardContent>
    </Card>
  );
}
