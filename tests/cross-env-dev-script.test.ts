import { describe, expect, it } from 'vitest';
import { execSync } from 'node:child_process';
import packageJson from '../package.json';

describe('dev script portability (#82)', () => {
  it('declares cross-env in the dev script', () => {
    expect(packageJson.scripts.dev).toMatch(/^cross-env NODE_ENV=development tsx server\/index\.ts$/);
  });

  it('runs cross-env to set NODE_ENV on any platform', () => {
    const output = execSync(
      'npx cross-env NODE_ENV=development node -e "process.stdout.write(process.env.NODE_ENV)"',
      { encoding: 'utf8' },
    );

    expect(output).toBe('development');
  });
});
