import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { groceryItems, type GroceryItem, type InsertGroceryItem } from "@shared/schema";
import { eq } from "drizzle-orm";
import type { IStorage } from "./storage";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql);

export class DatabaseStorage implements IStorage {
  async getAllGroceryItems(): Promise<GroceryItem[]> {
    const items = await db.select().from(groceryItems).orderBy(groceryItems.createdAt);
    return items;
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
    return result.rowCount > 0;
  }

  async getGroceryItem(id: number): Promise<GroceryItem | undefined> {
    const [item] = await db.select().from(groceryItems).where(eq(groceryItems.id, id));
    return item;
  }
}
