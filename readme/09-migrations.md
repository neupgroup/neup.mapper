# Database Migrations

Neup.Mapper includes a comprehensive migration system that tracks changes to your database while keeping your local schema files in sync.

## 🏗️ The Migration Lifecycle

1. **Create**: Use the CLI to generate a new migration file.
2. **Define**: Add columns or alter tables in the generated file.
3. **Execute**: Run the migration to apply changes to the DB and update local `src/schemas`.

---

## 💻 CLI Commands

### **Create a Connection**
Generate a connection template in `src/config`.
```bash
npm run create-connection <name> <type>
# Example: npm run create-connection primary mysql
```

### **Create a Migration**
Generate a timestamped migration file in `src/migration`.
```bash
npm run create-migration <tableName> [remarks]
# Example: npm run create-migration users initial_schema
```

### **Run Migrations**
Apply pending changes.
```bash
# Run all pending migrations
npm run migrate-up

# Run exactly 1 pending migration
npm run migrate-up 1

# Run next 2 pending migrations
npm run migrate-up 2

# Rollback the last migration (default)
npm run migrate-down

# Rollback the last 1 migration
npm run migrate-down 1

# Rollback the last 2 migrations
npm run migrate-down 2
```

---

## 📝 Writing Migrations

Migrations use a **deferred execution model**. You queue operations and they are applied only when you call `await migrator.exec()`.

### **Creating a Table**
```ts
import { TableMigrator } from '@neupgroup/mapper/dist/index.js';

export async function up() {
    const migrator = new TableMigrator('users');
    
    // Define columns
    migrator.addColumn('id').type('int').autoIncrement().isPrimary();
    migrator.addColumn('username').type('varchar').length(50).notNull();
    migrator.addColumn('email').type('varchar').length(100).isUnique();
    migrator.addColumn('bio').type('text');
    
    await migrator.exec(); // Creates DB table & updates schema file
}
```

### **Altering a Table**
```ts
import { TableMigrator } from '@neupgroup/mapper/dist/index.js';

export async function up() {
    const migrator = new TableMigrator('users');
    
    // Select existing column to modify
    migrator.selectColumn('email').type('varchar').length(150).notNull();
    
    // Drop columns or constraints
    migrator.dropColumn('bio');
    migrator.dropUnique('email');

    await migrator.exec();
}
```

### **Dropping a Table**
```ts
import { TableMigrator } from '@neupgroup/mapper/dist/index.js';

export async function down() {
    const migrator = new TableMigrator('users');
    await migrator.drop().exec(); // Drops DB table & schema file
}
```

---

## 🚀 Automatic Schemas
As soon as you run a migration, the system automatically generates or updates the schema definition in `src/mapper/schemas`.

In your application code, simply call:
```ts
const users = await Mapper.schema('users').get();
```

---

## 🔍 Migration State
The migration state is tracked in two places:
1. **Registry**: `src/mapper/migrations/index.ts` lists all available migration files.
2. **Execution State**: `.migration_state.json` (in `src/mapper` or root) tracks which migrations have been applied.

