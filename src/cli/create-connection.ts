#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';

const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Usage: npm run create-connection <connectionName> [type]

Arguments:
  connectionName   Name for your connection (e.g., 'primary_db')
  type             Database type (default: 'api'). 
                   Supported types: mysql, sqlite, postgres, mongodb, api

Options:
  --help, -h       Show this help message

Example:
  npm run create-connection my_db mysql
`);
    process.exit(0);
}

const connectionName = args[0];
const type = args[1] || 'api';

if (!connectionName) {
    console.error('Error: Connection name is required.');
    console.log('Usage: npm run create-connection <connectionName> [type]');
    process.exit(1);
}

const connectionDir = path.resolve(process.cwd(), 'src/connection');
if (!fs.existsSync(connectionDir)) fs.mkdirSync(connectionDir, { recursive: true });

const filePath = path.join(connectionDir, `${connectionName}.ts`);

let configTemplate = '';
if (type === 'mysql') {
    configTemplate = `
    type: 'mysql',
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: '${connectionName}'
`;
} else if (type === 'sqlite') {
    configTemplate = `
    type: 'sqlite',
    filename: './${connectionName}.db'
`;
} else {
    configTemplate = `
    type: '${type}',
    // Add configuration here
`;
}

const fileContent = `import { ConnectionConfig } from '@neupgroup/mapper';

export const config: ConnectionConfig = {
${configTemplate}
};
`;

fs.writeFileSync(filePath, fileContent.trim());
console.log(`Created connection file: ${filePath} `);
