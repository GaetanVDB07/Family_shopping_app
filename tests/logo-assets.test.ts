import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const logoPaths = [
  "client/public/favicon.svg",
  "client/public/icons/icon-192.svg",
  "client/public/icons/icon-512.svg",
  "client/public/icons/maskable-icon-512.svg",
] as const;

describe("Shopy logo assets", () => {
  it.each(logoPaths)("keeps %s as a scalable shopping-cart mark", (logoPath) => {
    const source = readFileSync(resolve(logoPath), "utf8");

    expect(source).toContain('viewBox="0 0 64 64"');
    expect(source).toContain("Shopy shopping cart");
    expect(source).toContain("#38803a");
    expect(source.match(/<circle/g)).toHaveLength(2);
    expect(source).not.toContain("#fbbf24");
  });
});
