// Load the development environment
import dotenv from 'dotenv';
dotenv.config({ path: '.env.development' });

import { drizzle } from 'drizzle-orm/node-postgres';
import { Client } from 'pg';
import { pgTable, serial, text, boolean, timestamp } from 'drizzle-orm/pg-core';
import { eq, and } from 'drizzle-orm';

const groceryItems = pgTable('grocery_items', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  completed: boolean('completed').notNull().default(false),
  addedBy: text('added_by').notNull(),
  familyId: text('family_id').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

const familyMembers = pgTable('family_members', {
  id: text('id').primaryKey(),
  familyId: text('family_id').notNull(),
  userId: text('user_id').notNull(),
  userEmail: text('user_email').notNull(),
  userName: text('user_name').notNull(),
  role: text('role').notNull(),
  joinedAt: timestamp('joined_at').notNull().defaultNow(),
});

async function testGetAllItems() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    const db = drizzle(client);
    
    const familyId = '7d38b985-1012-4942-ae00-f8a272ceed07';
    console.log(`Testing getAllGroceryItems for family: ${familyId}`);
    
    // Replicate the exact FIXED query from DatabaseStorage.getAllGroceryItems
    const items = await db.select({
      id: groceryItems.id,
      name: groceryItems.name,
      completed: groceryItems.completed,
      addedBy: familyMembers.userName,
      familyId: groceryItems.familyId,
      createdAt: groceryItems.createdAt,
    }).from(groceryItems)
      .leftJoin(familyMembers, and(
        eq(groceryItems.addedBy, familyMembers.userId),
        eq(familyMembers.familyId, familyId) // Add family filter to the join
      ))
      .where(eq(groceryItems.familyId, familyId))
      .orderBy(groceryItems.createdAt);
    
    // Apply the deduplication logic
    const uniqueItems = new Map();
    items.forEach((item) => {
      if (!uniqueItems.has(item.id)) {
        uniqueItems.set(item.id, {
          ...item,
          addedBy: item.addedBy || 'Unknown User'
        });
      }
    });
    
    const processedItems = Array.from(uniqueItems.values());
    
    console.log(`Query returned ${items.length} raw items:`);
    items.forEach((item, index) => {
      console.log(`${index + 1}. RAW: ID: ${item.id}, Name: "${item.name}", AddedBy: "${item.addedBy}"`);
    });
    
    console.log(`\nProcessed into ${processedItems.length} items:`);
    processedItems.forEach((item, index) => {
      console.log(`${index + 1}. PROCESSED: ID: ${item.id}, Name: "${item.name}", AddedBy: "${item.addedBy}"`);
    });
    
    // Check for duplicates
    const idCounts = {};
    processedItems.forEach(item => {
      idCounts[item.id] = (idCounts[item.id] || 0) + 1;
    });
    
    const duplicateIds = Object.entries(idCounts).filter(([_, count]) => count > 1);
    if (duplicateIds.length > 0) {
      console.log('\n🚨 FOUND DUPLICATE IDs in processed items:', duplicateIds);
    } else {
      console.log('\n✅ No duplicate IDs found in processed items');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

testGetAllItems();
