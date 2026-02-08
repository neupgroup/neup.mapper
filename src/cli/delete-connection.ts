#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';

const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Usage: npm run delete-connection <connectionName>

Arguments:
  connectionName   Name of the connection to delete

Options:
  --help, -h       Show this help message

Example:
  npm run delete-connection mydb
`);
    process.exit(0);
}

const connectionName = args[0];

if (!connectionName) {
    console.error('Error: Connection name is required.');
    console.log('Usage: npm run delete-connection <connectionName>');
    process.exit(1);
}

const configFilePath = path.resolve(process.cwd(), 'mapper.config.json');

if (!fs.existsSync(configFilePath)) {
    console.error(`Error: ${configFilePath} does not exist.`);
    process.exit(1);
}

try {
    const content = fs.readFileSync(configFilePath, 'utf-8');
    const config = JSON.parse(content);

    if (!config.connections || !Array.isArray(config.connections)) {
        console.error('Error: No connections found in mapper.config.json');
        process.exit(1);
    }

    const connectionIndex = config.connections.findIndex((conn: any) => conn.name === connectionName);

    if (connectionIndex === -1) {
        console.error(`Error: Connection '${connectionName}' not found.`);
        process.exit(1);
    }

    const connection = config.connections[connectionIndex];
    const wasDefault = connection.isDefault;

    // Remove the connection
    config.connections.splice(connectionIndex, 1);

    // If we deleted the default connection and there are others, make the first one default
    if (wasDefault && config.connections.length > 0) {
        config.connections[0].isDefault = true;
        console.log(`Note: '${config.connections[0].name}' is now the default connection.`);
    }

    // Write back to file
    fs.writeFileSync(configFilePath, JSON.stringify(config, null, 2) + '\n');
    console.log(`✓ Deleted connection '${connectionName}' from ${configFilePath}`);

} catch (e) {
    console.error(`Error: Failed to parse or update ${configFilePath}`);
    console.error(e);
    process.exit(1);
}
