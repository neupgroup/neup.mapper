
'use client';

import { MainLayout } from '@/components/layout/main-layout';
import { BrowserFlow } from '@/components/browse/browser-flow';

export default function BrowsePage() {
  return (
    <MainLayout>
      <div className="space-y-8">
        <h1 className="font-headline text-2xl font-bold tracking-tight sm:text-3xl">Data Browser</h1>
        <BrowserFlow />
      </div>
    </MainLayout>
  );
}
