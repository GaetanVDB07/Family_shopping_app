// Load the development environment
import dotenv from 'dotenv';
dotenv.config({ path: '.env.development' });

import { drizzle } from 'drizzle-orm/node-postgres';
import { Client } from 'pg';
import { pgTable, serial, text, boolean, timestamp } from 'drizzle-orm/pg-core';

const groceryItems = pgTable('grocery_items', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  completed: boolean('completed').notNull().default(false),
  addedBy: text('added_by').notNull(),
  familyId: text('family_id').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

async function checkDB() {
  console.log('Using DATABASE_URL:', process.env.DATABASE_URL?.substring(0, 50) + '...');
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    const db = drizzle(client);

    console.log('Current grocery items in DEVELOPMENT database:');
    const items = await db.select().from(groceryItems);
    
    console.log(`Total items: ${items.length}`);
    
    if (items.length > 0) {
      items.forEach((item, index) => {
        console.log(`${index + 1}. ID: ${item.id}, Name: "${item.name}", Family: ${item.familyId}, Created: ${item.createdAt}`);
      });
      
      // Group by family
      const familyGroups = {};
      items.forEach(item => {
        if (!familyGroups[item.familyId]) {
          familyGroups[item.familyId] = [];
        }
        familyGroups[item.familyId].push(item);
      });
      
      console.log('\nItems grouped by family:');
      Object.entries(familyGroups).forEach(([familyId, familyItems]) => {
        console.log(`Family ${familyId}: ${familyItems.length} items`);
        familyItems.forEach(item => {
          console.log(`  - ID: ${item.id}, Name: "${item.name}"`);
        });
      });
    }
    
  } catch (error) {
    console.error('Error checking database:', error);
  } finally {
    await client.end();
  }
}

checkDB();
