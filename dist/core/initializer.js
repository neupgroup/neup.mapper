import { InitMapper } from './init-mapper.js';
import { ConfigLoader } from '../config-loader.js';
import * as path from 'path';
import * as fs from 'fs';
import { pathToFileURL } from 'url';
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
        // 1. Try Loading src/mapper/connections.ts (or dist/...)
        const possibleConnectionFiles = [
            path.join(cwd, 'src/mapper/connections.ts'),
            path.join(cwd, 'dist/mapper/connections.js'),
            path.join(cwd, 'src/mapper/connections.js')
        ];
        let connectionsLoaded = false;
        for (const file of possibleConnectionFiles) {
            if (fs.existsSync(file)) {
                try {
                    const fileUrl = pathToFileURL(file).href;
                    // Dynamic import
                    const mod = await import(fileUrl);
                    if (mod.connections && Array.isArray(mod.connections)) {
                        for (const conn of mod.connections) {
                            const name = conn.name || 'default';
                            init.connect(name, conn.type, conn);
                        }
                        connectionsLoaded = true;
                        break;
                    }
                }
                catch (e) {
                    // console.warn(`Failed to load connections from ${file}`, e);
                }
            }
        }
        // 2. Try Loading src/mapper/schemas.ts (or dist/...)
        const possibleSchemaFiles = [
            path.join(cwd, 'src/mapper/schemas.ts'),
            path.join(cwd, 'dist/mapper/schemas.js'),
            path.join(cwd, 'src/mapper/schemas.js')
        ];
        for (const file of possibleSchemaFiles) {
            if (fs.existsSync(file)) {
                try {
                    const fileUrl = pathToFileURL(file).href;
                    const mod = await import(fileUrl);
                    if (mod.schemas) {
                        init.loadSchemas(mod.schemas);
                        break;
                    }
                }
                catch (e) {
                    // console.warn(`Failed to load schemas from ${file}`, e);
                }
            }
        }
        // 3. Fallback to ConfigLoader (JSON)
        if (!connectionsLoaded && init.getConnections().list().length === 0) {
            const loader = ConfigLoader.getInstance();
            const defaultPaths = ['./mapper.config.json', './config/mapper.json', '/etc/mapper/config.json'];
            for (const p of defaultPaths) {
                try {
                    loader.loadFromFile(p);
                    const config = loader.getConfig();
                    if (config) {
                        for (const c of config.connections) {
                            init.connect(c.name, c.type, c);
                        }
                        break;
                    }
                }
                catch (e) { }
            }
        }
    })();
    return initializationPromise;
}
