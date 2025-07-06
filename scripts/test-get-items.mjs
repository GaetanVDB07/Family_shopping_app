// Load the development environment
import dotenv from 'dotenv';
dotenv.config({ path: '.env.development' });

import { DatabaseStorage } from './server/database-storage.ts';

async function testGetAllItems() {
  const storage = new DatabaseStorage();
  
  // Test with the family ID we saw in the logs
  const familyId = '7d38b985-1012-4942-ae00-f8a272ceed07';
  
  console.log(`Testing getAllGroceryItems for family: ${familyId}`);
  
  try {
    const items = await storage.getAllGroceryItems(familyId);
    console.log(`Found ${items.length} items:`);
    
    items.forEach((item, index) => {
      console.log(`${index + 1}. ID: ${item.id}, Name: "${item.name}", AddedBy: "${item.addedBy}"`);
    });
    
    // Check for duplicates by ID
    const idCounts = {};
    items.forEach(item => {
      idCounts[item.id] = (idCounts[item.id] || 0) + 1;
    });
    
    const duplicateIds = Object.entries(idCounts).filter(([_, count]) => count > 1);
    if (duplicateIds.length > 0) {
      console.log('\n🚨 FOUND DUPLICATE IDs:', duplicateIds);
    } else {
      console.log('\n✅ No duplicate IDs found');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testGetAllItems();
