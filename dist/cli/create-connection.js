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
const type = (args[1] || 'api').toLowerCase();
if (!connectionName) {
    console.error('Error: Connection name is required.');
    console.log('Usage: npm run create-connection <connectionName> [type]');
    process.exit(1);
}
const configDir = path.resolve(process.cwd(), 'src/config');
if (!fs.existsSync(configDir))
    fs.mkdirSync(configDir, { recursive: true });
const filePath = path.join(configDir, `${connectionName}.ts`);
let template = {
    name: connectionName,
    type: type
};
if (type === 'mysql' || type === 'postgres') {
    template = {
        ...template,
        host: '',
        port: type === 'mysql' ? 3306 : 5432,
        user: '',
        password: '',
        database: ''
    };
}
else if (type === 'sqlite') {
    template = {
        ...template,
        filename: ''
    };
}
else if (type === 'mongodb') {
    template = {
        ...template,
        url: ''
    };
}
else if (type === 'api') {
    template = {
        ...template,
        baseUrl: '',
        headers: {}
    };
}
const fileContent = `
export const connections = [
    ${JSON.stringify(template, null, 4)}
];
`;
fs.writeFileSync(filePath, fileContent.trim() + '\n');
console.log(`Created connection configuration: ${filePath}`);
