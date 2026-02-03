#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { pathToFileURL } from 'url';
import { Mapper } from '../mapper.js';

// Try to register ts-node for handling .ts files
try {
    // We need to use createRequire to import 'ts-node' in ESM context if we want to use register()
    // Or just import it.
    // Since we are in ESM (dist/cli/migrate.js), we can try import.
    // But register() is synchronous?
    // Let's rely on the user having ts-node or us providing it.
    // We installed it in dependencies.
    const { register } = await import('ts-node');
    register({
        compilerOptions: {
            module: 'CommonJS' // Force CJS for migrations if possible, or ESM?
            // Migrations use 'import { Mapper } ...', so they are ESM.
            // If we set module: NodeNext, ts-node handles ESM.
        },
        esm: true // Enable ESM support
    });
} catch (e) {
    console.warn('ts-node not found or failed to register. TypeScript migrations might fail.');
}

// Parse arguments
const args = process.argv.slice(2);
let command = 'run-all';
if (args[0] === 'refresh') command = 'refresh';
else if (args[0] === 'up') command = 'up';
else if (args[0] === 'down') command = 'down';

// Determine paths
const cwd = process.cwd();
const srcMapperDir = path.join(cwd, 'src/mapper');
const migrationsDir = path.join(srcMapperDir, 'migrations');
const connectionsFile = path.join(srcMapperDir, 'connections.ts');
const logFile = path.join(srcMapperDir, 'logs.ts');

// Validate environment
if (!fs.existsSync(migrationsDir)) {
    console.error(`Migrations directory not found at ${migrationsDir}`);
    process.exit(1);
}

if (!fs.existsSync(connectionsFile)) {
    console.error(`Connections file not found at ${connectionsFile}`);
    process.exit(1);
}

// Load Connections
async function loadConnections() {
    // We can use dynamic import for connections.ts too!
    try {
        const fileUrl = pathToFileURL(connectionsFile).href;
        const module = await import(fileUrl);
        return module.connections;
    } catch (e) {
        console.error("Failed to load connections file:", e);
        process.exit(1);
    }
}

// State Management
interface MigrationLogEntry {
    filename: string;
    status: 'success' | 'failed';
    error?: string;
    timestamp: string;
    direction: 'up' | 'down';
}

function getMigrationLogs(): MigrationLogEntry[] {
    if (!fs.existsSync(logFile)) return [];
    try {
        const content = fs.readFileSync(logFile, 'utf-8');
        const match = content.match(/export const logs = \s*(\[[\s\S]*\])\s*;?/);
        if (!match) return [];
        return JSON.parse(match[1]);
    } catch (e) {
        return [];
    }
}

function getExecutedMigrations(): string[] {
    const logs = getMigrationLogs();
    const executed: string[] = [];
    for (const entry of logs) {
        if (entry.status === 'success') {
            if (entry.direction === 'up') executed.push(entry.filename);
            else if (entry.direction === 'down') {
                const index = executed.lastIndexOf(entry.filename);
                if (index !== -1) executed.splice(index, 1);
            }
        }
    }
    return executed;
}

function logAction(filename: string, action: 'up' | 'down', success: boolean, error?: any) {
    const logs = getMigrationLogs();
    const entry: MigrationLogEntry = {
        filename: filename,
        status: success ? 'success' : 'failed',
        timestamp: new Date().toISOString(),
        direction: action
    };
    if (!success && error) entry.error = error instanceof Error ? error.message : String(error);
    logs.push(entry);
    const fileContent = `export const logs = ${JSON.stringify(logs, null, 4)};\n`;
    fs.writeFileSync(logFile, fileContent);
    if (success) console.log(`${filename} ${action} success`);
    else console.error(`${filename} ${action} failed:`, entry.error);
}

async function runUp(filename: string) {
    console.log(`Migrating Up: ${filename}`);
    try {
        const migPath = path.join(migrationsDir, filename + '.ts');
        const fileUrl = pathToFileURL(migPath).href;
        const migration = await import(fileUrl);
        
        if (migration.up) await migration.up();
        logAction(filename, 'up', true);
    } catch (e) {
        console.error(e);
        logAction(filename, 'up', false, e);
        process.exit(1);
    }
}

async function runDown(filename: string) {
    console.log(`Migrating Down: ${filename}`);
    try {
        const migPath = path.join(migrationsDir, filename + '.ts');
        const fileUrl = pathToFileURL(migPath).href;
        const migration = await import(fileUrl);
        
        if (migration.down) await migration.down();
        logAction(filename, 'down', true);
    } catch (e) {
        console.error(e);
        logAction(filename, 'down', false, e);
        process.exit(1);
    }
}

(async () => {
    console.log(`CWD: ${process.cwd()}`);
    console.log(`Migrations Dir: ${migrationsDir}`);

    // Load and register connections
    const connections = await loadConnections();
    if (!Array.isArray(connections)) {
        console.error("Connections export is not an array");
        process.exit(1);
    }

    connections.forEach((conn: any) => {
        try {
            // Register as 'default' if isDefault is true, otherwise use name
            const name = conn.isDefault ? 'default' : (conn.name || 'default');
            Mapper.init().connect(name, conn.type, conn);
            console.log(`Registered connection: ${name} (${conn.type})`);
            
            // Also register with original name if it differs, just in case
            if (conn.isDefault && conn.name && conn.name !== 'default') {
                 Mapper.init().connect(conn.name, conn.type, conn);
            }
        } catch (e) {
            console.error(`Failed to register connection ${conn.name}:`, e);
        }
    });

    const migrationFiles = fs.readdirSync(migrationsDir)
        .filter(f => f.endsWith('.ts'))
        .sort();
        
    const executedState = getExecutedMigrations();

    if (command === 'run-all') {
        for (const file of migrationFiles) {
            const name = file.replace('.ts', '');
            if (!executedState.includes(name)) await runUp(name);
        }
    } else if (command === 'up') {
        for (const file of migrationFiles) {
            const name = file.replace('.ts', '');
            if (!executedState.includes(name)) {
                await runUp(name);
                break;
            }
        }
    } else if (command === 'down') {
        const lastExecuted = executedState[executedState.length - 1];
        if (lastExecuted) await runDown(lastExecuted);
        else console.log("No migrations to revert.");
    } else if (command === 'refresh') {
        const toRevert = [...executedState].reverse();
        for (const name of toRevert) await runDown(name);
        for (const file of migrationFiles) {
            const name = file.replace('.ts', '');
            await runUp(name);
        }
    }
})();
