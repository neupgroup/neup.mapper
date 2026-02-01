
    import { TableMigrator } from '../../index.js'; // Adjust import for test environment
    
    export async function up() {
        console.log('Running UP for test_users');
        const migrator = new TableMigrator('test_users');
        migrator.addColumn('id').type('int').autoIncrement().isPrimary();
        migrator.addColumn('name').type('string');
        await migrator.exec();
    }

    export async function down() {
        const migrator = new TableMigrator('test_users');
        await migrator.drop().exec();
    }
    