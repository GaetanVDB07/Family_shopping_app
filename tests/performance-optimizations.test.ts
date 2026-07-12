import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import path from "path";

function source(relativePath: string): string {
  return readFileSync(path.resolve(__dirname, "..", relativePath), "utf-8");
}

describe("first-load performance safeguards", () => {
  it("uses verified claims and a reusable database pool in the serverless API", () => {
    const apiSource = source("api/index.js");

    expect(apiSource).toContain("auth.getClaims(token)");
    expect(apiSource).toContain("new Pool({");
    expect(apiSource).toContain("api_request_completed");
    expect(apiSource).toContain("duration_ms");
  });

  it("defines indexes for the family and grocery-list read paths", () => {
    const schemaSource = source("shared/schema.ts");

    expect(schemaSource).toContain("family_members_user_family_idx");
    expect(schemaSource).toContain("grocery_items_active_list_idx");
    expect(schemaSource).toContain("grocery_items_history_idx");
  });

  it("preloads the primary family page and data during idle time", () => {
    const overviewSource = source("client/src/pages/families-overview.tsx");

    expect(overviewSource).toContain("requestIdleCallback");
    expect(overviewSource).toContain("preloadGroceryListPage");
    expect(overviewSource).toContain("prefetchGroceryItems");
  });

  it("keeps toast and update infrastructure outside the critical app module", () => {
    const appSource = source("client/src/App.tsx");
    const deferredSource = source("client/src/components/deferred-app-enhancements.tsx");

    expect(appSource).not.toContain('from "@/components/ui/toaster"');
    expect(appSource).not.toContain('from "@/components/ui/tooltip"');
    expect(appSource).not.toContain('from "@/components/ui/button"');
    expect(deferredSource).toContain('lazy(() =>');
    expect(deferredSource).toContain('import("@/components/ui/toaster")');
  });
});
