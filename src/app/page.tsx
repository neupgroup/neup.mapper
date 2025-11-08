"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import LocalStorageWipeSection from '@/components/home/localstorage-wipe';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function Home() {
  const [connections, setConnections] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const { listConnections } = await import('@/app/actions');
        const names = await listConnections();
        setConnections(names);
      } catch (e) {
        // non-blocking; homepage still useful without connection status
        console.warn('Could not load connections on homepage:', e);
      }
    })();
  }, []);

  return (
    <MainLayout>
      <div className="space-y-8">
        <div className="space-y-2">
          <h1 className="font-headline text-2xl font-bold tracking-tight sm:text-3xl">Neup.Mapper</h1>
          <p className="text-muted-foreground max-w-2xl">
            Configure connections, define schemas, and browse data across Firestore, SQL, MongoDB, and APIs — all in one place.
          </p>
        </div>

        {connections.length === 0 && (
          <Alert>
            <AlertTitle>Get Started</AlertTitle>
            <AlertDescription>
              No connections found. Head to the <Link href="/configure" className="font-semibold underline">Configure</Link> page to add your first connection.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle>Configure</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">Set up database or API connections for this session.</p>
              <Button asChild>
                <Link href="/configure">Open Configure</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Schemas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">Define collections and endpoint hints tied to a connection.</p>
              <Button variant="secondary" asChild>
                <Link href="/schemas">Open Schemas</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Browse</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">Explore and manage data using configured connections.</p>
              <Button variant="secondary" asChild>
                <Link href="/browse">Open Browser</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Documentation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">Learn how env, runtime configs, and schemas work together.</p>
              <Button variant="outline" asChild>
                <Link href="/documentation">Open Docs</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Tools */}
        <LocalStorageWipeSection />
      </div>
    </MainLayout>
  );
}
