#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Usage: npm run create-connection <connectionName> <type> [--default]

Arguments:
  connectionName   Name for your connection (a-z, 0-9 only, no special chars)
  type             Database type (mysql, postgres, sqlite, mongodb)

Options:
  --default        Make this connection the default one
  --help, -h       Show this help message

Example:
  npm run create-connection mydb mysql --default
`);
    process.exit(0);
}
const rawName = args[0];
const rawType = args[1];
const isDefaultFlag = args.includes('--default');
if (!rawName || !rawType) {
    console.error('Error: Connection name and type are required.');
    process.exit(1);
}
const connectionName = rawName.toLowerCase();
if (!/^[a-z0-9]+$/.test(connectionName)) {
    console.error('Error: Connection name must contain only letters (a-z) and numbers (0-9).');
    process.exit(1);
}
// Map Type
let type = rawType.toLowerCase();
if (['postgresql', 'postgre', 'postgres'].includes(type))
    type = 'postgres';
else if (['mariadb', 'mysql'].includes(type))
    type = 'mysql';
else if (['sqlitedb', 'sqlite'].includes(type))
    type = 'sqlite';
else if (type === 'mongodb')
    type = 'mongodb';
else {
    console.error(`Error: Unsupported connection type '${rawType}'.`);
    process.exit(1);
}
const cwd = process.cwd();
const tsConfigPath = path.resolve(cwd, 'mapper.config.ts');
const jsonConfigPath = path.resolve(cwd, 'mapper.config.json');
// Create template
let template = {
    name: connectionName,
    type: type
};
if (type === 'mysql' || type === 'postgres') {
    template = {
        ...template,
        host: 'localhost',
        port: type === 'mysql' ? 3306 : 5432,
        user: 'root',
        password: '',
        database: connectionName
    };
}
else if (type === 'sqlite') {
    template = {
        ...template,
        filename: `${connectionName}.db`
    };
}
else if (type === 'mongodb') {
    template = {
        ...template,
        url: 'mongodb://localhost:27017/' + connectionName
    };
}
if (isDefaultFlag)
    template.isDefault = true;
// Helper to update TS file
function updateTsConfig(filePath, newConnection) {
    let content = fs.readFileSync(filePath, 'utf-8');
    // Check duplicate
    if (content.includes(`name: "${connectionName}"`) || content.includes(`name: '${connectionName}'`)) {
        console.warn(`Warning: Connection '${connectionName}' already exists.`);
        return;
    }
    // Handle default flag logic (basic string replace)
    if (isDefaultFlag) {
        content = content.replace(/isDefault:\s*true/g, 'isDefault: false');
    }
    // Insert into connections array
    const connectionsRegex = /connections:\s*\[/;
    if (!connectionsRegex.test(content)) {
        console.error("Could not find 'connections: [' in ts config.");
        process.exit(1);
    }
    const insertion = `\n    ${JSON.stringify(newConnection, null, 2).replace(/"([^"]+)":/g, '$1:').replace(/"/g, "'")},`;
    content = content.replace(connectionsRegex, `connections: [${insertion}`);
    fs.writeFileSync(filePath, content);
    console.log(`✓ Added connection '${connectionName}' to ${filePath}`);
}
// Handle Files
if (fs.existsSync(tsConfigPath)) {
    updateTsConfig(tsConfigPath, template);
}
else if (fs.existsSync(jsonConfigPath)) {
    // Handle JSON (legacy)
    const content = fs.readFileSync(jsonConfigPath, 'utf-8');
    const config = JSON.parse(content);
    if (config.connections.some((c) => c.name === connectionName)) {
        console.warn('Connection already exists in JSON.');
        process.exit(0);
    }
    if (isDefaultFlag) {
        config.connections.forEach((c) => c.isDefault = false);
    }
    config.connections.push(template);
    fs.writeFileSync(jsonConfigPath, JSON.stringify(config, null, 2));
    console.log(`✓ Added connection '${connectionName}' to ${jsonConfigPath}`);
}
else {
    // Create new TS config
    template.isDefault = true;
    const initialContent = `import type { MapperConfig } from '@neupgroup/mapper';

export const config: MapperConfig = {
  connections: [
    ${JSON.stringify(template, null, 2).replace(/"([^"]+)":/g, '$1:').replace(/"/g, "'")}
  ],
  schemas: []
};
`;
    fs.writeFileSync(tsConfigPath, initialContent);
    console.log(`✓ Created ${tsConfigPath} with connection '${connectionName}'`);
}
