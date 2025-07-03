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

// Lazy initialization to ensure environment variables are loaded
let db: any = null;
let client: Client | null = null;

function initializeDatabase() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  if (!client) {
    // Create a PostgreSQL client for Supabase
    client = new Client({
      connectionString: process.env.DATABASE_URL,
    });

    // Connect to the database
    client.connect().catch(err => {
      console.error('Database connection error:', err);
      throw err;
    });

    db = drizzle(client);
  }

  return db;
}

export class DatabaseStorage implements IStorage {
  // Grocery Items
  async getAllGroceryItems(familyId?: string): Promise<GroceryItem[]> {
    const db = initializeDatabase();
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
    const db = initializeDatabase();
    const [item] = await db.insert(groceryItems).values(insertItem).returning();
    return item;
  }

  async updateGroceryItem(id: number, updates: Partial<InsertGroceryItem>): Promise<GroceryItem | undefined> {
    const db = initializeDatabase();
    const [item] = await db
      .update(groceryItems)
      .set(updates)
      .where(eq(groceryItems.id, id))
      .returning();
    return item;
  }

  async deleteGroceryItem(id: number): Promise<boolean> {
    const db = initializeDatabase();
    const result = await db.delete(groceryItems).where(eq(groceryItems.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getGroceryItem(id: number): Promise<GroceryItem | undefined> {
    const db = initializeDatabase();
    const [item] = await db.select().from(groceryItems).where(eq(groceryItems.id, id));
    return item;
  }

  // Family Management
  async createFamily(family: { name: string; code: string; createdBy: string }): Promise<Family> {
    const db = initializeDatabase();
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
    const db = initializeDatabase();
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
    const db = initializeDatabase();
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

  async getFamilyMember(familyId: string, userId: string): Promise<FamilyMember | undefined> {
    const db = initializeDatabase();
    const [member] = await db
      .select()
      .from(familyMembers)
      .where(and(eq(familyMembers.familyId, familyId), eq(familyMembers.userId, userId)))
      .limit(1);
    return member;
  }

  async getUserFamily(userId: string): Promise<{ familyId: string; familyName: string; role: string } | undefined> {
    const db = initializeDatabase();
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
