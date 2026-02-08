import type { MigrationsConfig } from '@neupgroup/mapper';

export const config: MigrationsConfig = {
  migrations: {
    "20260208092939_users": {
      id: "20260208092939_users",
      name: "users",
      timestamp: "2026-02-08T09:29:39.363Z",
      status: "completed",
      executedAt: "2026-02-08T09:32:32.305Z",
      up: async (Mapper: any) => {
        const migrator = Mapper.migrator('users').create();
        migrator.addColumn('id').type('int').autoIncrement().isPrimary();
        migrator.addColumn('created_at').type('date').default('NOW()');
        await migrator.exec();
      },
      down: async (Mapper: any) => {
        const migrator = Mapper.migrator('users').drop();
        await migrator.exec();
      }
    },
  },
  logs: [
    {
      migrationId: '20260208092939_users',
      timestamp: '2026-02-08T09:32:32.305Z',
      action: 'up',
      status: 'success',
      duration: 4,
      message: 'Migration up completed successfully'
    },
    {
      migrationId: '20260208092939_users',
      timestamp: '2026-02-08T09:31:40.697Z',
      action: 'up',
      status: 'failed',
      duration: 2,
      message: 'TypeError: migrator.addColumn(...).type(...).autoIncrement(...).isPrimary(...).exec is not a function'
    },],
  settings: {
    migrationsDirectory: 'migrations',
    migrationsTable: 'migrations',
    autoRun: true
  }
};
