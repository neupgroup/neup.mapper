
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
                    Mapper.connect(name, config.type, config);
                }
            } catch (e: any) {
                console.warn(`Discovery: Failed to load connection from ${file}: ${e.message}`);
            }
        }
    }

    // 2. Discover Schemas
    const schemasDir = path.join(mapperDir, 'schemas');
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
                    const collectionName = schemaDef.collection || schemaName;

                    const builder = Mapper.schema(schemaName)
                        .create()
                        .useConnection(connectionName)
                        .structure(schemaDef.fields);

                    // Apply options if present
                    const options: any = {};
                    if (schemaDef.insertableFields) options.insertableFields = schemaDef.insertableFields;
                    if (schemaDef.updatableFields) options.updatableFields = schemaDef.updatableFields;
                    if (schemaDef.massUpdateable !== undefined) options.massEditAllowed = schemaDef.massUpdateable;
                    if (schemaDef.massDeletable !== undefined) options.massDeleteAllowed = schemaDef.massDeletable;
                    
                    if (Object.keys(options).length > 0) {
                        // Directly access the underlying definition to set options since SchemaCreator doesn't expose it
                        // This is a workaround until SchemaCreator supports setOptions
                        const def = (builder as any).mapper.getSchemaManager().use(schemaName).def;
                        if (def) {
                            if (options.insertableFields) def.insertableFields = options.insertableFields;
                            if (options.updatableFields) def.updatableFields = options.updatableFields;
                            if (options.massEditAllowed !== undefined) def.massEditAllowed = options.massEditAllowed;
                            if (options.massDeleteAllowed !== undefined) def.massDeleteAllowed = options.massDeleteAllowed;
                        }
                    }
                }
            } catch (e: any) {
                console.warn(`Discovery: Failed to load schema from ${file}: ${e.message}`);
            }
        }
    }
}
