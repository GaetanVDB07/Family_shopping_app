import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(resolve("scripts/add-family-members-unique.sql"), "utf8");

describe("add-family-members-unique.sql", () => {
  it("deduplicates memberships before adding the unique index", () => {
    expect(sql).toContain("DELETE FROM family_members older");
    expect(sql).toContain("older.family_id = newer.family_id");
    expect(sql).toContain("older.user_id = newer.user_id");
  });

  it("creates a unique index on family_id and user_id", () => {
    expect(sql).toContain("CREATE UNIQUE INDEX IF NOT EXISTS family_members_family_user_unique");
    expect(sql).toContain("ON family_members (family_id, user_id)");
  });
});
