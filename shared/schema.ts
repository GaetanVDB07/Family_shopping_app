import { pgTable, text, serial, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const groceryItems = pgTable("grocery_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  completed: boolean("completed").notNull().default(false),
  addedBy: text("added_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertGroceryItemSchema = createInsertSchema(groceryItems).omit({
  id: true,
  createdAt: true,
});

export type InsertGroceryItem = z.infer<typeof insertGroceryItemSchema>;
export type GroceryItem = typeof groceryItems.$inferSelect;

// WebSocket message types
export type WebSocketMessage = 
  | { type: 'itemAdded'; item: GroceryItem }
  | { type: 'itemUpdated'; item: GroceryItem }
  | { type: 'itemDeleted'; id: number }
  | { type: 'sync'; items: GroceryItem[] };
