#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Usage: npm run migrate [command]

Commands:
  up       Run all pending migrations (default)
  down     Roll back the last completed migration

Options:
  --help, -h   Show this help message

Description:
  This command will look for migration files in src/migration,
  load database connections from src/connection, and execute
  pending changes on your database while updating local schema files.
`);
    process.exit(0);
}
const command = args[0] || 'up'; // 'up' or 'down'
const migrationDir = path.resolve(process.cwd(), 'src/migration');
const indexFilePath = path.join(migrationDir, 'index.ts');
if (!fs.existsSync(indexFilePath)) {
    console.log('No migrations found.');
    process.exit(0);
}
async function run() {
    // Load connections
    const connectionDir = path.resolve(process.cwd(), 'src/connection');
    if (fs.existsSync(connectionDir)) {
        const { StaticMapper } = await import('../fluent-mapper.js');
        const connFiles = fs.readdirSync(connectionDir).filter(f => f.endsWith('.ts'));
        for (const file of connFiles) {
            const name = file.replace('.ts', '');
            const filePath = path.resolve(connectionDir, file);
            try {
                const mod = await import('file://' + filePath);
                const config = mod.config;
                if (config) {
                    console.log(`Loading connection: ${name}`);
                    StaticMapper.makeConnection(name, config.type, config);
                }
            }
            catch (e) {
                console.warn(`Failed to load connection ${name}: ${e.message}`);
            }
        }
    }
    const content = fs.readFileSync(indexFilePath, 'utf-8');
    const matchMigrations = content.match(/migrations = \[(.*?)\]/s);
    const matchCompleted = content.match(/completed = \[(.*?)\]/s);
    const matchVersion = content.match(/currentVersion = (.*?);/);
    if (!matchMigrations) {
        console.log('No migrations list found in index.ts');
        return;
    }
    const migrations = matchMigrations[1].split(',').map(s => s.trim().replace(/['"]/g, '')).filter(Boolean);
    let completed = matchCompleted ? matchCompleted[1].split(',').map(s => s.trim().replace(/['"]/g, '')).filter(Boolean) : [];
    let currentVersion = matchVersion ? parseInt(matchVersion[1]) : -1;
    if (command === 'up') {
        const pending = migrations.filter(m => !completed.includes(m));
        if (pending.length === 0) {
            console.log('No pending migrations.');
            return;
        }
        console.log(`Found ${pending.length} pending migrations.`);
        for (const m of pending) {
            console.log(`Running migration UP: ${m}...`);
            const filePath = path.join(migrationDir, `${m}.ts`);
            const absolutePath = path.resolve(filePath);
            const mod = await import('file://' + absolutePath);
            if (mod.up) {
                await mod.up();
                completed.push(m);
                currentVersion = migrations.indexOf(m);
                console.log(`Completed UP: ${m}`);
            }
            else {
                console.error(`Migration ${m} does not have an up() function.`);
                break;
            }
        }
    }
    else if (command === 'down') {
        if (completed.length === 0) {
            console.log('No migrations to roll back.');
            return;
        }
        const lastMigrationName = completed[completed.length - 1];
        console.log(`Rolling back migration: ${lastMigrationName}...`);
        const filePath = path.join(migrationDir, `${lastMigrationName}.ts`);
        const absolutePath = path.resolve(filePath);
        const mod = await import('file://' + absolutePath);
        if (mod.down) {
            await mod.down();
            completed.pop();
            currentVersion = completed.length > 0 ? migrations.indexOf(completed[completed.length - 1]) : -1;
            console.log(`Completed DOWN: ${lastMigrationName}`);
        }
        else {
            console.error(`Migration ${lastMigrationName} does not have a down() function.`);
        }
    }
    // Update index.ts
    const indexContent = `
export const migrations = [
${migrations.map(m => `    '${m}'`).join(',\n')}
];

export const completed = [
${completed.map(m => `    '${m}'`).join(',\n')}
];

export const currentVersion = ${currentVersion};
`;
    fs.writeFileSync(indexFilePath, indexContent.trim() + '\n');
    console.log(`Migration runner finished. Current version: ${currentVersion}`);
}
run().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
