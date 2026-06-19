import { pgTable, text, serial, boolean, timestamp, uuid, unique, integer } from "drizzle-orm/pg-core";
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
}, (table) => ({
  familyUserUnique: unique("family_members_family_user_unique").on(table.familyId, table.userId),
}));

// Updated grocery items table
export const groceryItems = pgTable("grocery_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  quantity: text("quantity"),
  unit: text("unit"),
  notes: text("notes"),
  completed: boolean("completed").notNull().default(false),
  addedBy: uuid("added_by").notNull(), // user id from auth.users
  familyId: uuid("family_id").notNull().references(() => families.id, { onDelete: "cascade" }),
  addedAt: timestamp("added_at").notNull().defaultNow(), // last time item was put on the list
  sortOrder: integer("sort_order").notNull().default(0), // manual order for shopping route
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
  addedAt: true,
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

// Extended types for multi-family support
export interface UserFamilyMembership {
  familyId: string;
  familyName: string;
  familyCode: string;
  role: string;
  joinedAt: string;
  isActive?: boolean; // For current active family
}

export interface FamilyWithRole extends Family {
  role: string;
  memberCount: number;
}

// WebSocket message types
export type WebSocketMessage = 
  | { type: 'itemAdded'; item: GroceryItem }
  | { type: 'itemUpdated'; item: GroceryItem }
  | { type: 'itemDeleted'; id: number }
  | { type: 'sync'; items: GroceryItem[] }
  | { type: 'familyUpdated'; family: Family };
