import { describe, expect, it } from "vitest";
import {
  applyMemberNamesToGroceryItems,
  buildFamilyMemberNameMap,
  getGroceryItemAddedByDisplayName,
  looksLikeAuthUserId,
  resolveAddedByDisplayName,
} from "@/lib/family-member-names";

describe("family-member-names", () => {
  it("detects auth user ids", () => {
    expect(looksLikeAuthUserId("user-1")).toBe(false);
    expect(looksLikeAuthUserId("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
  });

  it("builds a member name map from family members", () => {
    const map = buildFamilyMemberNameMap([
      {
        userId: "user-1",
        userName: "Papa",
        userEmail: "papa@example.com",
      },
      {
        userId: "user-2",
        userName: null,
        userEmail: "mama@example.com",
      },
    ]);

    expect(map.get("user-1")).toBe("Papa");
    expect(map.get("user-2")).toBe("mama");
  });

  it("resolves uuid addedBy values using the member map", () => {
    const map = new Map([["22222222-2222-2222-2222-222222222222", "Lisa"]]);

    expect(resolveAddedByDisplayName("Mama", map)).toBe("Mama");
    expect(resolveAddedByDisplayName("user-2", map)).toBe("user-2");
    expect(
      resolveAddedByDisplayName(
        "22222222-2222-2222-2222-222222222222",
        map,
      ),
    ).toBe("Lisa");
  });

  it("prefers denormalized addedByName for display", () => {
    expect(
      getGroceryItemAddedByDisplayName({
        addedBy: "22222222-2222-2222-2222-222222222222",
        addedByName: "Lisa",
      }),
    ).toBe("Lisa");
  });

  it("re-applies member names to cached grocery items", () => {
    const items = [
      {
        id: 1,
        name: "Melk",
        quantity: null,
        unit: null,
        notes: null,
        completed: false,
        addedBy: "22222222-2222-2222-2222-222222222222",
        familyId: "family-1",
        addedAt: new Date(),
        sortOrder: 0,
        completedAt: null,
        archivedAt: null,
        createdAt: new Date(),
      },
    ];
    const map = new Map([["22222222-2222-2222-2222-222222222222", "Lisa"]]);

    const updated = applyMemberNamesToGroceryItems(items, map);

    expect(updated).not.toBe(items);
    expect(updated[0]?.addedBy).toBe("Lisa");
    expect(updated[0]?.addedByName).toBe("Lisa");
  });

  it("does not cache raw auth user ids in addedByName", () => {
    const items = [
      {
        id: 1,
        name: "Melk",
        quantity: null,
        unit: null,
        notes: null,
        completed: false,
        addedBy: "22222222-2222-2222-2222-222222222222",
        familyId: "family-1",
        addedAt: new Date(),
        sortOrder: 0,
        completedAt: null,
        archivedAt: null,
        createdAt: new Date(),
      },
    ];
    const map = new Map([["33333333-3333-3333-3333-333333333333", "Papa"]]);

    const updated = applyMemberNamesToGroceryItems(items, map);

    expect(updated[0]?.addedBy).toBe("22222222-2222-2222-2222-222222222222");
    expect(updated[0]?.addedByName).toBeNull();
  });

  it("preserves offline cache metadata when re-applying member names", () => {
    const items = Object.assign([
      {
        id: 1,
        name: "Melk",
        quantity: null,
        unit: null,
        notes: null,
        completed: false,
        addedBy: "22222222-2222-2222-2222-222222222222",
        familyId: "family-1",
        addedAt: new Date(),
        sortOrder: 0,
        completedAt: null,
        archivedAt: null,
        createdAt: new Date(),
      },
    ], { isOfflineData: true });
    const map = new Map([["22222222-2222-2222-2222-222222222222", "Lisa"]]);

    const updated = applyMemberNamesToGroceryItems(items, map);

    expect(updated.isOfflineData).toBe(true);
    expect(updated[0]?.addedBy).toBe("Lisa");
  });
});
