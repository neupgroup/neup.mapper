#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';

const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Usage: npm run update-connection <connectionName> [options]

Arguments:
  connectionName   Name of the connection to update

Options:
  --default        Make this connection the default
  --type-<type>    Change type to sqlite, mysql, postgres, mongodb, etc.
                   (e.g., --type-mysql, --type-postgres)
  --help, -h       Show this help message

Example:
  npm run update-connection mydb --default
  npm run update-connection mydb --type-mysql
`);
    process.exit(0);
}

const connectionName = args[0];
const isDefault = args.includes('--default');
const typeArg = args.find(a => a.startsWith('--type-'));

if (!connectionName) {
    console.error('Error: Connection name is required.');
    console.log('Usage: npm run update-connection <connectionName> [options]');
    process.exit(1);
}

const configDir = path.resolve(process.cwd(), 'src/mapper');
const filePath = path.join(configDir, 'connections.ts');

if (!fs.existsSync(filePath)) {
    console.error(`Error: Connections file not found at ${filePath}`);
    process.exit(1);
}

let content = fs.readFileSync(filePath, 'utf-8');

try {
    const match = content.match(/export const connections = \s*(\[[\s\S]*\])\s*;?/);
    if (!match) {
        throw new Error("Could not find 'connections' array in file.");
    }

    const arrayStr = match[1];
    
    // Attempt to parse
    let connections;
    try {
        connections = new Function(`return ${arrayStr}`)();
    } catch (parseError) {
        throw new Error("Syntax error in connections file.");
    }

    if (!Array.isArray(connections)) {
        throw new Error("Parsed content is not an array.");
    }

    const connectionIndex = connections.findIndex((c: any) => c.name === connectionName);

    if (connectionIndex === -1) {
        console.error(`Error: Connection '${connectionName}' not found.`);
        process.exit(1);
    }

    let updated = false;

    // Handle Default Switch
    if (isDefault) {
        connections.forEach((c: any) => {
            if (c.isDefault) {
                c.isDefault = false;
                delete c.isDefault; // Clean up false values if preferred, or keep explicit false
            }
        });
        connections[connectionIndex].isDefault = true;
        updated = true;
        console.log(`Set '${connectionName}' as default connection.`);
    }

    // Handle Type Switch
    if (typeArg) {
        let newType = typeArg.replace('--type-', '').toLowerCase();
        
        // Normalize type
        if (['postgresql', 'postgre', 'postgres'].includes(newType)) newType = 'postgres';
        else if (['mariadb', 'mysql'].includes(newType)) newType = 'mysql';
        else if (['sqlitedb', 'sqlite'].includes(newType)) newType = 'sqlite';
        else if (newType === 'mongodb') newType = 'mongodb';
        else {
             console.error(`Error: Unsupported type '${newType}'`);
             process.exit(1);
        }

        const conn = connections[connectionIndex];
        conn.type = newType;
        
        // Reset fields based on new type
        if (newType === 'mysql' || newType === 'postgres') {
            conn.host = 'localhost';
            conn.port = newType === 'mysql' ? 3306 : 5432;
            conn.user = 'root';
            conn.password = '';
            conn.database = connectionName;
            delete conn.filename;
            delete conn.url;
        } else if (newType === 'sqlite') {
            conn.filename = `${connectionName}.db`;
            delete conn.host;
            delete conn.port;
            delete conn.user;
            delete conn.password;
            delete conn.database;
            delete conn.url;
        } else if (newType === 'mongodb') {
            conn.url = 'mongodb://localhost:27017/' + connectionName;
            delete conn.host;
            delete conn.port;
            delete conn.user;
            delete conn.password;
            delete conn.database;
            delete conn.filename;
        }
        
        updated = true;
        console.log(`Updated '${connectionName}' type to ${newType}.`);
    }

    if (!updated) {
        console.log('No changes requested.');
        process.exit(0);
    }

    // Rewrite file
    const newContent = `export const connections = ${JSON.stringify(connections, null, 4)};\n`;
    fs.writeFileSync(filePath, newContent);
    console.log(`Successfully updated configuration: ${filePath}`);

} catch (e: any) {
    console.warn(`Warning: The file ${filePath} seems to be broken or has invalid syntax.`);
    console.warn('Please repair or delete the file to continue.');
    process.exit(1);
}
