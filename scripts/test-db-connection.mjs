import { neon } from '@neondatabase/serverless';

async function testDatabase() {
  try {
    const sql = neon(process.env.DATABASE_URL);
    
    console.log('Testing database connection...');
    
    // List all tables
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    
    console.log('Tables in database:');
    tables.forEach(table => {
      console.log(`- ${table.table_name}`);
    });
    
    console.log('\nDatabase connection successful!');
  } catch (error) {
    console.error('Database connection failed:', error);
  }
}

testDatabase();
