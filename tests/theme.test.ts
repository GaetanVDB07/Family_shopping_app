import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

describe("dark mode theme wiring", () => {
  it("wraps the app with ThemeProvider using system default", () => {
    const appSource = readFileSync(resolve("client/src/App.tsx"), "utf8");
    expect(appSource).toContain("ThemeProvider");
    expect(appSource).toContain("<ThemeProvider>");
  });

  it("configures next-themes for class-based dark mode", () => {
    const providerSource = readFileSync(resolve("client/src/components/theme-provider.tsx"), "utf8");
    expect(providerSource).toContain('attribute="class"');
    expect(providerSource).toContain('defaultTheme="system"');
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
});
