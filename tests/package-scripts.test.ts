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
});
