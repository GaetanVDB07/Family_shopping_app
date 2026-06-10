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
      familyId: "family-xyz",
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
      createdAt: "2026-02-01T08:30:00.000Z",
    });

    expect(item.addedBy).toBe("User One");
    expect(item.familyId).toBe("family-1");
  });
});
