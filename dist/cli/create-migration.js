#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
const args = process.argv.slice(2);
const tableName = args[0];
const remarks = args[1] || '';
if (!tableName) {
    console.error('Usage: npm run create-migration <tableName> [remarks]');
    process.exit(1);
}
// Ensure directories exist
const migrationDir = path.resolve(process.cwd(), 'src/migration');
const schemasDir = path.resolve(process.cwd(), 'src/schemas');
if (!fs.existsSync(migrationDir))
    fs.mkdirSync(migrationDir, { recursive: true });
if (!fs.existsSync(schemasDir))
    fs.mkdirSync(schemasDir, { recursive: true });
// Generate timestamp
const now = new Date();
const timestamp = now.toISOString().replace(/[-:T.]/g, '').slice(0, 14); // YYYYMMDDHHMMSS format roughly
// Actually better manual format: YYYYMMDD_HHMMSS
const pad = (n) => n.toString().padStart(2, '0');
const tsResult = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
const fileName = `${tsResult}_${tableName}${remarks ? '_' + remarks : ''}.ts`;
const filePath = path.join(migrationDir, fileName);
const fileContent = `
import { Mapper, TableMigrator } from '@neupgroup/mapper';

export async function up() {
    // const table = Mapper.schemas().table('${tableName}');
    // table.addColumn('id').type('int').isPrimary().autoIncrement().exec();
    // ... add more columns
    console.log('Migrating up: ${tableName}');
}

export async function down() {
    // Drop table or revert changes
    console.log('Migrating down: ${tableName}');
}
`;
fs.writeFileSync(filePath, fileContent.trim());
console.log(`Created migration file: ${filePath}`);
// Create or update schema definition
const schemaFilePath = path.join(schemasDir, `${tableName}.ts`);
if (!fs.existsSync(schemaFilePath)) {
    const schemaContent = `
export const ${tableName} = {
    fields: [
        // { name: 'id', type: 'int', isPrimary: true, autoIncrement: true }
    ],
    insertableFields: [],
    updatableFields: [],
    massUpdateable: false,
    massDeletable: false,
    usesConnection: 'default' // Update this
};
`;
    fs.writeFileSync(schemaFilePath, schemaContent.trim());
    console.log(`Created schema definition: ${schemaFilePath}`);
}
else {
    console.log(`Schema file already exists: ${schemaFilePath}`);
}
// Update migrations index
const indexFilePath = path.join(migrationDir, 'index.ts');
let migrations = [];
let completed = [];
let currentVersion = -1;
if (fs.existsSync(indexFilePath)) {
    const content = fs.readFileSync(indexFilePath, 'utf-8');
    const matchMigrations = content.match(/migrations = \[(.*?)\]/s);
    if (matchMigrations) {
        migrations = matchMigrations[1].split(',').map(s => s.trim().replace(/['"]/g, '')).filter(Boolean);
    }
    const matchCompleted = content.match(/completed = \[(.*?)\]/s);
    if (matchCompleted) {
        completed = matchCompleted[1].split(',').map(s => s.trim().replace(/['"]/g, '')).filter(Boolean);
    }
    const matchVersion = content.match(/currentVersion = (.*?);/);
    if (matchVersion) {
        currentVersion = parseInt(matchVersion[1]);
    }
}
const migrationName = fileName.replace('.ts', '');
if (!migrations.includes(migrationName)) {
    migrations.push(migrationName);
}
const indexContent = `
export const migrations = [
${migrations.map(m => `    '${m}'`).join(',\n')}
];

export const completed = [
${completed.map(m => `    '${m}'`).join(',\n')}
];

export const currentVersion = ${currentVersion};
`;
fs.writeFileSync(indexFilePath, indexContent.trim() + '\n');
console.log(`Updated migration index: ${indexFilePath}`);
