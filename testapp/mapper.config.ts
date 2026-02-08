import type { MapperConfig } from '@neupgroup/mapper';

export const config: MapperConfig = {
    connections: [
        {
            name: "default",
            type: "sqlite",
            filename: "sqlite.db",
            isDefault: true
        }
    ],
    schemas: [
        {
            table: "users",
            connection: "default",
            columns: {
                id: {
                    type: "integer",
                    primaryKey: true,
                    autoIncrement: true
                },
                username: {
                    type: "string",
                    length: 255,
                    nullable: false
                },
                created_at: {
                    type: "timestamp",
                    default: "CURRENT_TIMESTAMP"
                }
            }
        }
    ]
};
