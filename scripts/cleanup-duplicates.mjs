// Clean up duplicate grocery items
import { neon } from '@neondatabase/serverless';

async function cleanupDuplicates() {
  try {
    const sql = neon(process.env.DATABASE_URL);
    
    console.log('🧹 Cleaning up duplicate grocery items...');
    
    // Find duplicates (same name, familyId, and addedBy)
    const duplicates = await sql`
      SELECT name, "familyId", "addedBy", COUNT(*) as count
      FROM grocery_items 
      GROUP BY name, "familyId", "addedBy"
      HAVING COUNT(*) > 1
    `;
    
    console.log(`Found ${duplicates.length} sets of duplicates:`);
    duplicates.forEach(dup => {
      console.log(`- "${dup.name}" appears ${dup.count} times`);
    });
    
    if (duplicates.length === 0) {
      console.log('✅ No duplicates found!');
      return;
    }
    
    // For each set of duplicates, keep the oldest (lowest id) and delete the rest
    for (const dup of duplicates) {
      console.log(`\n🔧 Fixing "${dup.name}"...`);
      
      // Get all items with this name/family/addedBy, ordered by id
      const items = await sql`
        SELECT id FROM grocery_items 
        WHERE name = ${dup.name} 
        AND "familyId" = ${dup.familyId}
        AND "addedBy" = ${dup.addedBy}
        ORDER BY id ASC
      `;
      
      // Keep the first (oldest) item, delete the rest
      const toKeep = items[0].id;
      const toDelete = items.slice(1).map(item => item.id);
      
      console.log(`  - Keeping item ${toKeep}`);
      console.log(`  - Deleting items: ${toDelete.join(', ')}`);
      
      // Delete the duplicates
      for (const id of toDelete) {
        await sql`DELETE FROM grocery_items WHERE id = ${id}`;
      }
    }
    
    console.log('\n✅ Cleanup complete!');
    
    // Show final count
    const remaining = await sql`SELECT COUNT(*) as count FROM grocery_items`;
    console.log(`📊 Total items remaining: ${remaining[0].count}`);
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  }
}

cleanupDuplicates();
