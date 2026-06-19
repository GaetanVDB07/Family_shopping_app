import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(resolve("scripts/add-grocery-history-columns.sql"), "utf8");

describe("add-grocery-history-columns.sql", () => {
  it("adds completed_at and archived_at and backfills completed items", () => {
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS completed_at");
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS archived_at");
    expect(sql).toContain("SET completed_at = COALESCE(added_at, created_at)");
  });
});
