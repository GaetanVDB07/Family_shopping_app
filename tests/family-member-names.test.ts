import { describe, expect, it } from "vitest";
import {
  buildFamilyMemberNameMap,
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
    const map = new Map([["user-2", "Mama"]]);

    expect(resolveAddedByDisplayName("Mama", map)).toBe("Mama");
    expect(resolveAddedByDisplayName("user-2", map)).toBe("user-2");
    expect(
      resolveAddedByDisplayName("550e8400-e29b-41d4-a716-446655440000", map),
    ).toBe("550e8400-e29b-41d4-a716-446655440000");
    expect(
      resolveAddedByDisplayName(
        "22222222-2222-2222-2222-222222222222",
        new Map([["22222222-2222-2222-2222-222222222222", "Lisa"]]),
      ),
    ).toBe("Lisa");
  });
});
