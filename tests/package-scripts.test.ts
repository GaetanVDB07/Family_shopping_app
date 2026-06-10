import { describe, expect, it } from 'vitest';
import packageJson from '../package.json';

describe('package scripts', () => {
  it('builds both the client assets and the production server entrypoint', () => {
    expect(packageJson.scripts.build).toContain('vite build');
    expect(packageJson.scripts.build).toContain('node scripts/build-server.mjs');
  });

  it('starts through the production launcher instead of a missing direct entrypoint', () => {
    expect(packageJson.scripts.start).toBe('node scripts/start-production.mjs');
  });

  it('uses cross-env for a portable dev script', () => {
    expect(packageJson.scripts.dev).toContain('cross-env NODE_ENV=development');
    expect(packageJson.scripts.dev).toContain('tsx server/index.ts');
  });

  it('provides local version check commands', () => {
    expect(packageJson.scripts['check:version-bump']).toBe('node scripts/check-version-bump.mjs bump');
    expect(packageJson.scripts['check:release-version']).toBe('node scripts/check-version-bump.mjs release');
    expect(packageJson.scripts['check:hotfix-version-bump']).toBe('node scripts/check-version-bump.mjs bump origin/main HEAD');
    expect(packageJson.scripts['hotfix:start']).toBe('node scripts/start-hotfix.mjs');
  });
});
