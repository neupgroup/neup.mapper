
'use client';

import { useState } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { GetForm } from '@/components/browse/get-form';
import { CreateForm } from '@/components/browse/create-form';
import { UpdateForm } from '@/components/browse/update-form';
import { DeleteForm } from '@/components/browse/delete-form';
import { Database, FilePlus2, Pencil, Trash2, Code } from 'lucide-react';

type InterfaceType = 'api' | 'database';
type DbType = 'Firestore' | 'SQL' | 'MongoDB';
type Operation = 'get' | 'create' | 'update' | 'delete' | 'post' | 'patch';

export default function BrowsePage() {
  const [interfaceType, setInterfaceType] = useState<InterfaceType | null>(null);
  const [dbType, setDbType] = useState<DbType | null>(null);
  const [operation, setOperation] = useState<Operation | null>(null);

  const nouns = (() => {
    if (interfaceType === 'api') {
      return { container: 'endpoint', item: 'resource', itemPlural: 'resources' } as const;
    }
    if (dbType === 'SQL') {
      return { container: 'table', item: 'row', itemPlural: 'rows' } as const;
    }
    // Firestore or MongoDB (and default)
    return { container: 'collection', item: 'document', itemPlural: 'documents' } as const;
  })();

  const renderForm = () => {
    if (!operation) return null;
    switch (operation) {
      case 'get':
        return <GetForm nouns={nouns} />;
      case 'create':
      case 'post':
        return <CreateForm nouns={nouns} />;
      case 'update':
      case 'patch':
        return <UpdateForm nouns={nouns} />;
      case 'delete':
        return <DeleteForm nouns={nouns} />;
      default:
        return null;
    }
  };

  const databaseOperationOptions = [
    { value: 'get', label: `Get ${nouns.itemPlural}`, icon: <Database /> },
    { value: 'create', label: `Create ${nouns.item}`, icon: <FilePlus2 /> },
    { value: 'update', label: `Update ${nouns.item}`, icon: <Pencil /> },
    { value: 'delete', label: `Delete ${nouns.item}`, icon: <Trash2 /> },
  ] satisfies { value: Operation; label: string; icon: JSX.Element }[];

  const apiOperationOptions = [
    { value: 'get', label: 'GET Fetch', icon: <Code /> },
    { value: 'post', label: 'POST Create', icon: <Code /> },
    { value: 'patch', label: 'PATCH Update', icon: <Code /> },
    { value: 'delete', label: 'DELETE Delete', icon: <Code /> },
  ] satisfies { value: Operation; label: string; icon: JSX.Element }[];

  return (
    <MainLayout>
      <div className="space-y-8">
        <h1 className="font-headline text-2xl font-bold tracking-tight sm:text-3xl">
          Data Browser
        </h1>

        {/* Step 1: Interface type selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Interface Type</CardTitle>
            <CardDescription>
              Choose whether you are interacting with an API or a database.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={interfaceType ?? undefined}
              onValueChange={(value: InterfaceType) => {
                setInterfaceType(value);
                // Reset downstream selections when interface changes
                setDbType(null);
                setOperation(null);
              }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4"
            >
              {[
                { value: 'api' as const, label: 'API', icon: <Code /> },
                { value: 'database' as const, label: 'Database', icon: <Database /> },
              ].map(({ value, label, icon }) => (
                <Label key={value} htmlFor={`iface-${value}`} className="cursor-pointer">
                  <div className={`flex flex-col items-center justify-center rounded-lg border-2 p-4 transition-colors hover:bg-accent hover:text-accent-foreground ${interfaceType === value ? 'border-primary bg-primary/10' : 'border-muted'}`}>
                    {icon}
                    <span className="mt-2 font-medium">{label}</span>
                    <RadioGroupItem value={value} id={`iface-${value}`} className="sr-only" />
                  </div>
                </Label>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Step 2: Database type selection (only when database is chosen) */}
        {interfaceType === 'database' && (
          <Card>
            <CardHeader>
              <CardTitle>Select Database Type</CardTitle>
              <CardDescription>
                Pick the database type. Actual execution uses the configured `DB_TYPE`.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={dbType ?? undefined}
                onValueChange={(value: DbType) => {
                  setDbType(value);
                  setOperation(null);
                }}
                className="grid grid-cols-1 sm:grid-cols-3 gap-4"
              >
                {[
                  { value: 'Firestore' as const, label: 'Firestore' },
                  { value: 'SQL' as const, label: 'SQL' },
                  { value: 'MongoDB' as const, label: 'MongoDB' },
                ].map(({ value, label, disabled }) => (
                  <Label key={value} htmlFor={`db-${value}`} className={`cursor-pointer ${disabled ? 'opacity-50' : ''}`}>
                    <div className={`flex flex-col items-center justify-center rounded-lg border-2 p-4 transition-colors ${disabled ? 'border-muted' : 'hover:bg-accent hover:text-accent-foreground'} ${dbType === value ? 'border-primary bg-primary/10' : 'border-muted'}`}>
                      <Database />
                      <span className="mt-2 font-medium">{label}</span>
                      <RadioGroupItem value={value} id={`db-${value}`} className="sr-only" disabled={disabled} />
                    </div>
                  </Label>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Operation selection (API immediately; Database after DB type chosen) */}
        {(interfaceType === 'api' || (interfaceType === 'database' && dbType)) && (
          <Card>
            <CardHeader>
              <CardTitle>Select an Operation</CardTitle>
              <CardDescription>
                {interfaceType === 'api'
                  ? 'Choose the API method to perform.'
                  : 'Choose the database operation to perform.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={operation ?? undefined}
                onValueChange={(value: Operation) => setOperation(value)}
                className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4"
              >
                {(interfaceType === 'api' ? apiOperationOptions : databaseOperationOptions).map(({ value, label, icon }) => (
                  <Label key={value} htmlFor={`op-${value}`} className="cursor-pointer">
                    <div className={`flex flex-col items-center justify-center rounded-lg border-2 p-4 transition-colors hover:bg-accent hover:text-accent-foreground ${operation === value ? 'border-primary bg-primary/10' : 'border-muted'}`}>
                      {icon}
                      <span className="mt-2 font-medium">{label}</span>
                      <RadioGroupItem value={value} id={`op-${value}`} className="sr-only" />
                    </div>
                  </Label>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Render the selected form only after explicit operation selection */}
        {renderForm()}
      </div>
    </MainLayout>
  );
}
