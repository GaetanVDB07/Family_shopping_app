import { drizzle } from 'drizzle-orm/node-postgres';
import { Client } from 'pg';
import { pgTable, serial, text, boolean, timestamp } from 'drizzle-orm/pg-core';

// Inline schema definition for the cleanup script
const groceryItems = pgTable('grocery_items', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  completed: boolean('completed').notNull().default(false),
  addedBy: text('added_by').notNull(),
  familyId: text('family_id').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

async function cleanDatabase() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    const db = drizzle(client);

    console.log('Cleaning grocery items from database...');
    const result = await db.delete(groceryItems);
    console.log('All grocery items deleted successfully');
  } catch (error) {
    console.error('Error cleaning database:', error);
  } finally {
    await client.end();
  }
}

cleanDatabase();
