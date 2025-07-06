// Load the development environment
import dotenv from 'dotenv';
dotenv.config({ path: '.env.development' });

import { drizzle } from 'drizzle-orm/node-postgres';
import { Client } from 'pg';
import { pgTable, serial, text, boolean, timestamp } from 'drizzle-orm/pg-core';
import { eq } from 'drizzle-orm';

const familyMembers = pgTable('family_members', {
  id: text('id').primaryKey(),
  familyId: text('family_id').notNull(),
  userId: text('user_id').notNull(),
  userEmail: text('user_email').notNull(),
  userName: text('user_name').notNull(),
  role: text('role').notNull(),
  joinedAt: timestamp('joined_at').notNull().defaultNow(),
});

async function checkFamilyMembers() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    const db = drizzle(client);
    
    console.log('Checking family_members table:');
    
    const members = await db.select().from(familyMembers);
    
    console.log(`Total family members: ${members.length}`);
    
    members.forEach((member, index) => {
      console.log(`${index + 1}. ID: ${member.id}, UserID: ${member.userId}, FamilyID: ${member.familyId}, Name: "${member.userName}", Role: ${member.role}`);
    });
    
    // Check for duplicate userId entries
    const userCounts = {};
    members.forEach(member => {
      userCounts[member.userId] = (userCounts[member.userId] || 0) + 1;
    });
    
    const duplicateUsers = Object.entries(userCounts).filter(([_, count]) => count > 1);
    if (duplicateUsers.length > 0) {
      console.log('\n🚨 FOUND DUPLICATE USER IDs in family_members:', duplicateUsers);
    } else {
      console.log('\n✅ No duplicate user IDs found');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

checkFamilyMembers();
