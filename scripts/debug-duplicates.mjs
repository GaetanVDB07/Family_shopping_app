import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.development' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function checkDuplicates() {
  try {
    const familyId = '7d38b985-1012-4942-ae00-f8a272ceed07';
    
    console.log('🔍 Checking database for duplicates...\n');
    
    // Get all items for the family
    const result = await pool.query(`
      SELECT id, name, completed, created_at 
      FROM grocery_items 
      WHERE family_id = $1 
      ORDER BY created_at
    `, [familyId]);
    
    console.log(`📊 Total items in database: ${result.rows.length}`);
    
    // Show all items
    console.log('\n📝 All items:');
    result.rows.forEach((item, index) => {
      const shortId = String(item.id).substring(0, 8);
      console.log(`${index + 1}. ${item.name} (ID: ${shortId}..., Completed: ${item.completed}, Created: ${item.created_at})`);
    });
    
    // Check for duplicates by name
    const nameGroups = {};
    result.rows.forEach(item => {
      if (!nameGroups[item.name]) {
        nameGroups[item.name] = [];
      }
      nameGroups[item.name].push(item);
    });
    
    console.log('\n🔍 Duplicate analysis:');
    let duplicatesFound = false;
    Object.entries(nameGroups).forEach(([name, items]) => {
      if (items.length > 1) {
        duplicatesFound = true;
        console.log(`❌ "${name}": ${items.length} duplicates`);
        items.forEach((item, index) => {
          const shortId = String(item.id).substring(0, 8);
          console.log(`   ${index + 1}. ID: ${shortId}... Created: ${item.created_at}`);
        });
      }
    });
    
    if (!duplicatesFound) {
      console.log('✅ No duplicates found by name');
    }
    
    // Check unique names count
    const uniqueNames = Object.keys(nameGroups);
    console.log(`\n📈 Unique names: ${uniqueNames.length}`);
    console.log(`📈 Total items: ${result.rows.length}`);
    
    if (result.rows.length > uniqueNames.length) {
      console.log(`⚠️ ${result.rows.length - uniqueNames.length} duplicate items detected!`);
    }
    
    await pool.end();
    
  } catch (error) {
    console.error('❌ Error checking duplicates:', error);
    await pool.end();
  }
}

checkDuplicates();
