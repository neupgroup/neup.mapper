#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';

const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Usage: npm run create-connection <connectionName> <type>

Arguments:
  connectionName   Name for your connection (a-z, 0-9 only, no special chars)
  type             Database type.
                   Supported types: mysql, mariadb, postgres, postgresql, sqlite, sqlitedb, mongodb

Options:
  --help, -h       Show this help message

Example:
  npm run create-connection mydb mysql
`);
    process.exit(0);
}

const rawName = args[0];
const rawType = args[1];

// 1. Validate existence
if (!rawName || !rawType) {
    console.error('Error: Connection name and type are required.');
    console.log('Usage: npm run create-connection <connectionName> <type>');
    process.exit(1);
}

// 2. Normalize and Validate Name
const connectionName = rawName.toLowerCase();
if (!/^[a-z0-9]+$/.test(connectionName)) {
    console.error('Error: Connection name must contain only letters (a-z) and numbers (0-9). No special characters allowed.');
    process.exit(1);
}

// 3. Normalize and Map Type
let type = rawType.toLowerCase();
if (['postgresql', 'postgre', 'postgres'].includes(type)) {
    type = 'postgres';
} else if (['mariadb', 'mysql'].includes(type)) {
    type = 'mysql';
} else if (['sqlitedb', 'sqlite'].includes(type)) {
    type = 'sqlite';
} else if (type === 'mongodb') {
    type = 'mongodb';
} else {
    console.error(`Error: Unsupported connection type '${rawType}'.`);
    console.log('Supported types: mysql, mariadb, postgres, postgresql, sqlite, sqlitedb, mongodb');
    process.exit(1);
}

const configDir = path.resolve(process.cwd(), 'src/mapper/connection');
if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });

const filePath = path.join(configDir, `${connectionName}.ts`);

let template: any = {
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
} else if (type === 'sqlite') {
    template = {
        ...template,
        filename: `${connectionName}.db`
    };
} else if (type === 'mongodb') {
    template = {
        ...template,
        url: 'mongodb://localhost:27017/' + connectionName
    };
}

const fileContent = `
export const connections = [
    ${JSON.stringify(template, null, 4)}
];
`;

fs.writeFileSync(filePath, fileContent.trim() + '\n');
console.log(`Created connection configuration: ${filePath}`);
