// Quick fix - delete duplicate "vis" items
import { neon } from '@neondatabase/serverless';

const DATABASE_URL = "REDACTED_DATABASE_URL";

async function quickFix() {
  try {
    const sql = neon(DATABASE_URL);
    
    console.log('🧹 Removing all "vis" items...');
    
    const result = await sql`DELETE FROM grocery_items WHERE name = 'vis'`;
    console.log(`✅ Deleted ${result.count || 'some'} items`);
    
    // Show remaining items
    const remaining = await sql`SELECT * FROM grocery_items ORDER BY id`;
    console.log('\n📋 Remaining items:');
    remaining.forEach(item => {
      console.log(`  - ${item.name} (completed: ${item.completed})`);
    });
    
  } catch (error) {
    console.error('❌ Failed:', error);
  }
}

quickFix();
