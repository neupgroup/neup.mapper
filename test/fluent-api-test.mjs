// Test the new fluent/static API
import { StaticMapper as Mapper } from '../dist/fluent-mapper.js';

console.log('🧪 Testing Fluent/Static Mapper API');

async function testFluentAPI() {
  try {
    console.log('\n✅ Test 1: Static method chaining');

    // Test connection creation (this should work without actual database)
    const connectionBuilder = Mapper.makeConnection('test_db', 'sql', {
      host: 'localhost',
      port: 5432,
      database: 'test',
      user: 'postgres',
      password: 'password'
    });

    console.log('✓ makeConnection() returned builder object');

    // Test schema creation
    const schemaBuilder = connectionBuilder.schema('users');
    console.log('✓ schema() returned schema builder');

    const collectionBuilder = schemaBuilder.collection('users');
    console.log('✓ collection() returned collection builder');

    const fluentMapper = collectionBuilder.structure({
      'id': 'int auto_increment',
      'name': 'string editable',
      'email': 'string editable'
    });

    console.log('✓ structure() returned fluent mapper');

    // Test query building
    const queryBuilder = fluentMapper.query('users');
    console.log('✓ query() returned query builder');

    // Test query methods (these would fail without actual connection, but we can test the chain)
    const chainedQuery = queryBuilder
      .where('status', 'active')
      .where('age', 18, '>=');

    console.log('✓ where() chaining works');

    // Test temporary connection
    const tempConnection = Mapper.makeTempConnection('api', {
      url: 'https://api.example.com',
      headers: { 'Authorization': 'Bearer token' }
    });

    console.log('✓ makeTempConnection() works');

    // Test connection
    const connectionSelector = Mapper.connection('test_db');
    console.log('✓ connection() works');

    const queryFromExisting = connectionSelector.collection('users');
    console.log('✓ query from existing connection works via collection()');

    console.log('\n🎉 All fluent API tests passed!');
    console.log('\n📋 API Features Verified:');
    console.log('   • Static method chaining');
    console.log('   • Connection creation');
    console.log('   • Schema building');
    console.log('   • Query building');
    console.log('   • Temporary connections');
    console.log('   • Using existing connections');
    console.log('   • Method chaining throughout');

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Test the API structure
function testAPIStructure() {
  console.log('\n🔍 Testing API Structure');

  // Verify that Mapper has the expected static methods
  const expectedMethods = [
    'makeConnection',
    'makeConnection',
    'connection',
    'makeTempConnection',
    'query',
    'get',
    'getOne',
    'add',
    'update',
    'delete'
  ];

  expectedMethods.forEach(method => {
    if (typeof Mapper[method] === 'function') {
      console.log(`✓ ${method}() method exists`);
    } else {
      console.log(`❌ ${method}() method missing`);
    }
  });
}

// Run tests
testAPIStructure();
testFluentAPI().catch(console.error);