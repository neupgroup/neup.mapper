
import { Mapper } from './src/fluent-mapper.js';

async function main() {
    // 1. Connection setup (mock) with new API
    // Using configuration object directly
    // Mapper.connection(['type': 'type', 'username':'username' ]) -> { type: 'api', ... }
    const conn = Mapper.connection({ type: 'api', url: 'http://example.com' });
    console.log("Connection created:", conn);

    // 2. Insert with new API
    // Mapper.connection('connectionName').collection('name').insert({...})
    // Let's use the temp connection we just made (it is anonymous/temp in our implementation if using config object, 
    // but wait, `connection({ type: ... })` returns a selector bound to a temp name.

    // We need to access a collection/table from the connection selector.
    // The user requirement: Mapper.connection(...).collection('name').insert(...)
    // Check references: FluentConnectionSelector has `schema` and `query` and `table`.
    // Does it have `collection`? No, let's check FluentConnectionSelector.
    // It has `schema(name)` and `query(name)` and `table(name)`.
    // We should add `collection(name)` alias.
}

main().catch(console.error);
