import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import path from "path";

function source(relativePath: string): string {
  return readFileSync(path.resolve(__dirname, "..", relativePath), "utf-8");
}

describe("infrastructure modernization", () => {
  it("runs Vercel functions beside the Paris Supabase database", () => {
    const config = JSON.parse(source("vercel.json"));

    expect(config.regions).toEqual(["cdg1"]);
  });

  it("uses Node 24 for every GitHub setup-node step", () => {
    const workflows = [source(".github/workflows/ci.yml"), source(".github/workflows/version-bump.yml")];

    for (const workflow of workflows) {
      expect(workflow).not.toMatch(/node-version:\s*20/);
      for (const match of workflow.matchAll(/node-version:\s*(\d+)/g)) {
        expect(match[1]).toBe("24");
      }
    }
  });

  it("keeps the deferred follow-up work in the repository backlog", () => {
    const backlog = source("docs/IMPROVEMENT_BACKLOG.md");

    expect(backlog).toContain("bootstrap API endpoint");
    expect(backlog).toContain("dependency vulnerabilities");
    expect(backlog).toContain("end-to-end release tests");
    expect(backlog).toContain("Supabase backups");
  });

  it("pins reviewed security patches and documents the residual Vercel build risk", () => {
    const packageJson = JSON.parse(source("package.json"));
    const securityReview = source("docs/DEPENDENCY_SECURITY.md");

    expect(packageJson.dependencies["@vercel/node"]).toBeUndefined();
    expect(packageJson.devDependencies["@vercel/node"]).toBe("^5.8.23");
    expect(packageJson.devDependencies.esbuild).toBe("^0.28.1");
    expect(packageJson.overrides["form-data"]).toBe("^4.0.6");
    expect(packageJson.overrides.undici).toBe("^6.27.0");
    expect(securityReview).toContain("Four moderate findings remain");
    expect(securityReview).toContain("no Python build");
  });
});
