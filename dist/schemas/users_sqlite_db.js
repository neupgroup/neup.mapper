export const users_sqlite_db = {
    fields: [
        { name: 'id', type: 'int' },
        { name: 'name', type: 'string' },
        { name: 'email', type: 'string' },
        { name: 'created_at', type: 'date' }
    ],
    insertableFields: ['id', 'name', 'email', 'created_at'],
    updatableFields: ['id', 'name', 'email', 'created_at'],
    massUpdateable: false,
    massDeletable: false,
    usesConnection: 'sqlite_db'
};
