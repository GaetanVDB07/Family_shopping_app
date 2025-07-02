// Simple database connection test
import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL || "REDACTED_DATABASE_URL";

async function testConnection() {
  try {
    console.log('Testing database connection...');
    const sql = neon(DATABASE_URL);
    const result = await sql`SELECT NOW() as current_time`;
    console.log('✅ Connection successful!', result);
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
  }
}

testConnection();e connection test
import { neon } from '@neondatabase/serverless';

const DATABASE_URL = "REDACTED_DATABASE_URL";

async function testConnection() {
  try {
    console.log('Testing database connection...');
    const sql = neon(DATABASE_URL);
    const result = await sql`SELECT NOW() as current_time`;
    console.log('✅ Connection successful!', result);
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
  }
}

testConnection();
