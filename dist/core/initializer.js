import { InitMapper } from './init-mapper.js';
import * as path from 'path';
import * as fs from 'fs';
let initializationPromise = null;
export async function ensureInitialized() {
    const init = InitMapper.getInstance();
    // If we have connections, we are good.
    if (init.getConnections().list().length > 0)
        return;
    if (initializationPromise)
        return initializationPromise;
    initializationPromise = (async () => {
        // Double check inside promise
        if (init.getConnections().list().length > 0)
            return;
        const cwd = process.cwd();
        // Try loading mapper.config.ts or .json
        const configTsFile = path.join(cwd, 'mapper.config.ts');
        const configJsonFile = path.join(cwd, 'mapper.config.json');
        let config = null;
        if (fs.existsSync(configTsFile)) {
            try {
                // Use dynamic import for TS file
                // cache busting with query param
                const module = await import(configTsFile + '?t=' + Date.now());
                config = module.config || module.default;
            }
            catch (e) {
                console.warn('Failed to load mapper.config.ts:', e);
            }
        }
        if (!config && fs.existsSync(configJsonFile)) {
            try {
                const configContent = fs.readFileSync(configJsonFile, 'utf-8');
                config = JSON.parse(configContent);
            }
            catch (e) {
                console.warn('Failed to load mapper.config.json:', e);
            }
        }
        if (config) {
            // Load connections
            if (config.connections && Array.isArray(config.connections)) {
                for (const conn of config.connections) {
                    const name = conn.name || 'default';
                    init.connect(name, conn.type, conn);
                }
            }
            // Load schemas - convert array to object keyed by table name
            if (config.schemas && Array.isArray(config.schemas)) {
                const schemasObj = {};
                for (const schema of config.schemas) {
                    if (schema.table) {
                        schemasObj[schema.table] = schema;
                    }
                }
                if (Object.keys(schemasObj).length > 0) {
                    init.loadSchemas(schemasObj);
                }
            }
        }
        // Try loading migrations.config.ts or .json
        const migrationsConfigTsFile = path.join(cwd, 'migrations.config.ts');
        const migrationsConfigJsonFile = path.join(cwd, 'migrations.config.json');
        let migrationsConfig = null;
        if (fs.existsSync(migrationsConfigTsFile)) {
            try {
                const module = await import(migrationsConfigTsFile + '?t=' + Date.now());
                migrationsConfig = module.config || module.default;
            }
            catch (e) {
                console.warn('Failed to load migrations.config.ts:', e);
            }
        }
        if (!migrationsConfig && fs.existsSync(migrationsConfigJsonFile)) {
            try {
                const migrationsContent = fs.readFileSync(migrationsConfigJsonFile, 'utf-8');
                migrationsConfig = JSON.parse(migrationsContent);
            }
            catch (e) {
                console.warn('Failed to load migrations.config.json:', e);
            }
        }
        if (migrationsConfig) {
            // Store migrations config in InitMapper for later use
            // This will be used by the migrator
            if (migrationsConfig.migrations || migrationsConfig.logs || migrationsConfig.settings) {
                // Store in a global location accessible by migrator
                global.__mapperMigrationsConfig = migrationsConfig;
            }
        }
    })();
    return initializationPromise;
}
