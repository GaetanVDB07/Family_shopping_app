import { beforeEach, describe, expect, it } from "vitest";
import type { GroceryItem } from "@shared/schema";
import {
  getCachedGroceryItems,
  setCachedGroceryItems,
} from "@/lib/offline-grocery-cache";

function groceryItem(overrides: Partial<GroceryItem> = {}): GroceryItem {
  return {
    id: 1,
    name: "Melk",
    quantity: null,
    unit: null,
    notes: null,
    completed: false,
    addedBy: "user-1",
    familyId: "family-1",
    addedAt: new Date("2026-06-18T10:00:00.000Z"),
    createdAt: new Date("2026-06-18T10:00:00.000Z"),
    ...overrides,
  };
}

describe("offline grocery cache", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("stores and reads grocery items per family", () => {
    setCachedGroceryItems("family-1", [groceryItem({ id: 1 })]);
    setCachedGroceryItems("family-2", [
      groceryItem({ id: 2, familyId: "family-2", name: "Brood" }),
    ]);

    expect(getCachedGroceryItems("family-1")).toEqual([
      expect.objectContaining({
        id: 1,
        name: "Melk",
        addedAt: new Date("2026-06-18T10:00:00.000Z"),
      }),
    ]);
    expect(getCachedGroceryItems("family-2")).toEqual([
      expect.objectContaining({ id: 2, name: "Brood" }),
    ]);
  });

  it("returns null for missing or corrupted cache data", () => {
    expect(getCachedGroceryItems("family-1")).toBeNull();

    localStorage.setItem("grocery-items-cache:v1:family-1", "{bad json");

    expect(getCachedGroceryItems("family-1")).toBeNull();

    localStorage.setItem(
      "grocery-items-cache:v1:family-1",
      JSON.stringify([{ id: "wrong" }]),
    );

    expect(getCachedGroceryItems("family-1")).toBeNull();
  });
});
