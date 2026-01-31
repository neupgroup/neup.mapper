#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';

const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Usage: npm run migrate [command]

Commands:
  (none)     Run all pending migrations to reach top level
  up         Migrate one level up
  down       Migrate one level down (rollback)
  refresh    Roll back all migrations and run them all again

Options:
  --help, -h   Show this help message

Description:
  This command will look for migration files in src/migration,
  load database connections from src/config and src/connection,
  and execute pending changes on your database while updating local schema files.
`);
    process.exit(0);
}

// Commands: '' (all up), 'up' (1 up), 'down' (1 down), 'refresh' (all down then all up)
const command = args[0] || 'all';

const migrationDir = path.resolve(process.cwd(), 'src/migration');
const indexFilePath = path.join(migrationDir, 'index.ts');

if (!fs.existsSync(indexFilePath)) {
    console.log('No migrations found.');
    process.exit(0);
}

async function run() {
    // Load connections
    const dirs = [
        path.resolve(process.cwd(), 'src/connection'),
        path.resolve(process.cwd(), 'src/config')
    ];

    for (const dir of dirs) {
        if (fs.existsSync(dir)) {
            const { StaticMapper } = await import('../fluent-mapper.js');
            const files = fs.readdirSync(dir).filter(f => f.endsWith('.ts'));

            for (const file of files) {
                const name = file.replace('.ts', '');
                const filePath = path.resolve(dir, file);
                try {
                    const mod = await import('file://' + filePath);

                    if (mod.connections && Array.isArray(mod.connections)) {
                        for (const conn of mod.connections) {
                            StaticMapper.makeConnection(conn.name, conn.type, conn);
                        }
                    } else if (mod.config) {
                        StaticMapper.makeConnection(name, mod.config.type, mod.config);
                    }
                } catch (e: any) {
                    console.warn(`Failed to load connection from ${file}: ${e.message}`);
                }
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

    // Helper functions
    const runUp = async (migrationName: string) => {
        console.log(`Running migration UP: ${migrationName}...`);
        const filePath = path.join(migrationDir, `${migrationName}.ts`);
        const mod = await import('file://' + path.resolve(filePath));

        if (mod.up) {
            await mod.up();
            completed.push(migrationName);
            currentVersion = migrations.indexOf(migrationName);
            console.log(`Completed UP: ${migrationName}`);
            return true;
        } else {
            console.error(`Migration ${migrationName} does not have an up() function.`);
            return false;
        }
    };

    const runDown = async (migrationName: string) => {
        console.log(`Rolling back migration DOWN: ${migrationName}...`);
        const filePath = path.join(migrationDir, `${migrationName}.ts`);
        const mod = await import('file://' + path.resolve(filePath));

        if (mod.down) {
            await mod.down();
            completed.pop();
            currentVersion = completed.length > 0 ? migrations.indexOf(completed[completed.length - 1]) : -1;
            console.log(`Completed DOWN: ${migrationName}`);
            return true;
        } else {
            console.error(`Migration ${migrationName} does not have a down() function.`);
            return false;
        }
    };

    if (command === 'all' || command === 'up') {
        const pending = migrations.filter(m => !completed.includes(m));
        if (pending.length === 0) {
            console.log('No pending migrations.');
        } else {
            const toRun = command === 'up' ? [pending[0]] : pending;
            for (const m of toRun) {
                if (!(await runUp(m))) break;
            }
        }
    } else if (command === 'down') {
        if (completed.length === 0) {
            console.log('No migrations to roll back.');
        } else {
            const lastMigrationName = completed[completed.length - 1];
            await runDown(lastMigrationName);
        }
    } else if (command === 'refresh') {
        console.log('Refreshing migrations (Rollback all then run all)...');
        // 1. Rollback all
        const toRollback = [...completed].reverse();
        for (const m of toRollback) {
            await runDown(m);
        }
        // 2. Run all
        for (const m of migrations) {
            if (!(await runUp(m))) break;
        }
    }

    // Save state back to index.ts
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
    console.log(`Migration runner finished. Current version index: ${currentVersion}`);
}

run().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
