
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Pencil, Play, Wand2 } from 'lucide-react';
import { Database } from '@/lib/orm';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';

export function UpdateForm() {
  const [collectionName, setCollectionName] = useState('');
  const [docId, setDocId] = useState('');
  const [updateContent, setUpdateContent] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);

  const handleGenerateCode = () => {
    if (!collectionName || !docId) {
        toast({ variant: "destructive", title: "Collection name and Document ID are required." });
        return;
    }
     if (!updateContent) {
        toast({ variant: "destructive", title: "Update content is missing." });
        return;
    }
    try {
        // Validate JSON
        JSON.parse(updateContent);
        const code = `Database.collection('${collectionName}').update('${docId}', ${updateContent});`;
        setGeneratedCode(code);
    } catch(e) {
        toast({ variant: "destructive", title: "Invalid JSON format", description: "Please check the update JSON content." });
    }
  };


  const handleUpdateDocument = async () => {
    try {
        const docData = JSON.parse(updateContent);
        setLoading(true);
        await Database.collection(collectionName).update(docId, docData);
        toast({ title: "Document Updated", description: "The document has been updated successfully." });
        setGeneratedCode(null);
    } catch (e: any) {
        console.error("Update error:", e);
        toast({ variant: "destructive", title: "Failed to update document", description: e.message });
    } finally {
        setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Update a Document</CardTitle>
        <CardDescription>
          Provide the collection name, document ID, and the JSON data to update.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col space-y-2">
                <label htmlFor="update-collection-name" className="text-sm font-medium">Collection Name</label>
                <Input
                    id="update-collection-name"
                    placeholder="e.g., users"
                    value={collectionName}
                    onChange={(e) => setCollectionName(e.target.value)}
                />
            </div>
            <div className="flex flex-col space-y-2">
                <label htmlFor="update-doc-id" className="text-sm font-medium">Document ID</label>
                <Input
                    id="update-doc-id"
                    placeholder="Document ID to update"
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
