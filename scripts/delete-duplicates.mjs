import dotenv from 'dotenv';
import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { eq } from "drizzle-orm";

// Load development environment
dotenv.config({ path: '.env.development' });

// Import schema
import { families, familyMembers, groceryItems } from "./shared/schema.js";

async function deleteDuplicateFamilies() {
  console.log('🗑️  Deleting duplicate families...\n');
  
  // Families to delete (keeping the first one)
  const familiesToDelete = [
    '1d7652b7-0ae2-4b29-8fa8-52ec06f698c8', // Familie Vandenberghe (KFX1AR)
    '0d85c6c7-4561-43f5-adf9-2d8070ab542c', // Familie Vandenberghe (VR6XUL)
    '17eb67c4-6433-4ab6-9571-5984ef6b8dc7'  // Vandenberghe (55VXZC)
  ];
  
  // Connect to database
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    await client.connect();
    const db = drizzle(client);
    
    for (const familyId of familiesToDelete) {
      console.log(`Deleting family: ${familyId}`);
      
      // Delete grocery items first
      const deletedItems = await db
        .delete(groceryItems)
        .where(eq(groceryItems.familyId, familyId))
        .returning();
      console.log(`  - Deleted ${deletedItems.length} grocery items`);
      
      // Delete family members
      const deletedMembers = await db
        .delete(familyMembers)
        .where(eq(familyMembers.familyId, familyId))
        .returning();
      console.log(`  - Deleted ${deletedMembers.length} family members`);
      
      // Delete family
      const deletedFamily = await db
        .delete(families)
        .where(eq(families.id, familyId))
        .returning();
      console.log(`  - Deleted family: ${deletedFamily[0]?.name}`);
      
      console.log('');
    }
    
    // Show remaining families
    console.log('✅ Cleanup complete! Remaining families:');
    const remainingFamilies = await db
      .select({
        name: families.name,
        code: families.code,
        id: families.id
      })
      .from(families);
      
    remainingFamilies.forEach((family, index) => {
      console.log(`${index + 1}. ${family.name} (${family.code})`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.end();
  }
}

deleteDuplicateFamilies().catch(console.error);
