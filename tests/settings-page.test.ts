import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const menuSource = readFileSync(resolve("client/src/components/user-menu.tsx"), "utf8");
const settingsSource = readFileSync(resolve("client/src/pages/settings.tsx"), "utf8");

describe("settings page navigation", () => {
  it("keeps the header menu short and routes options to settings", () => {
    expect(menuSource).toContain("Alle families");
    expect(menuSource).toContain("Instellingen");
    expect(menuSource).toContain("/settings/");
    expect(menuSource).not.toContain("DropdownMenuSub");
    expect(menuSource).not.toContain("Account verwijderen");
  });

  it("groups the former flyout options on one dedicated page", () => {
    expect(settingsSource).toContain("Weergave");
    expect(settingsSource).toContain("Afvink-feedback");
    expect(settingsSource).toContain("Lijst delen");
    expect(settingsSource).toContain("Familie beheren");
    expect(settingsSource).toContain("Account verwijderen");
  });
});
