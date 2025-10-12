
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, FilePlus2, BookType, PencilRuler, Play, Wand2 } from 'lucide-react';
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
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [formDataForExec, setFormDataForExec] = useState<any>(null);


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
      setUseManualJson(Object.keys(schema.fields).length === 0);
    } else {
      setActiveSchema(null);
      setUseManualJson(true);
    }
    form.reset();
    setGeneratedCode(null);
    setFormDataForExec(null);
  }, [collectionName, schemas, form]);

  const handleGenerateCode = (data: any) => {
    if (!collectionName) {
      toast({ variant: 'destructive', title: 'Collection name is missing.' });
      return;
    }

    let docDataString: string;
    let dataForExec: any;

    try {
      if (useManualJson) {
        if (!newDocContent) {
          toast({ variant: 'destructive', title: 'Document content is missing.' });
          return;
        }
        // Validate JSON
        JSON.parse(newDocContent); 
        docDataString = newDocContent;
        dataForExec = newDocContent;

      } else {
         // Convert form data to correct types for the string representation
        const docDataForString = Object.entries(data).reduce((acc, [key, value]) => {
          const fieldType = activeSchema?.fields.find(f => f.fieldName === key)?.fieldType;
           if (fieldType === 'boolean') {
            acc[key] = Boolean(value);
          } else {
            acc[key] = value;
          }
          return acc;
        }, {} as Record<string, any>);

        docDataString = JSON.stringify(docDataForString, null, 2);
        dataForExec = data;
      }
    } catch (e) {
       toast({ variant: "destructive", title: "Invalid JSON format", description: "Please check the document content." });
       return;
    }
    
    setGeneratedCode(`Database.collection('${collectionName}').add(${docDataString});`);
    setFormDataForExec(dataForExec);
  };


  const handleCreateDocument = async () => {
    let docData: any;
    
    try {
        if (useManualJson) {
            docData = JSON.parse(formDataForExec);
        } else {
            // Convert form data to correct types for execution
            docData = Object.entries(formDataForExec).reduce((acc, [key, value]) => {
                const fieldType = activeSchema?.fields.find(f => f.fieldName === key)?.fieldType;
                if (fieldType === 'number') {
                    acc[key] = Number(value);
                } else if (fieldType === 'boolean') {
                    acc[key] = Boolean(value);
                } else if (fieldType === 'array' || fieldType === 'object') {
                    try {
                        acc[key] = JSON.parse(value as string);
                    } catch (e) {
                        toast({ variant: "destructive", title: "Invalid JSON", description: `Field '${key}' has invalid JSON content.` });
                        throw e; // Prevent submission
                    }
                } else {
                    acc[key] = value;
                }
                return acc;
            }, {} as Record<string, any>);
        }
    } catch(e) {
        toast({ variant: "destructive", title: "Invalid Data", description: "Could not execute code. Please check your data format." });
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
      setGeneratedCode(null);
      setFormDataForExec(null);
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
                    {!useManualJson ? <BookType /> : <PencilRuler />}
                    {!useManualJson ? 'Using Schema Form' : 'Using Manual JSON'}
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
             <Button onClick={() => handleGenerateCode(null)} disabled={!collectionName}>
                <Wand2 />
                <span>Generate Code</span>
            </Button>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleGenerateCode)} className="space-y-4">
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
                <Button type="submit" disabled={!collectionName}>
                    <Wand2 />
                    <span>Generate Code</span>
                </Button>
              </div>
            </form>
          </Form>
        )}

        {generatedCode && (
            <div className="space-y-4 pt-4">
                <h3 className="text-md font-medium">Generated Code</h3>
                <div className="rounded-lg border bg-card-foreground/5 font-code">
                    <pre className="overflow-x-auto p-4 text-sm text-card-foreground">
                        <code>{generatedCode}</code>
                    </pre>
                </div>
                <Button onClick={handleCreateDocument} disabled={loading}>
                    {loading ? <Loader2 className="animate-spin" /> : <Play />}
                    <span>Run Code</span>
                </Button>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
