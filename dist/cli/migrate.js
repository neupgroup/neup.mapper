#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
// Parse arguments
const args = process.argv.slice(2);
// Default command is to run all migrations ('run-all') if no command or just 'migrate'
// Commands: 'refresh', 'up', 'down'
// Usage:
// npx migrate -> runs all up
// npx migrate refresh -> down all, then up all
// npx migrate up -> runs one up
// npx migrate down -> runs one down
let command = 'run-all';
if (args[0] === 'refresh')
    command = 'refresh';
else if (args[0] === 'up')
    command = 'up';
else if (args[0] === 'down')
    command = 'down';
// Determine paths
const cwd = process.cwd();
const srcMapperDir = path.join(cwd, 'src/mapper');
const migrationsDir = path.join(srcMapperDir, 'migrations');
const connectionsFile = path.join(srcMapperDir, 'connections.ts');
const logFile = path.join(srcMapperDir, 'logs.ts');
// 1. Validate environment
if (!fs.existsSync(migrationsDir)) {
    console.error(`Migrations directory not found at ${migrationsDir}`);
    process.exit(1);
}
if (!fs.existsSync(connectionsFile)) {
    console.error(`Connections file not found at ${connectionsFile}`);
    process.exit(1);
}
// 2. Load Connections
function loadConnections() {
    const content = fs.readFileSync(connectionsFile, 'utf-8');
    try {
        const match = content.match(/export const connections = \s*(\[[\s\S]*\])\s*;?/);
        if (!match)
            throw new Error("Could not find 'connections' array");
        const connections = new Function(`return ${match[1]}`)();
        if (!Array.isArray(connections))
            throw new Error("Not an array");
        return connections;
    }
    catch (e) {
        console.error("Connection files damaged, please fix the connections before working on the migration.");
        process.exit(1);
    }
}
const connections = loadConnections();
// 3. Helper to validate connection for a migration
function validateConnection(migrationModule) {
    const usesConnection = migrationModule.usesConnection;
    let targetConnection;
    if (usesConnection) {
        targetConnection = connections.find((c) => c.name === usesConnection);
        if (!targetConnection) {
            console.error(`Connection '${usesConnection}' not found in connections file.`);
            process.exit(1);
        }
    }
    else {
        const defaults = connections.filter((c) => c.isDefault);
        if (defaults.length !== 1) {
            console.error("Connection files damaged, please fix the connections before working on the migration. (Multiple or no defaults found)");
            process.exit(1);
        }
        targetConnection = defaults[0];
    }
    return targetConnection;
}
function getMigrationLogs() {
    if (!fs.existsSync(logFile))
        return [];
    try {
        const content = fs.readFileSync(logFile, 'utf-8');
        // Extract array from "export const logs = [...]"
        const match = content.match(/export const logs = \s*(\[[\s\S]*\])\s*;?/);
        if (!match)
            return [];
        return JSON.parse(match[1]);
    }
    catch (e) {
        console.warn("Warning: logs.ts is corrupted. Starting with empty state.");
        return [];
    }
}
function getExecutedMigrations() {
    const logs = getMigrationLogs();
    const executed = [];
    for (const entry of logs) {
        if (entry.status === 'success') {
            if (entry.direction === 'up') {
                executed.push(entry.filename);
            }
            else if (entry.direction === 'down') {
                const index = executed.lastIndexOf(entry.filename);
                if (index !== -1) {
                    executed.splice(index, 1);
                }
            }
        }
    }
    return executed;
}
function logAction(filename, action, success, error) {
    const logs = getMigrationLogs();
    const entry = {
        filename: filename,
        status: success ? 'success' : 'failed',
        timestamp: new Date().toISOString(),
        direction: action
    };
    if (!success && error) {
        entry.error = error instanceof Error ? error.message : String(error);
    }
    logs.push(entry);
    const fileContent = `export const logs = ${JSON.stringify(logs, null, 4)};\n`;
    fs.writeFileSync(logFile, fileContent);
    if (success) {
        console.log(`${filename}.${action} success`);
    }
    else {
        console.log(`${filename}.${action} failed`);
        if (entry.error)
            console.error(`Error: ${entry.error}`);
    }
}
// 5. Migration Discovery
// Read files directly from src/mapper/migrations, ignore index.ts
const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.ts') && f !== 'index.ts')
    .sort(); // Lexicographical sort (timestamp based)
const executedState = getExecutedMigrations();
async function runUp(filename) {
    console.log(`Migrating Up: ${filename}`);
    try {
        const migPath = path.join(migrationsDir, filename + '.ts');
        const migration = await import(migPath);
        validateConnection(migration);
        await migration.up();
        logAction(filename, 'up', true);
    }
    catch (e) {
        console.error(e);
        logAction(filename, 'up', false, e);
        process.exit(1);
    }
}
async function runDown(filename) {
    console.log(`Migrating Down: ${filename}`);
    try {
        const migPath = path.join(migrationsDir, filename + '.ts');
        const migration = await import(migPath);
        validateConnection(migration);
        await migration.down();
        logAction(filename, 'down', true);
    }
    catch (e) {
        console.error(e);
        logAction(filename, 'down', false, e);
        process.exit(1);
    }
}
async function main() {
    if (command === 'run-all') {
        // Run all pending migrations
        for (const file of migrationFiles) {
            const name = file.replace('.ts', '');
            if (!executedState.includes(name)) {
                await runUp(name);
            }
        }
    }
    else if (command === 'up') {
        // Run exactly ONE pending migration (the next one)
        for (const file of migrationFiles) {
            const name = file.replace('.ts', '');
            if (!executedState.includes(name)) {
                await runUp(name);
                break; // Only one
            }
        }
    }
    else if (command === 'down') {
        // Revert exactly ONE executed migration (the last one)
        const lastExecuted = executedState[executedState.length - 1];
        if (lastExecuted) {
            await runDown(lastExecuted);
        }
        else {
            console.log("No migrations to revert.");
        }
    }
    else if (command === 'refresh') {
        // Down all executed (in reverse order), then Up all available
        const toRevert = [...executedState].reverse();
        for (const name of toRevert) {
            await runDown(name);
        }
        // Reload state? We need to re-read it because runDown modified the file
        // but our local variable 'executedState' is stale.
        // Actually, runDown exits process on failure, so if we are here, all success.
        // But runDown appends to log file. 'executedState' variable is not updated.
        // However, we just want to run ALL migrations now.
        // Since we reverted everything, logically executedState is empty.
        for (const file of migrationFiles) {
            const name = file.replace('.ts', '');
            await runUp(name);
        }
    }
}
main().catch(e => {
    console.error(e);
    process.exit(1);
});
