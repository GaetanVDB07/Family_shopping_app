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
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    const db = drizzle(client);

    console.log('Current grocery items in database:');
    const items = await db.select().from(groceryItems);
    
    console.log(`Total items: ${items.length}`);
    items.forEach((item, index) => {
      console.log(`${index + 1}. ID: ${item.id}, Name: "${item.name}", Family: ${item.familyId}, Created: ${item.createdAt}`);
    });
    
    // Check for duplicate IDs
    const idCounts = {};
    items.forEach(item => {
      idCounts[item.id] = (idCounts[item.id] || 0) + 1;
    });
    
    console.log('\nDuplicate ID analysis:');
    Object.entries(idCounts).forEach(([id, count]) => {
      if (count > 1) {
        console.log(`ID ${id} appears ${count} times`);
      }
    });
    
  } catch (error) {
    console.error('Error checking database:', error);
  } finally {
    await client.end();
  }
}

checkDB();
