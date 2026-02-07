#!/usr/bin/env node
var _a;
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
const configDir = path.resolve(process.cwd(), 'mapper');
const filePath = path.join(configDir, 'connections.ts');
if (!fs.existsSync(filePath)) {
    console.error(`Error: Connections file not found at ${filePath}`);
    process.exit(1);
}
let content = fs.readFileSync(filePath, 'utf-8');
try {
    // 1. Extract the array content
    const match = content.match(/export const connections = \s*(\[[\s\S]*\])\s*;?/);
    if (!match) {
        throw new Error("Could not find 'connections' array in file.");
    }
    const arrayStr = match[1];
    // 2. Parse it
    let connections;
    try {
        connections = new Function(`return ${arrayStr}`)();
    }
    catch (parseError) {
        throw new Error("Syntax error in connections file.");
    }
    if (!Array.isArray(connections)) {
        throw new Error("Parsed content is not an array.");
    }
    // 3. Filter out the connection
    const initialLength = connections.length;
    const newConnections = connections.filter((c) => c.name !== connectionName);
    if (newConnections.length === initialLength) {
        console.error(`Error: Connection '${connectionName}' not found.`);
        process.exit(1);
    }
    // 4. Check if we deleted the default connection
    const deletedWasDefault = (_a = connections.find((c) => c.name === connectionName)) === null || _a === void 0 ? void 0 : _a.isDefault;
    if (deletedWasDefault && newConnections.length > 0) {
        console.warn(`Warning: You deleted the default connection. '${newConnections[0].name}' is now the default.`);
        newConnections[0].isDefault = true;
    }
    // 5. Rewrite file
    const newContent = `export const connections = ${JSON.stringify(newConnections, null, 4)};\n`;
    fs.writeFileSync(filePath, newContent);
    console.log(`Deleted connection '${connectionName}'. Updated ${filePath}`);
}
catch (e) {
    console.warn(`Warning: The file ${filePath} seems to be broken or has invalid syntax.`);
    console.warn('Please repair or delete the file to continue.');
    process.exit(1);
}
