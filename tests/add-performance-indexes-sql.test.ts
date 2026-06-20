import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(resolve("scripts/add-performance-indexes.sql"), "utf8");

describe("add-performance-indexes.sql", () => {
  it("indexes family_members by user_id", () => {
    expect(sql).toContain("CREATE INDEX IF NOT EXISTS idx_family_members_user_id");
    expect(sql).toContain("ON family_members (user_id)");
  });

  it("indexes active grocery items by family_id", () => {
    expect(sql).toContain("CREATE INDEX IF NOT EXISTS idx_grocery_items_family_active");
    expect(sql).toContain("WHERE archived_at IS NULL");
  });

  it("indexes grocery items for sort order within a family", () => {
    expect(sql).toContain("CREATE INDEX IF NOT EXISTS idx_grocery_items_family_sort");
    expect(sql).toContain("ON grocery_items (family_id, sort_order, added_at)");
  });
});
