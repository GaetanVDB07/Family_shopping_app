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
  completedAt: timestamp("completed_at"), // when item was last checked off
  archivedAt: timestamp("archived_at"), // soft-removed from active list, kept for history
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
