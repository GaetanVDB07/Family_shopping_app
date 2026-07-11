import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import path from "path";

describe("production performance index migration", () => {
  const migrationSource = readFileSync(
    path.resolve(__dirname, "../scripts/apply-performance-indexes.mjs"),
    "utf-8",
  );

  it("only creates idempotent concurrent indexes", () => {
    const statements = migrationSource.match(/CREATE INDEX CONCURRENTLY IF NOT EXISTS/g) ?? [];

    expect(statements).toHaveLength(3);
    expect(migrationSource).not.toMatch(/\b(?:DELETE|DROP TABLE|TRUNCATE|UPDATE|INSERT)\b/i);
  });

  it("compares production row counts before and after applying indexes", () => {
    expect(migrationSource).toContain("const before = await readRowCounts(client)");
    expect(migrationSource).toContain("const after = await readRowCounts(client)");
    expect(migrationSource).toContain("dataChanged: false");
  });
});
