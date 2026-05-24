// Quick fix - delete duplicate "vis" items
// Usage: DATABASE_URL=your_connection_string node scripts/quick-fix.mjs
import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ Set DATABASE_URL before running this script');
  process.exit(1);
}

async function quickFix() {
  try {
    const sql = neon(DATABASE_URL);

    console.log('🧹 Removing all "vis" items...');

    const result = await sql`DELETE FROM grocery_items WHERE name = 'vis'`;
    console.log(`✅ Deleted ${result.count || 'some'} items`);

    const remaining = await sql`SELECT * FROM grocery_items ORDER BY id`;
    console.log('\n📋 Remaining items:');
    remaining.forEach(item => {
      console.log(`  - ${item.name} (completed: ${item.completed})`);
    });
  } catch (error) {
    console.error('❌ Failed:', error);
    process.exit(1);
  }
}

quickFix();
