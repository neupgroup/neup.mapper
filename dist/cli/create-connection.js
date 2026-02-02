#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Usage: npm run create-connection <connectionName> <type> [--default]

Arguments:
  connectionName   Name for your connection (a-z, 0-9 only, no special chars)
  type             Database type.
                   Supported types: mysql, mariadb, postgres, postgresql, sqlite, sqlitedb, mongodb

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
// 1. Validate existence
if (!rawName || !rawType) {
    console.error('Error: Connection name and type are required.');
    console.log('Usage: npm run create-connection <connectionName> <type> [--default]');
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
}
else if (['mariadb', 'mysql'].includes(type)) {
    type = 'mysql';
}
else if (['sqlitedb', 'sqlite'].includes(type)) {
    type = 'sqlite';
}
else if (type === 'mongodb') {
    type = 'mongodb';
}
else {
    console.error(`Error: Unsupported connection type '${rawType}'.`);
    console.log('Supported types: mysql, mariadb, postgres, postgresql, sqlite, sqlitedb, mongodb');
    process.exit(1);
}
const configDir = path.resolve(process.cwd(), 'src/mapper');
if (!fs.existsSync(configDir))
    fs.mkdirSync(configDir, { recursive: true });
const filePath = path.join(configDir, 'connections.ts');
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
// Handle file operations
if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf-8');
    // Validation Check: Try to extract and parse the array
    try {
        const match = content.match(/export const connections = \s*(\[[\s\S]*\])\s*;?/);
        if (!match) {
            throw new Error("Could not find 'connections' array in file.");
        }
        // Basic syntax check using new Function (eval-like) to ensure it's valid JS/TS structure
        // We don't use the result here, just checking for syntax errors
        new Function(`return ${match[1]}`);
    }
    catch (e) {
        console.warn(`Warning: The file ${filePath} seems to be broken or has invalid syntax.`);
        console.warn('Please repair or delete the file to continue.');
        process.exit(1);
    }
    // Strict duplicate check
    if (content.includes(`"name": "${connectionName}"`) || content.includes(`name: '${connectionName}'`) || content.includes(`name: "${connectionName}"`)) {
        console.warn(`Warning: Connection '${connectionName}' already exists in ${filePath}. No changes made.`);
        process.exit(0); // Exit without error, but no changes
    }
    // Parse logic (simplified regex/string manipulation)
    // We need to check if any connection is default
    const hasDefault = content.includes('"isDefault": true') || content.includes('isDefault: true');
    if (!hasDefault && !isDefaultFlag) {
        console.error('Error: No default connection exists. Please create a default connection first or use --default flag.');
        process.exit(1);
    }
    if (isDefaultFlag) {
        // We need to unset existing default
        content = content.replace(/"isDefault": true/g, '"isDefault": false');
        content = content.replace(/isDefault: true/g, 'isDefault: false');
        template.isDefault = true;
    }
    // Append logic
    const lastBracketIndex = content.lastIndexOf(']');
    if (lastBracketIndex !== -1) {
        const contentBefore = content.substring(0, lastBracketIndex).trim();
        const hasItems = contentBefore.endsWith('}') || contentBefore.endsWith(']');
        const newConnectionStr = JSON.stringify(template, null, 4);
        const insertion = (hasItems ? ',' : '') + '\n    ' + newConnectionStr;
        content = content.substring(0, lastBracketIndex) + insertion + '\n' + content.substring(lastBracketIndex);
        fs.writeFileSync(filePath, content);
        console.log(`Updated connection configuration: ${filePath}`);
    }
    else {
        console.error(`Error: Could not parse existing connections file at ${filePath}.`);
        process.exit(1);
    }
}
else {
    // New file - this becomes default automatically
    template.isDefault = true;
    const newConnectionStr = JSON.stringify(template, null, 4);
    const fileContent = `
export const connections = [
    ${newConnectionStr}
];
`;
    fs.writeFileSync(filePath, fileContent.trim() + '\n');
    console.log(`Created connection configuration: ${filePath}`);
}
