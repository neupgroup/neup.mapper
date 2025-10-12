import { MainLayout } from '@/components/layout/main-layout';
import { AISchemaForm } from '@/components/ai-schema-form';

export default function Home() {
  return (
    <MainLayout>
      <div className="flex h-full flex-col">
        <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm sm:h-16 sm:px-6">
          <h1 className="font-headline text-xl font-bold tracking-tight sm:text-2xl">
            AI Schema Builder
          </h1>
        </header>
        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-4xl">
            <p className="mb-8 text-muted-foreground">
              Describe your data and let our AI suggest the optimal schema for
              your database.
            </p>
            <AISchemaForm />
          </div>
        </main>
      </div>
    </MainLayout>
  );
}
