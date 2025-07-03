import { groceryItems, type GroceryItem, type InsertGroceryItem, type Family, type FamilyMember } from "@shared/schema";
import { DatabaseStorage } from "./database-storage";

export interface IStorage {
  // Grocery Items
  getAllGroceryItems(familyId?: string): Promise<GroceryItem[]>;
  createGroceryItem(item: InsertGroceryItem): Promise<GroceryItem>;
  updateGroceryItem(id: number, updates: Partial<InsertGroceryItem>): Promise<GroceryItem | undefined>;
  deleteGroceryItem(id: number): Promise<boolean>;
  getGroceryItem(id: number): Promise<GroceryItem | undefined>;
  
  // Family Management
  createFamily(family: { name: string; code: string; createdBy: string }): Promise<Family>;
  getFamilyByCode(code: string): Promise<Family | undefined>;
  addFamilyMember(member: { familyId: string; userId: string; userEmail: string; userName: string; role: string }): Promise<FamilyMember>;
  getFamilyMember(familyId: string, userId: string): Promise<FamilyMember | undefined>;
  getUserFamily(userId: string): Promise<{ familyId: string; familyName: string; role: string } | undefined>;
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
    const dummyFamilyId = "demo-family-123";
    const initialItems: InsertGroceryItem[] = [
      { name: "Melk (1 liter)", completed: false, addedBy: "demo-user", familyId: dummyFamilyId },
      { name: "Brood (volkoren)", completed: false, addedBy: "demo-user", familyId: dummyFamilyId },
      { name: "Bananen", completed: false, addedBy: "demo-user", familyId: dummyFamilyId },
      { name: "Appels (elstar)", completed: false, addedBy: "demo-user", familyId: dummyFamilyId },
      { name: "Eieren (12 stuks)", completed: true, addedBy: "demo-user", familyId: dummyFamilyId },
      { name: "Yoghurt (naturel)", completed: true, addedBy: "demo-user", familyId: dummyFamilyId },
    ];

    for (const item of initialItems) {
      await this.createGroceryItem(item);
    }
  }

  async getAllGroceryItems(familyId?: string): Promise<GroceryItem[]> {
    const allItems = Array.from(this.groceryItems.values());
    if (familyId) {
      return allItems.filter(item => item.familyId === familyId).sort((a, b) => 
        a.createdAt.getTime() - b.createdAt.getTime()
      );
    }
    return allItems.sort((a, b) => 
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
      familyId: insertItem.familyId,
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

  // Family Management (stub implementations for memory storage)
  async createFamily(family: { name: string; code: string; createdBy: string }): Promise<Family> {
    throw new Error("Family management not supported in memory storage");
  }

  async getFamilyByCode(code: string): Promise<Family | undefined> {
    throw new Error("Family management not supported in memory storage");
  }

  async addFamilyMember(member: { familyId: string; userId: string; userEmail: string; userName: string; role: string }): Promise<FamilyMember> {
    throw new Error("Family management not supported in memory storage");
  }

  async getFamilyMember(familyId: string, userId: string): Promise<FamilyMember | undefined> {
    throw new Error("Family management not supported in memory storage");
  }

  async getUserFamily(userId: string): Promise<{ familyId: string; familyName: string; role: string } | undefined> {
    throw new Error("Family management not supported in memory storage");
  }
}

// Lazy-load storage based on environment variables
let storageInstance: IStorage | null = null;

export function getStorage(): IStorage {
  if (!storageInstance) {
    storageInstance = process.env.DATABASE_URL ? new DatabaseStorage() : new MemStorage();
  }
  return storageInstance;
}

// For backwards compatibility, export storage as a getter
export const storage = new Proxy({} as IStorage, {
  get(target, prop) {
    return (getStorage() as any)[prop];
  }
});
