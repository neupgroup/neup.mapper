import * as fs from 'fs';
import * as path from 'path';

async function generateMapperConfig() {
    const cwd = process.cwd();
    const mapperDir = path.join(cwd, 'src', 'mapper');
    const connectionsDir = path.join(mapperDir, 'connections');
    const schemasDir = path.join(mapperDir, 'schemas');
    const outputFile = path.join(cwd, 'src', 'Mapper.ts');

    console.log(`Scanning for mapper configuration in ${mapperDir}...`);

    let connectionsFiles: string[] = [];
    if (fs.existsSync(connectionsDir)) {
        connectionsFiles = fs.readdirSync(connectionsDir).filter(f => f.endsWith('.ts') || f.endsWith('.js'));
    }

    let schemasFiles: string[] = [];
    if (fs.existsSync(schemasDir)) {
        schemasFiles = fs.readdirSync(schemasDir).filter(f => f.endsWith('.ts') || f.endsWith('.js'));
    }

    const imports: string[] = [];
    const registrations: string[] = [];

    // Header
    imports.push(`import { Mapper } from '@neupgroup/mapper';`);
    imports.push('');

    // Process Connections
    if (connectionsFiles.length > 0) {
        imports.push('// Connections');
        for (const file of connectionsFiles) {
            const name = file.split('.')[0];
            const importName = `connection_${name}`;
            // Use relative path from src/Mapper.ts to src/mapper/connections/...
            imports.push(`import * as ${importName} from './mapper/connections/${name}';`);

            registrations.push(`// Register Connection: ${name}`);
            registrations.push(`const ${importName}_config = ${importName}.connection || ${importName}.default;`);
            registrations.push(`if (${importName}_config) {`);
            registrations.push(`    Mapper.connect(${importName}_config.name || '${name}', ${importName}_config.type, ${importName}_config);`);
            registrations.push(`}`);
            registrations.push('');
        }
    }

    // Process Schemas
    if (schemasFiles.length > 0) {
        imports.push('// Schemas');
        for (const file of schemasFiles) {
            const name = file.split('.')[0];
            const importName = `schema_${name}`;
            imports.push(`import * as ${importName} from './mapper/schemas/${name}';`);

            registrations.push(`// Register Schema: ${name}`);
            registrations.push(`const ${importName}_def = ${importName}['${name}'] || ${importName}.schema || ${importName}.default;`);
            registrations.push(`if (${importName}_def && ${importName}_def.fields) {`);
            registrations.push(`    const builder = Mapper.schema('${name}')`);
            registrations.push(`        .create()`);
            registrations.push(`        .useConnection(${importName}_def.usesConnection || 'default')`);
            registrations.push(`        .structure(${importName}_def.fields);`);
            registrations.push('');
            
            // Options logic copied from discovery.ts
            registrations.push(`    // Apply options`);
            registrations.push(`    const options: any = {};`);
            registrations.push(`    if (${importName}_def.insertableFields) options.insertableFields = ${importName}_def.insertableFields;`);
            registrations.push(`    if (${importName}_def.updatableFields) options.updatableFields = ${importName}_def.updatableFields;`);
            registrations.push(`    if (${importName}_def.massUpdateable !== undefined) options.massEditAllowed = ${importName}_def.massUpdateable;`);
            registrations.push(`    if (${importName}_def.massDeletable !== undefined) options.massDeleteAllowed = ${importName}_def.massDeletable;`);
            registrations.push('');
            registrations.push(`    if (Object.keys(options).length > 0) {`);
            registrations.push(`        const def = (builder as any).mapper.getSchemaManager().use('${name}').def;`);
            registrations.push(`        if (def) {`);
            registrations.push(`            if (options.insertableFields) def.insertableFields = options.insertableFields;`);
            registrations.push(`            if (options.updatableFields) def.updatableFields = options.updatableFields;`);
            registrations.push(`            if (options.massEditAllowed !== undefined) def.massEditAllowed = options.massEditAllowed;`);
            registrations.push(`            if (options.massDeleteAllowed !== undefined) def.massDeleteAllowed = options.massDeleteAllowed;`);
            registrations.push(`        }`);
            registrations.push(`    }`);
            registrations.push(`}`);
            registrations.push('');
        }
    }

    const content = [
        ...imports,
        '',
        '// Initialize Mapper',
        'const mapper = Mapper.init();',
        '',
        ...registrations,
        'export default mapper;',
        ''
    ].join('\n');

    fs.writeFileSync(outputFile, content);
    console.log(`Generated ${outputFile}`);
}

generateMapperConfig().catch(console.error);
