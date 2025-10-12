
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, FilePlus2, BookType, PencilRuler } from 'lucide-react';
import { Database } from '@/lib/orm';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

type Schema = {
  collectionName: string;
  fields: {
    fieldName: string;
    fieldType: 'string' | 'number' | 'boolean' | 'array' | 'object';
  }[];
};

export function CreateForm() {
  const [collectionName, setCollectionName] = useState('');
  const [newDocContent, setNewDocContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [schemas, setSchemas] = useState<Record<string, Schema>>({});
  const [activeSchema, setActiveSchema] = useState<Schema | null>(null);
  const [useManualJson, setUseManualJson] = useState(true);
  const { toast } = useToast();

  const form = useForm();

  useEffect(() => {
    try {
      const savedSchemas = localStorage.getItem('collectionSchemas');
      if (savedSchemas) {
        const parsedSchemas = JSON.parse(savedSchemas);
        setSchemas(parsedSchemas);
      }
    } catch (error) {
      console.error('Failed to load schemas from local storage', error);
    }
  }, []);

  useEffect(() => {
    const schema = schemas[collectionName];
    if (schema) {
      setActiveSchema(schema);
      setUseManualJson(false);
    } else {
      setActiveSchema(null);
      setUseManualJson(true);
    }
    form.reset();
  }, [collectionName, schemas, form]);

  const handleCreateDocument = async (data: any) => {
    if (!collectionName) {
      toast({ variant: 'destructive', title: 'Collection name is missing.' });
      return;
    }

    let docData;
    try {
      if (useManualJson) {
        if (!newDocContent) {
          toast({ variant: 'destructive', title: 'Document content is missing.' });
          return;
        }
        docData = JSON.parse(newDocContent);
      } else {
        // Convert form data to correct types
        docData = Object.entries(data).reduce((acc, [key, value]) => {
          const fieldType = activeSchema?.fields.find(f => f.fieldName === key)?.fieldType;
          if (fieldType === 'number') {
            acc[key] = Number(value);
          } else if (fieldType === 'boolean') {
            acc[key] = Boolean(value);
          } else if (fieldType === 'array' || fieldType === 'object') {
            try {
              acc[key] = JSON.parse(value as string);
            } catch (e) {
              // Leave as string if parsing fails, let Firestore handle it or show an error
              acc[key] = value;
              toast({ variant: "destructive", title: "Invalid JSON", description: `Field '${key}' has invalid JSON content.`});
              throw e; // Prevent submission
            }
          } else {
            acc[key] = value;
          }
          return acc;
        }, {} as Record<string, any>);
      }
    } catch (e: any) {
      console.error("Parsing error:", e);
      toast({ variant: "destructive", title: "Invalid JSON format", description: "Please check the document content." });
      return;
    }
    
    setLoading(true);
    try {
      const newId = await Database.collection(collectionName).add(docData);
      toast({ title: 'Document Created', description: `New document added with ID: ${newId}` });
      if (useManualJson) {
        setNewDocContent('');
      } else {
        form.reset();
      }
    } catch (e: any) {
      console.error('Create error:', e);
      toast({ variant: 'destructive', title: 'Failed to create document', description: e.message });
    } finally {
      setLoading(false);
    }
  };
  
  const renderField = (fieldName: string, fieldType: string) => {
    switch (fieldType) {
      case 'string':
        return <Input placeholder={fieldName} {...form.register(fieldName)} />;
      case 'number':
        return <Input type="number" placeholder={fieldName} {...form.register(fieldName, { valueAsNumber: true })} />;
      case 'boolean':
        return <Switch {...form.register(fieldName)} />;
      case 'array':
      case 'object':
        return <Textarea placeholder={`JSON for ${fieldName}`} {...form.register(fieldName)} />;
      default:
        return <Input placeholder={fieldName} {...form.register(fieldName)} />;
    }
  };


  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Document</CardTitle>
        <CardDescription>
          Enter a collection name. If a schema exists, a form will be generated. Otherwise, you can enter raw JSON.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col space-y-2">
          <Label htmlFor="collection-name" className="text-sm font-medium">Collection Name</Label>
          <Input
            id="collection-name"
            type="text"
            placeholder="e.g., users"
            value={collectionName}
            onChange={(e) => setCollectionName(e.target.value)}
          />
        </div>
        
        {activeSchema && (
            <div className="flex items-center space-x-2 rounded-lg border p-3">
                <Switch id="mode-switch" checked={!useManualJson} onCheckedChange={(checked) => setUseManualJson(!checked)} />
                <Label htmlFor="mode-switch" className="flex items-center gap-2 cursor-pointer">
                    {useManualJson ? <PencilRuler/> : <BookType />}
                    {useManualJson ? 'Switch to Schema Form' : 'Switch to Manual JSON'}
                </Label>
            </div>
        )}

        {useManualJson ? (
          <div className="space-y-4">
            <div className="flex flex-col space-y-2">
                <Label htmlFor="new-doc-content" className="text-sm font-medium">Document JSON</Label>
                <Textarea
                    id="new-doc-content"
                    placeholder='{ "name": "John Doe", "age": 30 }'
                    className="min-h-[200px] font-code"
                    value={newDocContent}
                    onChange={(e) => setNewDocContent(e.target.value)}
                />
            </div>
             <Button onClick={() => handleCreateDocument(null)} disabled={loading || !collectionName}>
                {loading ? <Loader2 className="animate-spin" /> : <FilePlus2 />}
                <span>Create Document</span>
            </Button>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleCreateDocument)} className="space-y-4">
              {activeSchema?.fields.map(field => (
                <FormField
                  key={field.fieldName}
                  control={form.control}
                  name={field.fieldName}
                  render={() => (
                    <FormItem>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <FormLabel className="text-right text-muted-foreground">{field.fieldName}</FormLabel>
                        <FormControl className="col-span-3">
                          {renderField(field.fieldName, field.fieldType)}
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
              <div className="flex justify-end">
                <Button type="submit" disabled={loading || !collectionName}>
                    {loading ? <Loader2 className="animate-spin" /> : <FilePlus2 />}
                    <span>Create Document from Schema</span>
                </Button>
              </div>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
}
