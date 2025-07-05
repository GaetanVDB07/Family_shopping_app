import { pgTable, text, serial, boolean, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Families table
export const families = pgTable("families", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(), // 6-digit family code
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdBy: uuid("created_by").notNull(), // user id from auth.users
});

// Family members junction table
export const familyMembers = pgTable("family_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  familyId: uuid("family_id").notNull().references(() => families.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull(), // from auth.users
  userEmail: text("user_email").notNull(),
  userName: text("user_name"), // display name
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
  role: text("role").notNull().default("member"), // 'admin' or 'member'
});

// Updated grocery items table
export const groceryItems = pgTable("grocery_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  completed: boolean("completed").notNull().default(false),
  addedBy: uuid("added_by").notNull(), // user id from auth.users
  familyId: uuid("family_id").notNull().references(() => families.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Schemas for validation
export const insertFamilySchema = createInsertSchema(families).omit({
  id: true,
  createdAt: true,
});

export const insertFamilyMemberSchema = createInsertSchema(familyMembers).omit({
  id: true,
  joinedAt: true,
});

export const insertGroceryItemSchema = createInsertSchema(groceryItems).omit({
  id: true,
  createdAt: true,
}).partial({
  addedBy: true,  // Server will provide this
  familyId: true, // Server will provide this
});

// Types
export type Family = typeof families.$inferSelect;
export type InsertFamily = z.infer<typeof insertFamilySchema>;
export type FamilyMember = typeof familyMembers.$inferSelect;
export type InsertFamilyMember = z.infer<typeof insertFamilyMemberSchema>;
export type GroceryItem = typeof groceryItems.$inferSelect;
export type InsertGroceryItem = z.infer<typeof insertGroceryItemSchema>;

// Auth types
export interface User {
  id: string;
  email: string;
  name?: string;
}

// WebSocket message types
export type WebSocketMessage = 
  | { type: 'itemAdded'; item: GroceryItem }
  | { type: 'itemUpdated'; item: GroceryItem }
  | { type: 'itemDeleted'; id: number }
  | { type: 'sync'; items: GroceryItem[] }
  | { type: 'familyUpdated'; family: Family };
