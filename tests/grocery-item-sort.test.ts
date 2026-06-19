import { describe, expect, it } from "vitest";
import { compareGroceryItems, sortGroceryItems } from "../client/src/lib/grocery-item-sort";
import type { GroceryItem } from "../shared/schema";

function item(overrides: Partial<GroceryItem> & Pick<GroceryItem, "id" | "name">): GroceryItem {
  return {
    quantity: null,
    unit: null,
    notes: null,
    completed: false,
    addedBy: "User One",
    familyId: "family-1",
    addedAt: new Date("2026-01-01T00:00:00.000Z"),
    sortOrder: 0,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

describe("grocery item sort", () => {
  it("sorts pending items by sortOrder then addedAt", () => {
    const sorted = sortGroceryItems([
      item({ id: 1, name: "Brood", sortOrder: 2 }),
      item({ id: 2, name: "Melk", sortOrder: 0 }),
      item({ id: 3, name: "Kaas", sortOrder: 1 }),
    ]);

    expect(sorted.map((entry) => entry.id)).toEqual([2, 3, 1]);
  });

  it("keeps pending items before completed items", () => {
    const sorted = sortGroceryItems([
      item({ id: 1, name: "Brood", completed: true, sortOrder: 0 }),
      item({ id: 2, name: "Melk", completed: false, sortOrder: 1 }),
    ]);

    expect(sorted.map((entry) => entry.id)).toEqual([2, 1]);
    expect(compareGroceryItems(sorted[0], sorted[1])).toBeLessThan(0);
  });
});
