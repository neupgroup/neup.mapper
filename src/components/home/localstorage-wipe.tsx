'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export default function LocalStorageWipeSection() {
  const { toast } = useToast();
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    try {
      setHasData(typeof window !== 'undefined' && window.localStorage.length > 0);
    } catch {
      setHasData(false);
    }
  }, []);

  const handleWipe = () => {
    try {
      window.localStorage.clear();
      setHasData(false);
      toast({ title: 'Local storage cleared', description: 'All locally stored data has been wiped.' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Failed to clear', description: e?.message || 'Could not wipe local data.' });
    }
  };

  if (!hasData) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Local Storage</CardTitle>
        <CardDescription>Wipe all the stored data to help with logging.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">Detected stored items in your browser. You can clear them.</p>
          <Button variant="destructive" onClick={handleWipe}>Wipe All Stored Data</Button>
        </div>
      </CardContent>
    </Card>
  );
}

