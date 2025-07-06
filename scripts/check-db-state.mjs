import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { groceryItems } from './shared/schema.ts';

const sqlite = new Database('./database.sqlite');
const db = drizzle(sqlite);

async function checkDatabaseState() {
  try {
    console.log('Current grocery items in database:');
    const items = await db.select().from(groceryItems);
    
    console.log(`Total items: ${items.length}`);
    console.log('\nAll items:');
    items.forEach((item, index) => {
      console.log(`${index + 1}. ID: ${item.id}, Name: "${item.name}", Family: ${item.familyId}, Created: ${item.createdAt}`);
    });
    
    // Check for duplicates
    const duplicates = {};
    items.forEach(item => {
      const key = `${item.name}-${item.familyId}`;
      if (!duplicates[key]) {
        duplicates[key] = [];
      }
      duplicates[key].push(item);
    });
    
    console.log('\nDuplicate analysis:');
    Object.entries(duplicates).forEach(([key, items]) => {
      if (items.length > 1) {
        console.log(`"${items[0].name}" appears ${items.length} times:`, items.map(item => ({ id: item.id, created: item.createdAt })));
      }
    });
    
  } catch (error) {
    console.error('Error checking database:', error);
  } finally {
    sqlite.close();
  }
}

checkDatabaseState();
