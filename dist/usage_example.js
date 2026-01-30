import { Mapper } from './fluent-mapper.js';
async function main() {
    // 1. Connection setup (mock)
    Mapper.makeConnection('custom', 'api', { url: 'http://localhost' });
    // 2. Schema Definition using the new API
    const userSchema = Mapper.schemas('users');
    userSchema.fields = {
        'id': ['integer', 'auto-increment'],
        'name': ['string', 'max.20', 'unique'],
        'gender': ['string', 'enum', ['male', 'female', 'other']],
        'createdOn': ['datetime', 'default_current_datetime'],
        'role': ['string', 'default.value', 'user']
    };
    userSchema.insertableFields = ['name', 'gender', 'role']; // exclude id, createdOn
    userSchema.updatableFields = ['name', 'gender'];
    userSchema.deleteType = 'softDelete';
    userSchema.massDeleteAllowed = false;
    console.log("Schema defined.");
    // 3. User Query Scenarios
    // Scenario A: Mapper.connection('name').table('name')
    // We don't have a real DB so this will fail at execution but we check the builder construction.
    const query1 = Mapper.connection('default').table('users');
    console.log("Query 1 built:", query1);
    // Scenario B: Mapper.connection('name').schemas('name').get('users').limit(1)
    // 'users' in get() might be field selection if schema is 'name'. 
    // Let's assume 'users' is the schema name.
    // Code: Mapper.connection('default').schemas('users').get('id', 'name').limit(1)
    const query2 = Mapper.connection('default').schemas('users').get('id', 'name').limit(1);
    console.log("Query 2 built (select fields):", query2);
    // Scenario C: Mapper.schemas('name').get('field1','field2').limit(2).offset(20)
    const query3 = Mapper.schemas('users').get('name', 'gender').limit(2).offset(20);
    console.log("Query 3 built:", query3);
    // 4. Test logic (mock execution would happen here)
    // Since we don't have a real adapter that works without network/db, we just stop here.
    // If we had an in-memory adapter we could test output.
}
main().catch(console.error);
