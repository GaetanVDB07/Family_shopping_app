import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { 
  groceryItems, 
  families, 
  familyMembers,
  type GroceryItem, 
  type InsertGroceryItem,
  type Family,
  type FamilyMember,
  type UserFamilyMembership,
  type FamilyWithRole
} from "@shared/schema";
import { eq, and, count } from "drizzle-orm";
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
      const items = await db.select({
        id: groceryItems.id,
        name: groceryItems.name,
        completed: groceryItems.completed,
        addedBy: familyMembers.userName, // Get user name instead of UUID
        familyId: groceryItems.familyId,
        createdAt: groceryItems.createdAt,
      }).from(groceryItems)
        .leftJoin(familyMembers, and(
          eq(groceryItems.addedBy, familyMembers.userId),
          eq(familyMembers.familyId, familyId) // Add family filter to the join
        ))
        .where(eq(groceryItems.familyId, familyId))
        .orderBy(groceryItems.createdAt);
      
      // Remove duplicates and fallback to UUID if userName is null
      const uniqueItems = new Map();
      items.forEach((item: any) => {
        if (!uniqueItems.has(item.id)) {
          uniqueItems.set(item.id, {
            ...item,
            addedBy: item.addedBy || 'Unknown User'
          });
        }
      });
      
      return Array.from(uniqueItems.values()) as GroceryItem[];
    } else {
      const items = await db.select({
        id: groceryItems.id,
        name: groceryItems.name,
        completed: groceryItems.completed,
        addedBy: familyMembers.userName, // Get user name instead of UUID
        familyId: groceryItems.familyId,
        createdAt: groceryItems.createdAt,
      }).from(groceryItems)
        .leftJoin(familyMembers, eq(groceryItems.addedBy, familyMembers.userId))
        .orderBy(groceryItems.createdAt);
      
      // Remove duplicates and fallback to UUID if userName is null
      const uniqueItems = new Map();
      items.forEach((item: any) => {
        if (!uniqueItems.has(item.id)) {
          uniqueItems.set(item.id, {
            ...item,
            addedBy: item.addedBy || 'Unknown User'
          });
        }
      });
      
      return Array.from(uniqueItems.values()) as GroceryItem[];
    }
  }

  async createGroceryItem(insertItem: InsertGroceryItem): Promise<GroceryItem> {
    const db = initializeDatabase();
    
    console.log(`[${new Date().toISOString()}] DatabaseStorage.createGroceryItem called with:`, insertItem);
    
    const [item] = await db.insert(groceryItems).values(insertItem).returning();
    
    console.log(`[${new Date().toISOString()}] Database inserted item:`, item);
    
    // Get the user name for the response
    const [itemWithUserName] = await db.select({
      id: groceryItems.id,
      name: groceryItems.name,
      completed: groceryItems.completed,
      addedBy: familyMembers.userName,
      familyId: groceryItems.familyId,
      createdAt: groceryItems.createdAt,
    }).from(groceryItems)
      .leftJoin(familyMembers, eq(groceryItems.addedBy, familyMembers.userId))
      .where(eq(groceryItems.id, item.id));
    
    const result = {
      ...itemWithUserName,
      addedBy: itemWithUserName.addedBy || 'Unknown User'
    } as GroceryItem;
    
    console.log(`[${new Date().toISOString()}] Returning grocery item:`, result);
    
    return result;
  }

  async updateGroceryItem(id: number, updates: Partial<InsertGroceryItem>, familyId?: string): Promise<GroceryItem | undefined> {
    const db = initializeDatabase();
    
    // Build the where condition - include family filtering for security
    const whereCondition = familyId 
      ? and(eq(groceryItems.id, id), eq(groceryItems.familyId, familyId))
      : eq(groceryItems.id, id);
    
    const [item] = await db
      .update(groceryItems)
      .set(updates)
      .where(whereCondition)
      .returning();
    
    if (!item) return undefined;
    
    // Get the user name for the response
    const [itemWithUserName] = await db.select({
      id: groceryItems.id,
      name: groceryItems.name,
      completed: groceryItems.completed,
      addedBy: familyMembers.userName,
      familyId: groceryItems.familyId,
      createdAt: groceryItems.createdAt,
    }).from(groceryItems)
      .leftJoin(familyMembers, eq(groceryItems.addedBy, familyMembers.userId))
      .where(eq(groceryItems.id, item.id));
    
    return {
      ...itemWithUserName,
      addedBy: itemWithUserName.addedBy || 'Unknown User'
    } as GroceryItem;
  }

  async deleteGroceryItem(id: number, familyId?: string): Promise<boolean> {
    const db = initializeDatabase();
    
    // Build the where condition - include family filtering for security
    const whereCondition = familyId 
      ? and(eq(groceryItems.id, id), eq(groceryItems.familyId, familyId))
      : eq(groceryItems.id, id);
    
    const result = await db.delete(groceryItems).where(whereCondition);
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

  async getFamilyMemberById(memberId: string): Promise<FamilyMember | undefined> {
    const db = initializeDatabase();
    const [member] = await db
      .select()
      .from(familyMembers)
      .where(eq(familyMembers.id, memberId))
      .limit(1);
    return member;
  }

  async getFamilyDetails(familyId: string): Promise<{ id: string; name: string; code: string; members: FamilyMember[] } | undefined> {
    const db = initializeDatabase();
    
    // Get family info
    const [family] = await db
      .select()
      .from(families)
      .where(eq(families.id, familyId))
      .limit(1);
    
    if (!family) return undefined;
    
    // Get all family members
    const members = await db
      .select()
      .from(familyMembers)
      .where(eq(familyMembers.familyId, familyId))
      .orderBy(familyMembers.joinedAt);
    
    return {
      id: family.id,
      name: family.name,
      code: family.code,
      members,
    };
  }

  async removeFamilyMember(familyId: string, userId: string): Promise<boolean> {
    const db = initializeDatabase();
    const result = await db
      .delete(familyMembers)
      .where(and(eq(familyMembers.familyId, familyId), eq(familyMembers.userId, userId)));
    return (result.rowCount ?? 0) > 0;
  }

  async removeFamilyMemberById(memberId: string): Promise<boolean> {
    const db = initializeDatabase();
    const result = await db
      .delete(familyMembers)
      .where(eq(familyMembers.id, memberId));
    return (result.rowCount ?? 0) > 0;
  }

  async deleteFamily(familyId: string): Promise<boolean> {
    const db = initializeDatabase();
    
    // Note: Due to foreign key constraints with CASCADE, deleting the family
    // will automatically delete all related family members and grocery items
    const result = await db
      .delete(families)
      .where(eq(families.id, familyId));
    
    return (result.rowCount ?? 0) > 0;
  }

  async getUserFamilies(userId: string): Promise<UserFamilyMembership[]> {
    const db = initializeDatabase();
    const result = await db
      .select({
        familyId: familyMembers.familyId,
        familyName: families.name,
        familyCode: families.code,
        role: familyMembers.role,
        joinedAt: familyMembers.joinedAt,
      })
      .from(familyMembers)
      .innerJoin(families, eq(familyMembers.familyId, families.id))
      .where(eq(familyMembers.userId, userId))
      .orderBy(familyMembers.joinedAt);
    
    return result.map((row: any) => ({
      familyId: row.familyId,
      familyName: row.familyName,
      familyCode: row.familyCode,
      role: row.role,
      joinedAt: row.joinedAt.toISOString(),
    }));
  }

  async getAllUserFamiliesWithDetails(userId: string): Promise<FamilyWithRole[]> {
    const db = initializeDatabase();
    
    // Get all families the user is a member of, with member count
    const result = await db
      .select({
        id: families.id,
        name: families.name,
        code: families.code,
        createdAt: families.createdAt,
        createdBy: families.createdBy,
        role: familyMembers.role,
        memberCount: count(familyMembers.id),
      })
      .from(families)
      .innerJoin(familyMembers, eq(families.id, familyMembers.familyId))
      .where(eq(familyMembers.userId, userId))
      .groupBy(families.id, familyMembers.role)
      .orderBy(families.name);
    
    return result.map((row: any) => ({
      id: row.id,
      name: row.name,
      code: row.code,
      createdAt: row.createdAt,
      createdBy: row.createdBy,
      role: row.role,
      memberCount: Number(row.memberCount),
    }));
  }
}
