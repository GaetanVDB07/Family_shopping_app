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
} from "../shared/schema";
import { eq, and } from "drizzle-orm";

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
    client.connect().catch(console.error);
    
    // Create Drizzle instance
    db = drizzle(client);
  }
  
  return db;
}

export function getDatabase() {
  if (!db) {
    initializeDatabase();
  }
  return db;
}

export { groceryItems, families, familyMembers, eq, and };
export type { GroceryItem, InsertGroceryItem, Family, FamilyMember };
