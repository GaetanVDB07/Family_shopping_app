import { describe, expect, it } from "vitest";
import { mapRealtimeGroceryRow } from "../shared/realtime-grocery";

describe("mapRealtimeGroceryRow", () => {
  it("maps snake_case Supabase realtime payloads to GroceryItem", () => {
    const item = mapRealtimeGroceryRow({
      id: 12,
      name: "Melk",
      quantity: "2",
      unit: "L",
      notes: "halfvol",
      completed: false,
      added_by: "user-abc",
      family_id: "family-xyz",
      added_at: "2026-01-15T10:00:00.000Z",
      created_at: "2026-01-15T10:00:00.000Z",
    });

    expect(item).toEqual({
      id: 12,
      name: "Melk",
      quantity: "2",
      unit: "L",
      notes: "halfvol",
      completed: false,
      addedBy: "user-abc",
      addedByName: null,
      familyId: "family-xyz",
      addedAt: new Date("2026-01-15T10:00:00.000Z"),
      sortOrder: 0,
      completedAt: null,
      archivedAt: null,
      createdAt: new Date("2026-01-15T10:00:00.000Z"),
    });
  });

  it("accepts already camelCase payloads", () => {
    const item = mapRealtimeGroceryRow({
      id: 3,
      name: "Brood",
      completed: true,
      addedBy: "User One",
      familyId: "family-1",
      addedAt: "2026-02-01T08:30:00.000Z",
      createdAt: "2026-02-01T08:30:00.000Z",
    });

    expect(item.addedBy).toBe("User One");
    expect(item.familyId).toBe("family-1");
  });

  it("maps nullable quantity, unit, and notes fields", () => {
    const item = mapRealtimeGroceryRow({
      id: 4,
      name: "Kaas",
      quantity: null,
      unit: null,
      notes: null,
      completed: false,
      added_by: "user-abc",
      family_id: "family-1",
      added_at: "2026-01-15T10:00:00.000Z",
      created_at: "2026-01-15T10:00:00.000Z",
    });

    expect(item.quantity).toBeNull();
    expect(item.unit).toBeNull();
    expect(item.notes).toBeNull();
  });

  it("maps sort_order from realtime payloads", () => {
    const item = mapRealtimeGroceryRow({
      id: 6,
      name: "Eieren",
      completed: false,
      added_by: "user-abc",
      family_id: "family-1",
      sort_order: 4,
      added_at: "2026-01-15T10:00:00.000Z",
      created_at: "2026-01-15T10:00:00.000Z",
    });

    expect(item.sortOrder).toBe(4);
  });

  it("maps added_by_name from realtime payloads", () => {
    const item = mapRealtimeGroceryRow({
      id: 5,
      name: "Bananen",
      completed: false,
      added_by: "fddc0f4f-6ea3-4ef9-89d0-b2d01ad25156",
      added_by_name: "Lisa",
      family_id: "family-1",
      added_at: "2026-01-15T10:00:00.000Z",
      created_at: "2026-01-15T10:00:00.000Z",
    });

    expect(item.addedBy).toBe("fddc0f4f-6ea3-4ef9-89d0-b2d01ad25156");
    expect(item.addedByName).toBe("Lisa");
  });

  it("maps realtime user ids as ids when added_by_name is absent", () => {
    const item = mapRealtimeGroceryRow({
      id: 5,
      name: "Bananen",
      completed: false,
      added_by: "fddc0f4f-6ea3-4ef9-89d0-b2d01ad25156",
      family_id: "family-1",
      added_at: "2026-01-15T10:00:00.000Z",
      created_at: "2026-01-15T10:00:00.000Z",
    });

    expect(item.addedBy).toBe("fddc0f4f-6ea3-4ef9-89d0-b2d01ad25156");
    expect(item.addedByName).toBeNull();
  });
});
