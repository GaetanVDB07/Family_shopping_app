import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(resolve("scripts/enable-rls.sql"), "utf8");

describe("enable-rls.sql", () => {
  it("enables RLS on all app tables", () => {
    expect(sql).toContain("ALTER TABLE family_members ENABLE ROW LEVEL SECURITY");
    expect(sql).toContain("ALTER TABLE families ENABLE ROW LEVEL SECURITY");
    expect(sql).toContain("ALTER TABLE grocery_items ENABLE ROW LEVEL SECURITY");
  });

  it("scopes read access to authenticated family members", () => {
    expect(sql).toContain('CREATE POLICY "family_members_select_own"');
    expect(sql).toContain('CREATE POLICY "families_select_member"');
    expect(sql).toContain('CREATE POLICY "grocery_items_select_member"');
    expect(sql).toContain("user_id = auth.uid()");
  });

  it("is idempotent via DROP POLICY IF EXISTS", () => {
    expect(sql.match(/DROP POLICY IF EXISTS/g)?.length).toBe(3);
  });
});
