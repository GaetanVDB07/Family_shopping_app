import dotenv from 'dotenv';
import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { eq } from "drizzle-orm";

// Load development environment
dotenv.config({ path: '.env.development' });

// Import schema
import { families, familyMembers } from "../shared/schema.js";

async function testFamilyIssues() {
  console.log('🔍 Testing family creation issues...\n');
  
  // Connect to database
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    await client.connect();
    const db = drizzle(client);
    
    // Check all families
    console.log('📋 All families in database:');
    const allFamilies = await db.select().from(families);
    console.table(allFamilies.map(f => ({
      id: f.id.substring(0, 8) + '...',
      name: f.name,
      code: f.code,
      createdBy: f.createdBy.substring(0, 8) + '...'
    })));
    
    // Check for duplicate codes
    const codes = allFamilies.map(f => f.code);
    const duplicateCodes = codes.filter((code, index) => codes.indexOf(code) !== index);
    if (duplicateCodes.length > 0) {
      console.log('\n❌ Duplicate family codes found:', duplicateCodes);
    } else {
      console.log('\n✅ No duplicate family codes found');
    }
    
    // Check all family members
    console.log('\n👥 All family members:');
    const allMembers = await db
      .select({
        familyId: familyMembers.familyId,
        userId: familyMembers.userId,
        userName: familyMembers.userName,
        userEmail: familyMembers.userEmail,
        role: familyMembers.role,
        familyName: families.name,
        familyCode: families.code
      })
      .from(familyMembers)
      .leftJoin(families, eq(familyMembers.familyId, families.id));
      
    console.table(allMembers.map(m => ({
      family: m.familyName,
      code: m.familyCode,
      user: m.userName,
      email: m.userEmail,
      role: m.role,
      userId: m.userId.substring(0, 8) + '...'
    })));
    
    // Check for users in multiple families
    const userFamilyCounts = {};
    allMembers.forEach(member => {
      const key = `${member.userName} (${member.userEmail})`;
      userFamilyCounts[key] = (userFamilyCounts[key] || 0) + 1;
    });
    
    console.log('\n👤 User family memberships:');
    Object.entries(userFamilyCounts).forEach(([user, count]) => {
      console.log(`  ${user}: ${count} families`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.end();
  }
}

testFamilyIssues().catch(console.error);
