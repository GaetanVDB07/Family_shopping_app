// Simple database connection test
import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL;

async function testConnection() {
  try {
    console.log('Testing database connection...');
    console.log('Using URL:', DATABASE_URL ? 'Set from environment' : 'Not set');
    
    if (!DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    
    const sql = neon(DATABASE_URL);
    const result = await sql`SELECT NOW() as current_time`;
    console.log('✅ Connection successful!', result);
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
  }
}

testConnection();
