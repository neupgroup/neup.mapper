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
  --host <value>       Update host
  --port <value>       Update port
  --user <value>       Update user
  --password <value>   Update password
  --database <value>   Update database name
  --filename <value>   Update SQLite filename
  --url <value>        Update MongoDB URL
  --default            Make this connection the default one
  --help, -h           Show this help message

Example:
  npm run update-connection mydb --host 192.168.1.100 --port 3307
  npm run update-connection mydb --default
`);
    process.exit(0);
}
const connectionName = args[0];
if (!connectionName) {
    console.error('Error: Connection name is required.');
    console.log('Usage: npm run update-connection <connectionName> [options]');
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
    const connectionIndex = config.connections.findIndex((conn) => conn.name === connectionName);
    if (connectionIndex === -1) {
        console.error(`Error: Connection '${connectionName}' not found.`);
        process.exit(1);
    }
    const connection = config.connections[connectionIndex];
    let updated = false;
    // Update fields based on arguments
    for (let i = 1; i < args.length; i++) {
        const arg = args[i];
        if (arg === '--default') {
            // Unset other defaults
            config.connections.forEach((conn) => {
                if (conn.isDefault) {
                    conn.isDefault = false;
                }
            });
            connection.isDefault = true;
            updated = true;
        }
        else if (arg.startsWith('--')) {
            const field = arg.substring(2);
            const value = args[i + 1];
            if (!value || value.startsWith('--')) {
                console.error(`Error: No value provided for ${arg}`);
                process.exit(1);
            }
            // Convert port to number
            if (field === 'port') {
                connection[field] = parseInt(value, 10);
            }
            else {
                connection[field] = value;
            }
            updated = true;
            i++; // Skip next arg as it's the value
        }
    }
    if (!updated) {
        console.warn('Warning: No updates specified. Use --help to see available options.');
        process.exit(0);
    }
    // Write back to file
    fs.writeFileSync(configFilePath, JSON.stringify(config, null, 2) + '\n');
    console.log(`✓ Updated connection '${connectionName}' in ${configFilePath}`);
}
catch (e) {
    console.error(`Error: Failed to parse or update ${configFilePath}`);
    console.error(e);
    process.exit(1);
}
