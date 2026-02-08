import { InitMapper } from './init-mapper.js';
import * as path from 'path';
import * as fs from 'fs';
import { pathToFileURL } from 'url';

let initializationPromise: Promise<void> | null = null;

export async function ensureInitialized(): Promise<void> {
    const init = InitMapper.getInstance();
    // If we have connections, we are good.
    if (init.getConnections().list().length > 0) return;

    if (initializationPromise) return initializationPromise;

    initializationPromise = (async () => {
        // Double check inside promise
        if (init.getConnections().list().length > 0) return;

        const cwd = process.cwd();

        // 1. Try Loading mapper/connections.ts
        const possibleConnectionFiles = [
            path.join(cwd, 'mapper/connections.ts'),
            path.join(cwd, 'mapper/connections.js'),
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
                } catch (e) {
                    // console.warn(`Failed to load connections from ${file}`, e);
                }
            }
        }

        // 2. Try Loading mapper/schemas.ts
        const possibleSchemaFiles = [
            path.join(cwd, 'mapper/schemas.ts'),
            path.join(cwd, 'mapper/schemas.js'),
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
                } catch (e) {
                    // console.warn(`Failed to load schemas from ${file}`, e);
                }
            }
        }
    })();

    return initializationPromise;
}
