// Quick fix - delete duplicate "vis" items
import { neon } from '@neondatabase/serverless';

const DATABASE_URL = "postgresql://postgres.nijqcrvdqhpkgitulycq:Ik%20speel%20basketbal%20sinds%202008!@aws-0-eu-west-3.pooler.supabase.com:6543/postgres";

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
