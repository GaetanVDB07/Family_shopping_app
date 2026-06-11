import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(resolve("scripts/add-grocery-added-at.sql"), "utf8");

describe("add-grocery-added-at.sql", () => {
  it("adds added_at and backfills from created_at", () => {
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS added_at");
    expect(sql).toContain("SET added_at = created_at");
    expect(sql).toContain("ALTER COLUMN added_at SET NOT NULL");
  });
});
