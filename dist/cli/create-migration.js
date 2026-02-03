#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
// Parse arguments
const args = process.argv.slice(2);
const migrationName = args[0];
if (!migrationName) {
    console.error('Please provide a migration name.');
    console.error('Usage: npm run create-migration <name>');
    process.exit(1);
}
// Ensure directories exist
const mapperDir = path.resolve(process.cwd(), 'src/mapper');
const migrationsDir = path.join(mapperDir, 'migrations');
const schemasDir = path.join(mapperDir, 'schemas');
[mapperDir, migrationsDir, schemasDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});
// Generate timestamp: YYYYMMDDHHMMSS
const now = new Date();
const timestamp = now.toISOString().replace(/[-T:.]/g, '').substring(0, 14);
const fileName = `${timestamp}_${migrationName}.ts`;
const filePath = path.join(migrationsDir, fileName);
// Migration template
const template = `import { Mapper } from '@neupgroup/mapper';

export async function up() {
  const migrator = Mapper.migrator('${migrationName}');
  
  // Use create() or update() to get a builder
  // await migrator.create()
  //   .addColumn('id').type('int').autoIncrement().isPrimary()
  //   .addColumn('created_at').type('date').default('NOW()')
  //   .exec();
}

export async function down() {
  const migrator = Mapper.migrator('${migrationName}');
  // await migrator.drop().exec();
}
`;
fs.writeFileSync(filePath, template);
console.log(`Created migration: ${filePath}`);
