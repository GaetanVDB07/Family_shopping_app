import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { groceryItems } from '../shared/schema.js';
import { eq } from 'drizzle-orm';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.development' });

console.log('Connecting to database...');
const client = postgres(process.env.DATABASE_URL);
const db = drizzle(client);

try {
  const familyId = '7d38b985-1012-4942-ae00-f8a272ceed07';
  console.log(`Checking items for family: ${familyId}`);
  
  const items = await db.select().from(groceryItems).where(eq(groceryItems.familyId, familyId));
  console.log(`\nFound ${items.length} items in database:`);
  
  items.forEach(item => {
    console.log(`ID: ${item.id}, Name: "${item.name}", Completed: ${item.completed}`);
  });

  // Check for duplicate IDs
  const idCounts = {};
  items.forEach(item => {
    idCounts[item.id] = (idCounts[item.id] || 0) + 1;
  });

  const duplicateIds = Object.entries(idCounts).filter(([id, count]) => count > 1);
  if (duplicateIds.length > 0) {
    console.log('\n🚨 DUPLICATE IDs FOUND IN DATABASE:');
    duplicateIds.forEach(([id, count]) => console.log(`ID ${id}: ${count} times`));
  } else {
    console.log('\n✅ No duplicate IDs found in database');
  }

  // Check for duplicate names
  const nameCounts = {};
  items.forEach(item => {
    nameCounts[item.name] = (nameCounts[item.name] || 0) + 1;
  });

  const duplicateNames = Object.entries(nameCounts).filter(([name, count]) => count > 1);
  if (duplicateNames.length > 0) {
    console.log('\n🚨 DUPLICATE NAMES FOUND IN DATABASE:');
    duplicateNames.forEach(([name, count]) => console.log(`"${name}": ${count} times`));
  } else {
    console.log('\n✅ No duplicate names found in database');
  }

} catch (error) {
  console.error('Error:', error);
} finally {
  await client.end();
  console.log('\nDatabase connection closed');
}
