# Mapper Configuration Directory

The mapper configuration files have been moved from `/src/mapper` to `/mapper` for easier access and better organization.

## Directory Structure

```
/mapper
  ├── connections.ts    # Database connection configurations
  ├── schemas.ts        # Schema definitions (auto-generated from migrations)
  ├── migrations.ts     # Database migration files
  └── logs.ts          # Migration execution logs
```

## Files

### connections.ts
Defines database connections. Example:
```typescript
export const connections = [
    {
        "name": "sqlite",
        "type": "sqlite",
        "filename": "sqlite.db",
        "isDefault": true
    }
];
```

### schemas.ts
Auto-generated from migrations. Contains schema definitions for type safety and validation.

### migrations.ts
Contains database migration definitions. Each migration has `up` and `down` methods.

### logs.ts
Tracks which migrations have been executed.

## CLI Commands

All CLI commands now work with the `/mapper` directory:

- `npm run create-connection <name> <type>` - Create a new connection
- `npm run create-migration <name>` - Create a new migration
- `npm run migrate` - Run pending migrations
- `npm run create-schemas` - Generate schemas from migrations

## Auto-Loading

The mapper automatically loads configuration from:
1. `/mapper/connections.ts` (preferred)
2. `/src/mapper/connections.ts` (backward compatibility)
3. `mapper.config.json` (fallback)

The same priority applies to schema files.
