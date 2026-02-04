export const schemas: Record<string, any> = {};

export const users = {
    "fields": [
        {
            "name": "id",
            "type": "int",
            "isPrimary": true,
            "autoIncrement": true
        },
        {
            "name": "created_at",
            "type": "date",
            "defaultValue": "NOW()"
        },
        {
            "name": "username",
            "type": "string",
            "length": 255
        }
    ],
    "collection": "users"
};

