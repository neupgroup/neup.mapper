#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
// Parse arguments
const args = process.argv.slice(2);
const migrationName = args[0];
const connIndex = args.indexOf('--conn');
let connectionName = '';
if (connIndex !== -1 && args[connIndex + 1]) {
    connectionName = args[connIndex + 1];
}
if (!migrationName || migrationName.startsWith('--')) {
    console.error('Please provide a migration name.');
    console.error('Usage: npm run create-migration <name> [--conn <connectionName>]');
    process.exit(1);
}
// Ensure directories exist
const mapperDir = path.resolve(process.cwd(), 'mapper');
const schemasDir = path.join(mapperDir, 'schemas');
[mapperDir, schemasDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});
// Generate timestamp: YYYYMMDDHHMMSS
const now = new Date();
const timestamp = now.toISOString().replace(/[-T:.]/g, '').substring(0, 14);
const fullName = `${timestamp}_${migrationName}`;
const migrationsFile = path.join(mapperDir, 'migrations.ts');
const newMigration = `
  {
    name: '${fullName}',${connectionName ? `\n    usesConnection: '${connectionName}',` : ''}
    async up() {
      const migrator = Mapper.migrator('${migrationName}')${connectionName ? `.useConnection('${connectionName}')` : ''};
      // await migrator.create()
      //   .addColumn('id').type('int').autoIncrement().isPrimary()
      //   .addColumn('created_at').type('date').default('NOW()')
      //   .exec();
    },
    async down() {
      const migrator = Mapper.migrator('${migrationName}')${connectionName ? `.useConnection('${connectionName}')` : ''};
      // await migrator.drop().exec();
    }
  },`;
if (!fs.existsSync(migrationsFile)) {
    const content = `import { Mapper } from '@neupgroup/mapper';

export const migrations = [
${newMigration}
];
`;
    fs.writeFileSync(migrationsFile, content);
    console.log(`Created migrations file: ${migrationsFile}`);
}
else {
    let content = fs.readFileSync(migrationsFile, 'utf-8');
    const lastBracketIndex = content.lastIndexOf(']');
    if (lastBracketIndex !== -1) {
        content = content.slice(0, lastBracketIndex) + newMigration + '\n' + content.slice(lastBracketIndex);
        fs.writeFileSync(migrationsFile, content);
        console.log(`Added migration '${fullName}' to ${migrationsFile}`);
    }
    else {
        console.error(`Could not parse ${migrationsFile}. Ensure it exports a 'migrations' array.`);
        process.exit(1);
    }
}
