#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
// Parse arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Usage: npm run create-migration <name> [--conn <connectionName>]
`);
    process.exit(0);
}
const migrationName = args[0];
const connIndex = args.indexOf('--conn');
let connectionName = '';
if (connIndex !== -1 && args[connIndex + 1]) {
    connectionName = args[connIndex + 1];
}
if (!migrationName || migrationName.startsWith('--')) {
    console.error('Error: Please provide a migration name.');
    process.exit(1);
}
// Generate timestamp: YYYYMMDDHHMMSS
const now = new Date();
const timestamp = now.toISOString().replace(/[-T:.]/g, '').substring(0, 14);
const fullName = `${timestamp}_${migrationName}`;
const cwd = process.cwd();
const tsConfigPath = path.resolve(cwd, 'migrations.config.ts');
const jsonConfigPath = path.resolve(cwd, 'migrations.config.json');
// Helper to create migration object string
function createMigrationString(id, name, conn) {
    return `    "${id}": {
      id: "${id}",
      name: "${name}",
      timestamp: "${now.toISOString()}",
      status: "pending",
      up: async (Mapper: any) => {
          const migrator = Mapper.migrator('${name}')${conn ? `.useConnection('${conn}')` : ''};
          // await migrator.create()
          //   .addColumn('id').type('int').autoIncrement().isPrimary()
          //   .addColumn('created_at').type('date').default('NOW()')
          //   .exec();
      },
      down: async (Mapper: any) => {
          const migrator = Mapper.migrator('${name}')${conn ? `.useConnection('${conn}')` : ''};
          // await migrator.drop().exec();
      }${conn ? `,\n      connection: "${conn}"` : ''}
    },`;
}
if (fs.existsSync(tsConfigPath)) {
    let content = fs.readFileSync(tsConfigPath, 'utf-8');
    // Check duplicate ID only (allow duplicate names with different timestamps)
    if (content.includes(`"${fullName}":`)) {
        console.warn(`Warning: Migration '${fullName}' already exists.`);
        process.exit(0);
    }
    // Insert into migrations object
    const isArrayFormat = /migrations:\s*\[/.test(content);
    if (isArrayFormat) {
        console.error("Migration format seems to be Array. Please convert to Object format or use legacy tools.");
        process.exit(1);
    }
    const migrationsRegex = /migrations:\s*\{/;
    if (!migrationsRegex.test(content)) {
        console.error("Could not find 'migrations: {' in ts config.");
        process.exit(1);
    }
    const newMigration = createMigrationString(fullName, migrationName, connectionName);
    content = content.replace(migrationsRegex, `migrations: {\n${newMigration}`);
    fs.writeFileSync(tsConfigPath, content);
    console.log(`✓ Added migration '${fullName}' to ${tsConfigPath}`);
}
else if (fs.existsSync(jsonConfigPath)) {
    // Legacy JSON support (still array usually)
    const content = fs.readFileSync(jsonConfigPath, 'utf-8');
    const config = JSON.parse(content);
    // For legacy array, keep name check or relax? Relaxing it is consistent.
    if (config.migrations.some((m) => m.id === fullName)) {
        console.warn('Migration already exists.');
        process.exit(0);
    }
    const newMigration = {
        id: fullName,
        name: migrationName,
        timestamp: now.toISOString(),
        status: 'pending',
        up: `const migrator = Mapper.migrator('${migrationName}')${connectionName ? `.useConnection('${connectionName}')` : ''};\n      // await migrator.create()...`,
        down: `const migrator = Mapper.migrator('${migrationName}')${connectionName ? `.useConnection('${connectionName}')` : ''};\n      // await migrator.drop().exec();`
    };
    if (connectionName)
        newMigration.connection = connectionName;
    config.migrations.push(newMigration);
    fs.writeFileSync(jsonConfigPath, JSON.stringify(config, null, 2));
    console.log(`✓ Added migration '${fullName}' to ${jsonConfigPath}`);
}
else {
    // Create new TS config
    const newMigration = createMigrationString(fullName, migrationName, connectionName);
    const initialContent = `import type { MigrationsConfig } from '@neupgroup/mapper';

export const config: MigrationsConfig = {
  migrations: {
${newMigration}
  },
  logs: [],
  settings: {
    migrationsDirectory: 'migrations',
    migrationsTable: 'migrations',
    autoRun: false
  }
};
`;
    fs.writeFileSync(tsConfigPath, initialContent);
    console.log(`✓ Created ${tsConfigPath} with migration '${fullName}'`);
}
