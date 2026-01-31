
import * as fs from 'fs';
import * as path from 'path';
import { StaticMapper } from './fluent-mapper.js';

/**
 * Automatically discovers and registers connections and schemas 
 * from the standard directory structure.
 */
export async function discover() {
    // 1. Discover Connections
    const configDirs = [
        path.resolve(process.cwd(), 'src/config'),
        path.resolve(process.cwd(), 'src/connection')
    ];

    for (const dir of configDirs) {
        if (fs.existsSync(dir)) {
            const files = fs.readdirSync(dir).filter(f => f.endsWith('.ts') || f.endsWith('.js'));
            for (const file of files) {
                const filePath = path.resolve(dir, file);
                try {
                    const mod = await import('file://' + filePath);

                    // Support connections array
                    if (mod.connections && Array.isArray(mod.connections)) {
                        for (const conn of mod.connections) {
                            StaticMapper.makeConnection(conn.name, conn.type, conn);
                        }
                    }
                    // Support legacy config object
                    else if (mod.config) {
                        const name = file.split('.')[0];
                        StaticMapper.makeConnection(name, mod.config.type, mod.config);
                    }
                } catch (e: any) {
                    // console.warn(`Discovery: Failed to load connection from ${file}`);
                }
            }
        }
    }

    // 2. Discover Schemas
    const schemasDir = path.resolve(process.cwd(), 'src/schemas');
    if (fs.existsSync(schemasDir)) {
        const files = fs.readdirSync(schemasDir).filter(f => f.endsWith('.ts') || f.endsWith('.js'));
        for (const file of files) {
            const schemaName = file.split('.')[0];
            const filePath = path.resolve(schemasDir, file);
            try {
                const mod = await import('file://' + filePath);
                // Look for the exported schema object (usually named after the file/table)
                const schemaDef = mod[schemaName] || mod.schema || mod.default;

                if (schemaDef && schemaDef.fields) {
                    const connectionName = schemaDef.usesConnection || 'default';

                    StaticMapper.schema(schemaName)
                        .create()
                        .structure(schemaDef.fields);

                    // Apply options if present
                    // Apply options if present
                    if (schemaDef.insertableFields || schemaDef.updatableFields) {
                        const wrapper: any = (StaticMapper as any).getFluentMapper().mapper.getSchemaManager().create(schemaName);
                        if (schemaDef.insertableFields) wrapper.insertableFields = schemaDef.insertableFields;
                        if (schemaDef.updatableFields) wrapper.updatableFields = schemaDef.updatableFields;
                        if (schemaDef.massUpdateable !== undefined) wrapper.massEditAllowed = schemaDef.massUpdateable;
                        if (schemaDef.massDeletable !== undefined) wrapper.massDeleteAllowed = schemaDef.massDeletable;
                    }
                }
            } catch (e: any) {
                // console.warn(`Discovery: Failed to load schema from ${file}`);
            }
        }
    }
}
