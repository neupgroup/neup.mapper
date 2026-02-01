export const test_users = {
    fields: [
        { name: 'id', type: 'int', isPrimary: true, autoIncrement: true },
        { name: 'name', type: 'string' }
    ],
    insertableFields: ['name'],
    updatableFields: ['name'],
    massUpdateable: false,
    massDeletable: false,
    usesConnection: 'default'
};
