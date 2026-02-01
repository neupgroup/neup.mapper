#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import { createMapper } from '../mapper.js';
const args = process.argv.slice(2);
const command = args[0] || 'up'; // up, down, init, refresh
// Determine paths
const mapperDir = path.resolve(process.cwd(), 'src/mapper');
const migrationsDir = path.join(mapperDir, 'migrations');
const schemasDir = path.join(mapperDir, 'schemas');
async function main() {
    const registryPath = path.join(migrationsDir, 'index.ts');
    if (!fs.existsSync(registryPath)) {
        console.error(`No migrations found at ${registryPath}`);
        console.error('Run "npm run create-migration <name>" first.');
        process.exit(1);
    }
    // Import migrations registry
    // We need to use a dynamic import with absolute path
    const registry = await import(registryPath);
    const migrations = registry.migrations;
    if (!migrations || migrations.length === 0) {
        console.log('No migrations registered.');
        return;
    }
    // Get current state
    // Simple state tracking using a local file for now (or DB table in future)
    const stateFile = path.join(mapperDir, '.migration_state.json');
    let state = { executed: [] };
    if (fs.existsSync(stateFile)) {
        state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
    }
    // Initialize mapper (auto-configure from environment/files)
    const mapper = createMapper();
    if (command === 'up') {
        console.log('Running pending migrations...');
        for (const mig of migrations) {
            if (!state.executed.includes(mig.name)) {
                console.log(`Migrating: ${mig.name}`);
                try {
                    await mig.up();
                    state.executed.push(mig.name);
                    fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
                    console.log(`Completed: ${mig.name}`);
                }
                catch (e) {
                    console.error(`Failed to run migration ${mig.name}:`, e);
                    process.exit(1);
                }
            }
        }
    }
    else if (command === 'down') {
        const lastMigration = state.executed.pop();
        if (lastMigration) {
            const mig = migrations.find((m) => m.name === lastMigration);
            if (mig) {
                console.log(`Rolling back: ${lastMigration}`);
                try {
                    await mig.down();
                    fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
                    console.log(`Rolled back: ${lastMigration}`);
                }
                catch (e) {
                    console.error(`Failed to rollback ${lastMigration}:`, e);
                    process.exit(1);
                }
            }
        }
        else {
            console.log('No executed migrations to rollback.');
        }
    }
    else if (command === 'refresh') {
        // Down all, then Up all
        // Implementation omitted for brevity, but follows same pattern
        console.log('Refresh not fully implemented in this demo.');
    }
    console.log('Done.');
    process.exit(0);
}
main().catch(e => {
    console.error(e);
    process.exit(1);
});
