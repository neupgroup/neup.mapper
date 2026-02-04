import { Mapper } from '@neupgroup/mapper';

export const migrations = [

  {
    name: '20260203204957_users',
    async up() {
      const migrator = Mapper.migrator('users').create();
      migrator.addColumn('id').type('int').autoIncrement().isPrimary();
      migrator.addColumn('created_at').type('date').default('NOW()');
      await migrator.exec();
    },
    async down() {
      const migrator = Mapper.migrator('users').drop();
      await migrator.exec();
    }
  },

  {
    name: '20260203205652_users',
    async up() {
      const migrator = Mapper.migrator('users').update();
      migrator.addColumn('username').type('string').length(255);
      await migrator.exec();
    },
    async down() {
      const migrator = Mapper.migrator('users');
      // await migrator.drop().exec();
    }
  },
];
