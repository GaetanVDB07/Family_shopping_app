import type { GroceryItem } from "@shared/schema";

export function compareGroceryItems(a: GroceryItem, b: GroceryItem): number {
  if (a.completed !== b.completed) {
    return a.completed ? 1 : -1;
  }

  if (a.sortOrder !== b.sortOrder) {
    return a.sortOrder - b.sortOrder;
  }

  return new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime();
}

export function sortGroceryItems(items: GroceryItem[]): GroceryItem[] {
  return [...items].sort(compareGroceryItems);
}
