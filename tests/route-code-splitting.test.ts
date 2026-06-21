import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const appSource = readFileSync(resolve("client/src/App.tsx"), "utf8");

const routePages = [
  "grocery-list",
  "auth",
  "family-setup",
  "family-management",
  "families-overview",
] as const;

describe("route-level code splitting (#196)", () => {
  it("lazy-loads route pages instead of static imports", () => {
    expect(appSource).toContain("lazy(");
    expect(appSource).toContain("Suspense");

    for (const page of routePages) {
      expect(appSource).toMatch(
        new RegExp(`lazy\\(\\s*\\(\\)\\s*=>\\s*import\\(["']@/pages/${page}["']\\)`),
      );
      expect(appSource).not.toMatch(
        new RegExp(`^import\\s+\\w+\\s+from\\s+["']@/pages/${page}["']`, "m"),
      );
    }
  });

  it("shows a loading fallback while lazy routes load", () => {
    expect(appSource).toContain("PageLoading");
    expect(appSource).toMatch(/fallback=\{<PageLoading\s*\/>\}/);
  });

  it("wraps authenticated routes in a shared Suspense boundary", () => {
    expect(appSource).toContain("function LazyPage");
    expect(appSource).toMatch(/<LazyPage>\s*\n?\s*<GroceryList/);
    expect(appSource).toMatch(/<LazyPage>\s*\n?\s*<FamiliesOverview/);
  });
});
