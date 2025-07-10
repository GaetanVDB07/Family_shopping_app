import dotenv from 'dotenv';
import { Client } from 'pg';

dotenv.config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function checkDatabase() {
  try {
    await client.connect();
    
    console.log('=== FAMILIES TABLE ===');
    const families = await client.query('SELECT * FROM families;');
    console.log('Families count:', families.rows.length);
    families.rows.forEach(row => console.log(row));
    
    console.log('\n=== FAMILY_MEMBERS TABLE ===');
    const members = await client.query('SELECT * FROM family_members;');
    console.log('Members count:', members.rows.length);
    members.rows.forEach(row => console.log(row));
    
    console.log('\n=== GROCERY_ITEMS TABLE ===');
    const items = await client.query('SELECT * FROM grocery_items;');
    console.log('Items count:', items.rows.length);
    items.rows.forEach(row => console.log(row));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

checkDatabase();
