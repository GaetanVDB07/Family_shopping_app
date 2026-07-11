import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("authenticated family routing", () => {
  it("handles family loading errors before deciding that the user has no families", () => {
    const source = readFileSync(resolve("client/src/App.tsx"), "utf8");
    const errorGate = source.indexOf("if (familyError)");
    const readinessGate = source.indexOf("if (!familyDataReady)");
    const emptyFamilyGate = source.indexOf("if (!hasFamilies)");

    expect(errorGate).toBeGreaterThan(-1);
    expect(readinessGate).toBeGreaterThan(errorGate);
    expect(emptyFamilyGate).toBeGreaterThan(readinessGate);
    expect(source).toContain("Families konden niet worden geladen");
    expect(source).toContain("Opnieuw proberen");
  });
});
