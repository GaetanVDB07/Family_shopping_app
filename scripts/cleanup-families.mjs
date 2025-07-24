import dotenv from 'dotenv';
import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { eq } from "drizzle-orm";

// Load development environment
dotenv.config({ path: '.env.development' });

// Import schema
import { families, familyMembers, groceryItems } from "./shared/schema.js";

async function cleanupFamilies() {
  console.log('🧹 Family cleanup tool...\n');
  
  // Connect to database
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    await client.connect();
    const db = drizzle(client);
    
    // Show current families
    console.log('📋 Current families:');
    const allFamilies = await db
      .select({
        id: families.id,
        name: families.name,
        code: families.code,
        createdAt: families.createdAt
      })
      .from(families)
      .orderBy(families.createdAt);
      
    allFamilies.forEach((family, index) => {
      console.log(`${index + 1}. ${family.name} (${family.code}) - Created: ${family.createdAt.toISOString().split('T')[0]}`);
    });
    
    console.log('\n🗑️  To delete a family, you would run:');
    console.log('DELETE FROM grocery_items WHERE family_id = \'FAMILY_ID\';');
    console.log('DELETE FROM family_members WHERE family_id = \'FAMILY_ID\';');
    console.log('DELETE FROM families WHERE id = \'FAMILY_ID\';');
    console.log('\nReplace FAMILY_ID with the actual UUID from the database.');
    
    // Show specific IDs for easy deletion
    console.log('\n📝 Family IDs for deletion:');
    allFamilies.forEach((family, index) => {
      console.log(`${index + 1}. ${family.name} (${family.code}): ${family.id}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.end();
  }
}

cleanupFamilies().catch(console.error);
