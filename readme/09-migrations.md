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
npm run migrate

# Migrate exactly one level up
npm run migrate up

# Rollback exactly one level down
npm run migrate down

# Refresh: Rollback everything and start over
npm run migrate refresh
```

---

## 📝 Writing Migrations

Migrations use a **deferred execution model**. You queue operations and they are applied only when you call `await table.exec()`.

### **Creating a Table**
```ts
export const usesConnection = 'primary'; // Target connection

export async function up() {
    const table = Mapper.schemas().table('users');
    table.useConnection(usesConnection);

    table.addColumn('id').type('int').isPrimary().autoIncrement();
    table.addColumn('username').type('string').notNull();
    table.addColumn('email').type('string').isUnique();
    
    await table.exec(); // Creates table & src/schemas/users.ts
}
```

### **Altering a Table**
```ts
export async function up() {
    const table = Mapper.schemas().table('users');
    
    // Select existing column to modify
    table.selectColumn('email').type('string').notNull();
    
    // Drop columns or constraints
    table.dropColumn('old_field');
    table.selectColumn('temp_tag').drop();

    await table.exec(); // Updates DB & src/schemas/users.ts
}
```

### **Dropping a Table**
```ts
export async function down() {
    const table = Mapper.schemas().table('users');
    await table.dropTable().exec(); // Drops DB table & deletes schema file
}
```

---

## 🔍 Migration State
The migration state is tracked in `src/migration/index.ts`.
- `migrations`: List of all discovered migration files.
- `completed`: List of migrations already applied.
- `currentVersion`: Index of the last applied migration.
