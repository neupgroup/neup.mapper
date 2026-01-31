#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';

const migrationDir = path.resolve(process.cwd(), 'src/migration');
const indexFilePath = path.join(migrationDir, 'index.ts');

if (!fs.existsSync(indexFilePath)) {
    console.log('No migrations found.');
    process.exit(0);
}

async function run() {
    const content = fs.readFileSync(indexFilePath, 'utf-8');
    const matchMigrations = content.match(/migrations = \[(.*?)\]/s);
    const matchCompleted = content.match(/completed = \[(.*?)\]/s);

    if (!matchMigrations) {
        console.log('No migrations list found in index.ts');
        return;
    }

    const migrations = matchMigrations[1].split(',').map(s => s.trim().replace(/['"]/g, '')).filter(Boolean);
    const completed = matchCompleted ? matchCompleted[1].split(',').map(s => s.trim().replace(/['"]/g, '')).filter(Boolean) : [];

    const pending = migrations.filter(m => !completed.includes(m));

    if (pending.length === 0) {
        console.log('No pending migrations.');
        return;
    }

    console.log(`Found ${pending.length} pending migrations.`);

    for (const m of pending) {
        console.log(`Running migration: ${m}...`);
        const filePath = path.join(migrationDir, `${m}.ts`);

        // Use path.relative to current working directory or absolute file:// URL
        const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(filePath);
        const mod = await import('file://' + absolutePath);

        if (mod.up) {
            await mod.up();
            completed.push(m);
            console.log(`Completed: ${m}`);
        } else {
            console.error(`Migration ${m} does not have an up() function.`);
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
`;
    fs.writeFileSync(indexFilePath, indexContent.trim() + '\n');
    console.log('Migration runner finished.');
}

run().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
