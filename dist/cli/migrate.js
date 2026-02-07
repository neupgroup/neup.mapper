#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import { pathToFileURL } from 'url';
import { Mapper } from '../mapper.js';
// Try to register ts-node for handling .ts files
try {
    const { register } = await import('ts-node');
    register({
        compilerOptions: {
            module: 'CommonJS'
        },
        esm: true
    });
}
catch (e) {
    console.warn('ts-node not found or failed to register. TypeScript migrations might fail.');
}
// Parse arguments
const args = process.argv.slice(2);
let command = 'run-all';
if (args[0] === 'refresh')
    command = 'refresh';
else if (args[0] === 'up')
    command = 'up';
else if (args[0] === 'down')
    command = 'down';
// Determine paths
const cwd = process.cwd();
const srcMapperDir = path.join(cwd, 'mapper');
const migrationsFile = path.join(srcMapperDir, 'migrations.ts');
const connectionsFile = path.join(srcMapperDir, 'connections.ts');
const logFile = path.join(srcMapperDir, 'logs.ts');
// Validate environment
if (!fs.existsSync(connectionsFile)) {
    console.error(`Connections file not found at ${connectionsFile}`);
    process.exit(1);
}
// Load Connections
async function loadConnections() {
    try {
        const fileUrl = pathToFileURL(connectionsFile).href;
        const module = await import(fileUrl);
        return module.connections;
    }
    catch (e) {
        console.error("Failed to load connections file:", e);
        process.exit(1);
    }
}
// Load Migrations
async function loadMigrations() {
    if (!fs.existsSync(migrationsFile)) {
        console.error(`Migrations file not found at ${migrationsFile}`);
        process.exit(1);
    }
    try {
        const fileUrl = pathToFileURL(migrationsFile).href;
        const module = await import(fileUrl);
        return module.migrations;
    }
    catch (e) {
        console.error("Failed to load migrations file:", e);
        process.exit(1);
    }
}
function getMigrationLogs() {
    if (!fs.existsSync(logFile))
        return [];
    try {
        const content = fs.readFileSync(logFile, 'utf-8');
        const match = content.match(/export const logs = \s*(\[[\s\S]*\])\s*;?/);
        if (!match)
            return [];
        return JSON.parse(match[1]);
    }
    catch (e) {
        return [];
    }
}
function getExecutedMigrations() {
    const logs = getMigrationLogs();
    const executed = [];
    for (const entry of logs) {
        if (entry.status === 'success') {
            if (entry.direction === 'up')
                executed.push(entry.filename);
            else if (entry.direction === 'down') {
                const index = executed.lastIndexOf(entry.filename);
                if (index !== -1)
                    executed.splice(index, 1);
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
    if (!success && error)
        entry.error = error instanceof Error ? error.message : String(error);
    logs.push(entry);
    const fileContent = `export const logs = ${JSON.stringify(logs, null, 4)};\n`;
    fs.writeFileSync(logFile, fileContent);
    if (success)
        console.log(`${filename} ${action} success`);
    else
        console.error(`${filename} ${action} failed:`, entry.error);
}
async function runUp(migration) {
    console.log(`Migrating Up: ${migration.name}`);
    try {
        if (migration.up)
            await migration.up();
        logAction(migration.name, 'up', true);
    }
    catch (e) {
        console.error(e);
        logAction(migration.name, 'up', false, e);
        process.exit(1);
    }
}
async function runDown(migration) {
    console.log(`Migrating Down: ${migration.name}`);
    try {
        if (migration.down)
            await migration.down();
        logAction(migration.name, 'down', true);
    }
    catch (e) {
        console.error(e);
        logAction(migration.name, 'down', false, e);
        process.exit(1);
    }
}
(async () => {
    console.log(`CWD: ${process.cwd()}`);
    console.log(`Migrations File: ${migrationsFile}`);
    // Load and register connections
    const connections = await loadConnections();
    if (!Array.isArray(connections)) {
        console.error("Connections export is not an array");
        process.exit(1);
    }
    connections.forEach((conn) => {
        try {
            const name = conn.isDefault ? 'default' : (conn.name || 'default');
            Mapper.init().connect(name, conn.type, conn);
            console.log(`Registered connection: ${name} (${conn.type})`);
            if (conn.isDefault && conn.name && conn.name !== 'default') {
                Mapper.init().connect(conn.name, conn.type, conn);
            }
        }
        catch (e) {
            console.error(`Failed to register connection ${conn.name}:`, e);
        }
    });
    const migrations = await loadMigrations();
    const executedState = getExecutedMigrations();
    if (command === 'run-all') {
        for (const m of migrations) {
            if (!executedState.includes(m.name))
                await runUp(m);
        }
    }
    else if (command === 'up') {
        for (const m of migrations) {
            if (!executedState.includes(m.name)) {
                await runUp(m);
                break;
            }
        }
    }
    else if (command === 'down') {
        const lastExecutedName = executedState[executedState.length - 1];
        if (lastExecutedName) {
            const m = migrations.find((m) => m.name === lastExecutedName);
            if (m)
                await runDown(m);
            else {
                console.error(`Migration ${lastExecutedName} recorded but not found in migrations file.`);
                // If not found, maybe just log action as down? But we can't execute down logic.
            }
        }
        else {
            console.log("No migrations to revert.");
        }
    }
    else if (command === 'refresh') {
        const toRevert = [...executedState].reverse();
        for (const name of toRevert) {
            const m = migrations.find((m) => m.name === name);
            if (m)
                await runDown(m);
        }
        for (const m of migrations) {
            await runUp(m);
        }
    }
})();
