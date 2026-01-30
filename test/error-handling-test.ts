
import {
    Mapper,
    MapperError,
    AdapterMissingError,
    UpdatePayloadMissingError,
    DocumentMissingIdError,
    ConnectionUnknownError
} from '../src/index';

async function testErrorHandling() {
    console.log('Testing Error Handling...');
    const mapper = new Mapper();

    // Test 1: ConnectionUnknownError
    try {
        mapper.getConnections().attachAdapter('nonexistent', {} as any);
        console.error('FAIL: Should have thrown ConnectionUnknownError');
    } catch (err) {
        if (err instanceof ConnectionUnknownError) {
            console.log('PASS: Caught ConnectionUnknownError');
            console.log('  Message:', err.message);
            console.log('  Hint:', err.hint);
        } else {
            console.error('FAIL: Caught unexpected error', err);
        }
    }

    // Define a schema without adapter
    mapper.getConnections().create('db', 'api').key({ url: 'http://localhost' });
    mapper.getSchemaManager().create('users').use({ connection: 'db', collection: 'users' }).setStructure({ name: 'string' });

    // Test 2: AdapterMissingError
    try {
        await mapper.use('users').get();
        console.error('FAIL: Should have thrown AdapterMissingError');
    } catch (err) {
        if (err instanceof AdapterMissingError) {
            console.log('PASS: Caught AdapterMissingError');
            console.log('  Message:', err.message);
            console.log('  Hint:', err.hint);
        } else {
            console.error('FAIL: Caught unexpected error', err);
        }
    }

    // Attach adapter to proceed
    mapper.getConnections().attachAdapter('db', {
        get: async () => [{ id: '1', name: 'Alice' }],
        updateDocument: async () => { },
    } as any);

    // Test 3: UpdatePayloadMissingError
    try {
        await mapper.use('users').update();
        console.error('FAIL: Should have thrown UpdatePayloadMissingError');
    } catch (err) {
        if (err instanceof UpdatePayloadMissingError) {
            console.log('PASS: Caught UpdatePayloadMissingError');
            console.log('  Message:', err.message);
            console.log('  Hint:', err.hint);
        } else {
            console.error('FAIL: Caught unexpected error', err);
        }
    }

    // Test 4: DocumentMissingIdError
    // Mock adapter to return doc without ID
    mapper.getConnections().attachAdapter('db', {
        get: async () => [{ name: 'Alice' }], // No ID
        deleteDocument: async () => { },
    } as any);

    try {
        await mapper.use('users').delete();
        console.error('FAIL: Should have thrown DocumentMissingIdError');
    } catch (err) {
        if (err instanceof DocumentMissingIdError) {
            console.log('PASS: Caught DocumentMissingIdError');
            console.log('  Message:', err.message);
            console.log('  Hint:', err.hint);
        } else {
            console.error('FAIL: Caught unexpected error', err);
        }
    }
}

testErrorHandling().catch(console.error);
