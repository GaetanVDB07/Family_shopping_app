import dotenv from 'dotenv';
import { Client } from 'pg';
import fs from 'fs';

// Load environment variables
dotenv.config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function resetSchema() {
  try {
    await client.connect();
    
    const sql = fs.readFileSync('reset-schema.sql', 'utf8');
    await client.query(sql);
    
    console.log('✅ Schema reset successfully!');
  } catch (error) {
    console.error('❌ Error resetting schema:', error);
  } finally {
    await client.end();
  }
}

resetSchema();
