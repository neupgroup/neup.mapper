import { MainLayout } from '@/components/layout/main-layout';
import { ConfigureDBForm } from '@/components/configure-db-form';

export default function ConfigurePage() {
  return (
    <MainLayout>
      <div className="space-y-8">
        <h1 className="font-headline text-2xl font-bold tracking-tight sm:text-3xl">
          Configure Connection
        </h1>
        <div className="max-w-4xl">
            <p className="mb-8 text-muted-foreground">
              Configure credentials and settings for a connection (databases, APIs, etc.). This information is stored locally in your browser and is not transmitted elsewhere.
            </p>
            <ConfigureDBForm />
        </div>
      </div>
    </MainLayout>
  );
}
