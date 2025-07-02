import { groceryItems, type GroceryItem, type InsertGroceryItem } from "@shared/schema";
import { DatabaseStorage } from "./database-storage";

export interface IStorage {
  getAllGroceryItems(): Promise<GroceryItem[]>;
  createGroceryItem(item: InsertGroceryItem): Promise<GroceryItem>;
  updateGroceryItem(id: number, updates: Partial<InsertGroceryItem>): Promise<GroceryItem | undefined>;
  deleteGroceryItem(id: number): Promise<boolean>;
  getGroceryItem(id: number): Promise<GroceryItem | undefined>;
}

export class MemStorage implements IStorage {
  private groceryItems: Map<number, GroceryItem>;
  private currentId: number;

  constructor() {
    this.groceryItems = new Map();
    this.currentId = 1;
    
    // Add some initial items for demonstration
    this.seedInitialData();
  }

  private async seedInitialData() {
    const initialItems: InsertGroceryItem[] = [
      { name: "Melk (1 liter)", completed: false, addedBy: "Papa" },
      { name: "Brood (volkoren)", completed: false, addedBy: "Mama" },
      { name: "Bananen", completed: false, addedBy: "Lisa" },
      { name: "Appels (elstar)", completed: false, addedBy: "Max" },
      { name: "Eieren (12 stuks)", completed: true, addedBy: "Papa" },
      { name: "Yoghurt (naturel)", completed: true, addedBy: "Mama" },
    ];

    for (const item of initialItems) {
      await this.createGroceryItem(item);
    }
  }

  async getAllGroceryItems(): Promise<GroceryItem[]> {
    return Array.from(this.groceryItems.values()).sort((a, b) => 
      a.createdAt.getTime() - b.createdAt.getTime()
    );
  }

  async createGroceryItem(insertItem: InsertGroceryItem): Promise<GroceryItem> {
    const id = this.currentId++;
    const item: GroceryItem = {
      id,
      name: insertItem.name,
      completed: insertItem.completed !== undefined ? insertItem.completed : false,
      addedBy: insertItem.addedBy,
      createdAt: new Date(),
    };
    this.groceryItems.set(id, item);
    return item;
  }

  async updateGroceryItem(id: number, updates: Partial<InsertGroceryItem>): Promise<GroceryItem | undefined> {
    const existingItem = this.groceryItems.get(id);
    if (!existingItem) return undefined;

    const updatedItem: GroceryItem = {
      ...existingItem,
      ...updates,
    };
    this.groceryItems.set(id, updatedItem);
    return updatedItem;
  }

  async deleteGroceryItem(id: number): Promise<boolean> {
    return this.groceryItems.delete(id);
  }

  async getGroceryItem(id: number): Promise<GroceryItem | undefined> {
    return this.groceryItems.get(id);
  }
}

// Use database storage in production, memory storage for local development without DATABASE_URL
export const storage = process.env.DATABASE_URL ? new DatabaseStorage() : new MemStorage();
