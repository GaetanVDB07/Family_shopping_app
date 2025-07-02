import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { 
  groceryItems, 
  families, 
  familyMembers,
  type GroceryItem, 
  type InsertGroceryItem,
  type Family,
  type FamilyMember
} from "@shared/schema";
import { eq, and } from "drizzle-orm";
import type { IStorage } from "./storage";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

// Create a PostgreSQL client for Supabase
const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

// Connect to the database
await client.connect();

const db = drizzle(client);

export class DatabaseStorage implements IStorage {
  // Grocery Items
  async getAllGroceryItems(familyId?: string): Promise<GroceryItem[]> {
    if (familyId) {
      const items = await db.select().from(groceryItems)
        .where(eq(groceryItems.familyId, familyId))
        .orderBy(groceryItems.createdAt);
      return items;
    } else {
      const items = await db.select().from(groceryItems).orderBy(groceryItems.createdAt);
      return items;
    }
  }

  async createGroceryItem(insertItem: InsertGroceryItem): Promise<GroceryItem> {
    const [item] = await db.insert(groceryItems).values(insertItem).returning();
    return item;
  }

  async updateGroceryItem(id: number, updates: Partial<InsertGroceryItem>): Promise<GroceryItem | undefined> {
    const [item] = await db
      .update(groceryItems)
      .set(updates)
      .where(eq(groceryItems.id, id))
      .returning();
    return item;
  }

  async deleteGroceryItem(id: number): Promise<boolean> {
    const result = await db.delete(groceryItems).where(eq(groceryItems.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getGroceryItem(id: number): Promise<GroceryItem | undefined> {
    const [item] = await db.select().from(groceryItems).where(eq(groceryItems.id, id));
    return item;
  }

  // Family Management
  async createFamily(family: { name: string; code: string; createdBy: string }): Promise<Family> {
    const [newFamily] = await db.insert(families).values({
      id: crypto.randomUUID(),
      name: family.name,
      code: family.code,
      createdBy: family.createdBy,
      createdAt: new Date(),
    }).returning();
    return newFamily;
  }

  async getFamilyByCode(code: string): Promise<Family | undefined> {
    const [family] = await db.select().from(families).where(eq(families.code, code));
    return family;
  }

  async addFamilyMember(member: { 
    familyId: string; 
    userId: string; 
    userEmail: string; 
    userName: string; 
    role: string 
  }): Promise<FamilyMember> {
    const [newMember] = await db.insert(familyMembers).values({
      id: crypto.randomUUID(),
      familyId: member.familyId,
      userId: member.userId,
      userEmail: member.userEmail,
      userName: member.userName,
      role: member.role,
      joinedAt: new Date(),
    }).returning();
    return newMember;
  }

  async getUserFamily(userId: string): Promise<{ familyId: string; familyName: string; role: string } | undefined> {
    const result = await db
      .select({
        familyId: familyMembers.familyId,
        familyName: families.name,
        role: familyMembers.role,
      })
      .from(familyMembers)
      .innerJoin(families, eq(familyMembers.familyId, families.id))
      .where(eq(familyMembers.userId, userId))
      .limit(1);
    
    return result[0];
  }
}
