import type { GroceryItem } from "@shared/schema";
import { getQueuedGroceryMutations } from "@/lib/offline-grocery-queue";

export function applyQueuedGroceryMutations(
  familyId: string,
  items: GroceryItem[],
): GroceryItem[] {
  return getQueuedGroceryMutations(familyId).reduce<GroceryItem[]>(
    (currentItems, mutation) => {
      if (mutation.type === "add") {
        if (currentItems.some((item) => item.id === mutation.payload.tempId)) {
          return currentItems;
        }

        const now = new Date(mutation.createdAt);
        return [
          ...currentItems,
          {
            id: mutation.payload.tempId,
            name: mutation.payload.name,
            quantity: mutation.payload.quantity ?? null,
            unit: mutation.payload.unit ?? null,
            notes: mutation.payload.notes ?? null,
            completed: mutation.payload.completed,
            addedBy: mutation.payload.addedBy ?? "Offline",
            familyId,
            addedAt: now,
            sortOrder: currentItems.length,
            completedAt: null,
            archivedAt: null,
            createdAt: now,
          },
        ];
      }

      if (mutation.type === "toggle") {
        return currentItems.map((item) =>
          item.id === mutation.payload.id
            ? { ...item, completed: mutation.payload.completed }
            : item,
        );
      }

      if (mutation.type === "edit") {
        return currentItems.map((item) =>
          item.id === mutation.payload.id
            ? { ...item, ...mutation.payload.updates }
            : item,
        );
      }

      return currentItems.filter((item) => item.id !== mutation.payload.id);
    },
    items,
  );
}
