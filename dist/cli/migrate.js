#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import { Mapper } from '../mapper.js';
// Parse arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Usage: npm run migrate [command]

Commands:
  up           Run the next pending migration
  down         Rollback the last executed migration
  refresh      Rollback all migrations and re-run them
  run-all      Run all pending migrations (default)
`);
    process.exit(0);
}
let command = 'run-all';
if (args[0] === 'refresh')
    command = 'refresh';
else if (args[0] === 'up')
    command = 'up';
else if (args[0] === 'down')
    command = 'down';
const cwd = process.cwd();
const mapperConfigTs = path.join(cwd, 'mapper.config.ts');
const mapperConfigJson = path.join(cwd, 'mapper.config.json');
const migrationsConfigTs = path.join(cwd, 'migrations.config.ts');
const migrationsConfigJson = path.join(cwd, 'migrations.config.json');
// Load Config
async function loadConfig(tsPath, jsonPath) {
    if (fs.existsSync(tsPath)) {
        try {
            const module = await import(tsPath + '?t=' + Date.now());
            return { config: module.config || module.default, type: 'ts', path: tsPath };
        }
        catch (e) {
            console.error(`Failed to load ${tsPath}:`, e);
            process.exit(1);
        }
    }
    else if (fs.existsSync(jsonPath)) {
        try {
            const content = fs.readFileSync(jsonPath, 'utf-8');
            return { config: JSON.parse(content), type: 'json', path: jsonPath };
        }
        catch (e) {
            console.error(`Failed to load ${jsonPath}:`, e);
            process.exit(1);
        }
    }
    return null;
}
// Update TS File
function updateTsMigration(filePath, id, updates) {
    let content = fs.readFileSync(filePath, 'utf-8');
    // Find ID
    const idRegex = new RegExp(`id:\\s*["']${id}["']`);
    const match = idRegex.exec(content);
    if (!match)
        return;
    const startIndex = match.index;
    // Determine the end of this object (heuristic: looking ahead until next 'id:')
    const nextIdRegex = /id:\s*["']/;
    const idMatchEnd = startIndex + match[0].length;
    const nextIdMatch = nextIdRegex.exec(content.slice(idMatchEnd));
    const searchEnd = nextIdMatch ? (idMatchEnd + nextIdMatch.index) : content.length;
    const effectiveEnd = Math.min(startIndex + 2000, searchEnd);
    const region = content.slice(startIndex, effectiveEnd);
    let regionModified = region;
    // Update status
    if (updates.status) {
        const statusRegex = /status:\s*["']([^"']*)["']/;
        if (statusRegex.test(regionModified)) {
            regionModified = regionModified.replace(statusRegex, `status: "${updates.status}"`);
        }
    }
    // Update executedAt
    if (updates.executedAt) {
        const execRegex = /executedAt:\s*["']([^"']*)["']/;
        if (execRegex.test(regionModified)) {
            regionModified = regionModified.replace(execRegex, `executedAt: "${updates.executedAt}"`);
        }
        else {
            // Append after status
            const statusRegex = /(status:\s*["'][^"']*["'])/;
            if (statusRegex.test(regionModified)) {
                regionModified = regionModified.replace(statusRegex, `$1,\n            executedAt: "${updates.executedAt}"`);
            }
        }
    }
    // Remove executedAt
    if (updates.removeExecutedAt) {
        const execRegex = /executedAt:\s*["']([^"']*)["'],?\s*/;
        if (execRegex.test(regionModified)) {
            regionModified = regionModified.replace(execRegex, '');
        }
    }
    // Replace in original content
    content = content.slice(0, startIndex) + regionModified + content.slice(effectiveEnd);
    fs.writeFileSync(filePath, content);
}
function appendLogTs(filePath, logEntry) {
    let content = fs.readFileSync(filePath, 'utf-8');
    const logsRegex = /logs:\s*\[/;
    if (logsRegex.test(content)) {
        const insertion = `\n    ${JSON.stringify(logEntry, null, 2).replace(/"([^"]+)":/g, '$1:').replace(/"/g, "'")},`;
        content = content.replace(logsRegex, `logs: [${insertion}`);
        fs.writeFileSync(filePath, content);
    }
}
// Save State
async function saveMigrationState(fileInfo, migrationId, action, success, error, duration) {
    const logEntry = {
        migrationId,
        timestamp: new Date().toISOString(),
        action,
        status: success ? 'success' : 'failed',
        duration: duration || 0
    };
    if (!success && error)
        logEntry.message = String(error);
    else if (success)
        logEntry.message = `Migration ${action} completed successfully`;
    if (fileInfo.type === 'ts') {
        const updates = {};
        if (success) {
            updates.status = action === 'up' ? 'completed' : 'pending';
            if (action === 'up')
                updates.executedAt = new Date().toISOString();
            else
                updates.removeExecutedAt = true;
        }
        else {
            updates.status = 'failed';
        }
        updateTsMigration(fileInfo.path, migrationId, updates);
        appendLogTs(fileInfo.path, logEntry);
    }
    else {
        // Handle JSON
        const content = fs.readFileSync(fileInfo.path, 'utf-8');
        const config = JSON.parse(content);
        if (!config.logs)
            config.logs = [];
        config.logs.push(logEntry);
        let m = null;
        if (Array.isArray(config.migrations)) {
            m = config.migrations.find((mig) => mig.id === migrationId);
        }
        else {
            m = config.migrations[migrationId];
        }
        if (m) {
            if (success) {
                m.status = action === 'up' ? 'completed' : 'pending';
                if (action === 'up')
                    m.executedAt = new Date().toISOString();
                else
                    delete m.executedAt;
            }
            else {
                m.status = 'failed';
            }
        }
        fs.writeFileSync(fileInfo.path, JSON.stringify(config, null, 2) + '\n');
    }
}
// Main
(async () => {
    console.log(`CWD: ${cwd}`);
    // Load config
    const mapperInfo = await loadConfig(mapperConfigTs, mapperConfigJson);
    const migrationsInfo = await loadConfig(migrationsConfigTs, migrationsConfigJson);
    if (!mapperInfo) {
        console.error("No mapper config found");
        process.exit(1);
    }
    if (!migrationsInfo) {
        console.error("No migrations config found");
        process.exit(1);
    }
    console.log(`Mapper Config: ${mapperInfo.path}`);
    console.log(`Migrations Config: ${migrationsInfo.path}`);
    // Register connections
    const connections = mapperInfo.config.connections || [];
    if (!Array.isArray(connections)) {
        console.error("Connections is not an array");
        process.exit(1);
    }
    connections.forEach((conn) => {
        try {
            const name = conn.name || 'default';
            Mapper.init().connect(name, conn.type, conn);
            console.log(`Registered connection: ${name} (${conn.type})`);
        }
        catch (e) {
            console.error(`Failed to register connection ${conn.name}:`, e);
        }
    });
    const rawMigrations = migrationsInfo.config.migrations || {};
    // Convert to array and sort
    const migrations = Array.isArray(rawMigrations)
        ? rawMigrations
        : Object.values(rawMigrations).sort((a, b) => (a.timestamp || a.id).localeCompare(b.timestamp || b.id));
    if (migrations.length === 0) {
        console.error("Please proposal some changes before requesting migration.");
        process.exit(1);
    }
    // Helper to get executed IDs from config object
    function getExecutedIds(migrationsList) {
        return migrationsList.filter((m) => m.status === 'completed' || m.status === 'success').map((m) => m.id);
    }
    let executedIds = getExecutedIds(migrations);
    // Run Logic
    async function runUp(m) {
        console.log(`Migrating Up: ${m.id}`);
        const start = Date.now();
        try {
            if (typeof m.up === 'function') {
                await m.up(Mapper);
            }
            else if (typeof m.up === 'string') {
                const AsyncFunction = Object.getPrototypeOf(async function () { }).constructor;
                const fn = new AsyncFunction('Mapper', m.up);
                await fn(Mapper);
            }
            await saveMigrationState(migrationsInfo, m.id, 'up', true, null, Date.now() - start);
        }
        catch (e) {
            console.error(e);
            await saveMigrationState(migrationsInfo, m.id, 'up', false, e, Date.now() - start);
            process.exit(1);
        }
    }
    async function runDown(m) {
        console.log(`Migrating Down: ${m.id}`);
        const start = Date.now();
        try {
            if (typeof m.down === 'function') {
                await m.down(Mapper);
            }
            else if (typeof m.down === 'string') {
                const AsyncFunction = Object.getPrototypeOf(async function () { }).constructor;
                const fn = new AsyncFunction('Mapper', m.down);
                await fn(Mapper);
            }
            await saveMigrationState(migrationsInfo, m.id, 'down', true, null, Date.now() - start);
        }
        catch (e) {
            console.error(e);
            await saveMigrationState(migrationsInfo, m.id, 'down', false, e, Date.now() - start);
            process.exit(1);
        }
    }
    if (command === 'run-all') {
        for (const m of migrations) {
            if (!executedIds.includes(m.id))
                await runUp(m);
        }
    }
    else if (command === 'up') {
        const pending = migrations.filter((m) => !executedIds.includes(m.id));
        if (pending.length === 0) {
            console.log("You're on top of all proposed changes.");
            process.exit(0);
        }
        await runUp(pending[0]);
    }
    else if (command === 'down') {
        const lastId = executedIds[executedIds.length - 1];
        if (!lastId) {
            console.log("You're at the bottom of the proposed changes.");
            process.exit(0);
        }
        const m = migrations.find((mig) => mig.id === lastId);
        if (m)
            await runDown(m);
    }
    else if (command === 'refresh') {
        const toRevert = [...executedIds].reverse();
        for (const id of toRevert) {
            const m = migrations.find((mig) => mig.id === id);
            if (m)
                await runDown(m);
        }
        // Re-run all
        for (const m of migrations) {
            await runUp(m);
        }
    }
    console.log('\n✓ Migration complete!');
})();
