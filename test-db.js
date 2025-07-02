// Simple database connection test
import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres.nijqcrvdqhpkgitulycq:Ik%20speel%20basketbal%20sinds%202008!@aws-0-eu-west-3.pooler.supabase.com:6543/postgres";

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

const DATABASE_URL = "postgresql://postgres:Ik%20speel%20basketbal%20sinds%202008!@db.nijqcrvdqhpkgitulycq.supabase.co:5432/postgres";

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
