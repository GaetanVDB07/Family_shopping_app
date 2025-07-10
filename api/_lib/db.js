const { drizzle } = require("drizzle-orm/node-postgres");
const { Client } = require("pg");
const { 
  groceryItems, 
  families, 
  familyMembers
} = require("../../shared/schema");
const { eq, and } = require("drizzle-orm");

// Lazy initialization to ensure environment variables are loaded
let db = null;
let client = null;

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

function getDatabase() {
  if (!db) {
    initializeDatabase();
  }
  return db;
}

module.exports = { getDatabase, groceryItems, families, familyMembers, eq, and };
