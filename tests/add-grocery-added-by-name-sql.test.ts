import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(resolve("scripts/add-grocery-added-by-name.sql"), "utf8");

describe("add-grocery-added-by-name.sql", () => {
  it("adds added_by_name and backfills from family_members", () => {
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS added_by_name");
    expect(sql).toContain("FROM family_members AS fm");
    expect(sql).toContain("gi.added_by = fm.user_id");
    expect(sql).toContain("Historical rows keep the name");
  });
});
