import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("service worker asset", () => {
  it("caches the app shell and handles navigation fetches", () => {
    const source = readFileSync(
      path.join(process.cwd(), "client/public/sw.js"),
      "utf-8",
    );

    expect(source).toContain("self.addEventListener('install'");
    expect(source).toContain("self.addEventListener('activate'");
    expect(source).toContain("self.addEventListener('fetch'");
    expect(source).toContain("family-shopping-app-v2");
    expect(source).toContain("/index.html");
    expect(source).toContain("request.mode === 'navigate'");
    expect(source).toContain("url.pathname.startsWith('/api/')");
    expect(source).toContain("cacheDiscoveredAssets");
    expect(source).toContain("\\/assets\\/");
  });
});
