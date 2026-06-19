import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

describe("dark mode theme wiring", () => {
  it("wraps the app with ThemeProvider", () => {
    const appSource = readFileSync(resolve("client/src/App.tsx"), "utf8");
    expect(appSource).toContain("ThemeProvider");
    expect(appSource).toContain("<ThemeProvider>");
  });

  it("configures next-themes for class-based dark mode with light as the default", () => {
    const providerSource = readFileSync(resolve("client/src/components/theme-provider.tsx"), "utf8");
    expect(providerSource).toContain('attribute="class"');
    expect(providerSource).toContain('defaultTheme="light"');
    expect(providerSource).toContain("enableSystem");
  });

  it("exposes light, dark, and system options in the user menu", () => {
    const toggleSource = readFileSync(resolve("client/src/components/theme-toggle.tsx"), "utf8");
    expect(toggleSource).toContain('setTheme("light")');
    expect(toggleSource).toContain('setTheme("dark")');
    expect(toggleSource).toContain('setTheme("system")');
    expect(toggleSource).toContain("Licht");
    expect(toggleSource).toContain("Donker");
    expect(toggleSource).toContain("Systeem");
  });

  it("defines dark mode CSS variables", () => {
    const cssSource = readFileSync(resolve("client/src/index.css"), "utf8");
    expect(cssSource).toContain(".dark {");
    expect(cssSource).toContain("--background:");
  });

  it("keeps primary app surfaces on theme-aware color tokens", () => {
    const themedFiles = [
      "client/src/pages/auth.tsx",
      "client/src/pages/grocery-list.tsx",
      "client/src/components/grocery-item.tsx",
      "client/src/pages/families-overview.tsx",
      "client/src/pages/family-management.tsx",
      "client/src/pages/family-setup.tsx",
      "client/src/components/family-invite-share.tsx",
      "client/src/components/user-menu.tsx",
      "client/src/pages/not-found.tsx",
    ];

    for (const file of themedFiles) {
      const source = readFileSync(resolve(file), "utf8");
      expect(source, file).not.toMatch(/(^|[\s"'`])(bg-white|bg-gray-\d+|text-gray-\d+|border-gray-\d+|from-blue-50|to-indigo-100)\b/);
    }
  });
});
