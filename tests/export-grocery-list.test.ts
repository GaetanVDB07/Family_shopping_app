import { describe, expect, it } from "vitest";
import type { GroceryItem } from "@shared/schema";
import {
  buildWhatsAppShareUrl,
  formatGroceryListForExport,
} from "@/lib/export-grocery-list";

function item(overrides: Partial<GroceryItem>): GroceryItem {
  return {
    id: 1,
    name: "Melk",
    quantity: null,
    unit: null,
    notes: null,
    completed: false,
    addedBy: "tester",
    familyId: "family-1",
    addedAt: new Date("2026-06-11T12:00:00.000Z"),
    sortOrder: 0,
    createdAt: new Date("2026-06-11T12:00:00.000Z"),
    ...overrides,
  };
}

describe("formatGroceryListForExport", () => {
  it("formats pending items with a title and bullet list", () => {
    const text = formatGroceryListForExport(
      [
        item({ id: 1, name: "Melk", sortOrder: 0 }),
        item({ id: 2, name: "Brood", sortOrder: 1 }),
        item({ id: 3, name: "Eieren", completed: true, sortOrder: 2 }),
      ],
      "Jansen",
    );

    expect(text).toBe(
      "Boodschappenlijst (Jansen):\n\n- Melk\n- Brood",
    );
  });

  it("includes quantity and unit when present", () => {
    const text = formatGroceryListForExport([
      item({ id: 1, name: "Melk", quantity: "2", unit: "L" }),
    ]);

    expect(text).toBe("Boodschappenlijst:\n\n- Melk (2 L)");
  });

  it("shows a placeholder when there are no pending items", () => {
    const text = formatGroceryListForExport([
      item({ id: 1, name: "Melk", completed: true }),
    ]);

    expect(text).toBe("Boodschappenlijst:\n\n(geen openstaande items)");
  });
});

describe("buildWhatsAppShareUrl", () => {
  it("encodes the message for WhatsApp", () => {
    expect(buildWhatsAppShareUrl("Boodschappenlijst:\n- Melk")).toBe(
      "https://wa.me/?text=Boodschappenlijst%3A%0A-%20Melk",
    );
  });
});
