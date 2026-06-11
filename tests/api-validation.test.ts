import { describe, expect, it } from "vitest";
import {
  createFamilyRequestSchema,
  createGroceryItemRequestSchema,
  joinFamilyRequestSchema,
  updateGroceryItemRequestSchema,
} from "../shared/api-validation.js";

describe("API request schemas", () => {
  it("rejects whitespace-only family names", () => {
    const result = createFamilyRequestSchema.safeParse({ name: "   " });
    expect(result.success).toBe(false);
  });

  it("accepts trimmed family names", () => {
    const result = createFamilyRequestSchema.safeParse({ name: "  Vandenberghe  " });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Vandenberghe");
    }
  });

  it("rejects family names over 100 characters", () => {
    const result = createFamilyRequestSchema.safeParse({ name: "a".repeat(101) });
    expect(result.success).toBe(false);
  });

  it("rejects invalid join codes", () => {
    const result = joinFamilyRequestSchema.safeParse({ code: "ABC123" });
    expect(result.success).toBe(false);
  });

  it("rejects whitespace-only grocery item names", () => {
    const result = createGroceryItemRequestSchema.safeParse({ name: "   " });
    expect(result.success).toBe(false);
  });

  it("trims optional grocery fields and converts blanks to null", () => {
    const result = createGroceryItemRequestSchema.safeParse({
      name: "Melk",
      quantity: " 2 ",
      unit: "   ",
      notes: "  Halfvolle melk  ",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.quantity).toBe("2");
      expect(result.data.unit).toBeNull();
      expect(result.data.notes).toBe("Halfvolle melk");
    }
  });

  it("rejects grocery notes over 200 characters", () => {
    const result = createGroceryItemRequestSchema.safeParse({
      name: "Melk",
      notes: "n".repeat(201),
    });
    expect(result.success).toBe(false);
  });

  it("rejects grocery updates with no mutable fields", () => {
    const result = updateGroceryItemRequestSchema.safeParse({ familyId: "family-1" });
    expect(result.success).toBe(false);
  });
});
