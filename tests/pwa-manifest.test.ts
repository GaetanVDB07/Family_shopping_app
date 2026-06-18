import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

describe("PWA manifest", () => {
  it("exposes installable app metadata from client public assets", () => {
    const manifestPath = path.join(root, "client/public/manifest.webmanifest");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));

    expect(manifest).toMatchObject({
      name: "Shopy",
      short_name: "Shopy",
      start_url: "/",
      scope: "/",
      display: "standalone",
      background_color: "#ffffff",
      theme_color: "#22c55e",
    });
    expect(manifest.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          src: "/icons/icon-192.svg",
          sizes: "192x192",
          type: "image/svg+xml",
        }),
        expect.objectContaining({
          src: "/icons/icon-512.svg",
          sizes: "512x512",
          type: "image/svg+xml",
        }),
        expect.objectContaining({
          src: "/icons/maskable-icon-512.svg",
          sizes: "512x512",
          purpose: "maskable",
        }),
      ]),
    );
  });

  it("links PWA metadata from the HTML entrypoint", () => {
    const html = readFileSync(path.join(root, "client/index.html"), "utf-8");

    expect(html).toContain('<html lang="nl">');
    expect(html).toContain(
      '<link rel="manifest" href="/manifest.webmanifest" />',
    );
    expect(html).toContain(
      '<link rel="apple-touch-icon" href="/icons/icon-192.svg" />',
    );
    expect(html).toContain("<title>Shopy</title>");
    expect(html).toContain(
      '<meta name="apple-mobile-web-app-title" content="Shopy" />',
    );
  });
});
