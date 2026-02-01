#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { createMapper } from '../mapper.js';

const args = process.argv.slice(2);
const command = args[0] || 'up'; // up, down, init, refresh
const limit = args[1] ? parseInt(args[1], 10) : null;

// Determine paths
const cwd = process.cwd();
const srcMapperDir = path.join(cwd, 'src/mapper');
const distMapperDir = path.join(cwd, 'dist/mapper');

// Determine registry path (prioritize dist/compiled code)
const distRegistryPath = path.join(distMapperDir, 'migrations/index.js');
const srcRegistryPath = path.join(srcMapperDir, 'migrations/index.ts');

const registryPath = fs.existsSync(distRegistryPath) ? distRegistryPath : srcRegistryPath;

async function main() {
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
  // We prefer src/mapper for the state file if it exists (so it persists), otherwise dist or cwd
  let stateDir = srcMapperDir;
  if (!fs.existsSync(srcMapperDir)) {
      if (fs.existsSync(distMapperDir)) stateDir = distMapperDir;
      else stateDir = cwd; // Fallback to root
  }
  
  const stateFile = path.join(stateDir, '.migration_state.json');
  let state = { executed: [] as string[] };
  if (fs.existsSync(stateFile)) {
    state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
  }

  // Initialize mapper (auto-configure from environment/files)
  const mapper = createMapper();

  if (command === 'up') {
    console.log('Running pending migrations...');
    let count = 0;
    for (const mig of migrations) {
      if (limit && count >= limit) break;
      if (!state.executed.includes(mig.name)) {
        console.log(`Migrating: ${mig.name}`);
        try {
          await mig.up();
          state.executed.push(mig.name);
          fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
          console.log(`Completed: ${mig.name}`);
          count++;
        } catch (e: any) {
          console.error(`Failed to run migration ${mig.name}:`, e);
          process.exit(1);
        }
      }
    }
  } else if (command === 'down') {
    const steps = limit || 1;
    for (let i = 0; i < steps; i++) {
        const lastMigration = state.executed.pop();
        if (lastMigration) {
            const mig = migrations.find((m: any) => m.name === lastMigration);
            if (mig) {
                console.log(`Rolling back: ${lastMigration}`);
                try {
                    await mig.down();
                    fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
                    console.log(`Rolled back: ${lastMigration}`);
                } catch (e: any) {
                    console.error(`Failed to rollback ${lastMigration}:`, e);
                    process.exit(1);
                }
            }
        } else {
            console.log('No executed migrations to rollback.');
            break;
        }
    }
  } else if (command === 'refresh') {
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
