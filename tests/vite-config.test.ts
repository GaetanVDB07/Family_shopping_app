import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';

describe('vite config', () => {
  it('points PostCSS at the repo-root config so Tailwind runs when root is client/', () => {
    const viteConfigSource = readFileSync(
      path.resolve(__dirname, '../vite.config.ts'),
      'utf-8',
    );

    expect(viteConfigSource).toContain('postcss.config.js');
    expect(viteConfigSource).toMatch(/css:\s*\{/);
  });
});
