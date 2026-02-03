import * as fs from 'fs';
import * as path from 'path';
import { Mapper } from './mapper.js';
/**
 * Automatically discovers and registers connections and schemas
 * from the standard directory structure.
 */
export async function discover() {
    const mapperDir = path.resolve(process.cwd(), 'src/mapper');
    // 1. Discover Connections
    const connectionsDir = path.join(mapperDir, 'connections');
    if (fs.existsSync(connectionsDir)) {
        const files = fs.readdirSync(connectionsDir).filter(f => f.endsWith('.ts') || f.endsWith('.js'));
        for (const file of files) {
            const filePath = path.resolve(connectionsDir, file);
            try {
                const mod = await import('file://' + filePath);
                // Look for 'connection' export or default
                const config = mod.connection || mod.default;
                if (config) {
                    const name = config.name || file.split('.')[0];
                    Mapper.init().connect(name, config.type, config);
                }
            }
            catch (e) {
                console.warn(`Discovery: Failed to load connection from ${file}: ${e.message}`);
            }
        }
    }
    // 2. Discover Schemas
    // The new Mapper architecture does not require schema registration for basic CRUD.
    // Schema discovery is disabled in this version.
}
