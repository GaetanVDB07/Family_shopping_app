import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

const SUPABASE_CLI_VERSION = '2.109.1';

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: options.env ?? process.env,
    encoding: 'utf8',
    stdio: options.capture ? 'pipe' : 'inherit',
    shell: false,
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed with exit code ${result.status}`);
  }
  return result.stdout ?? '';
}

function npx(args, options = {}) {
  const candidates = [
    process.env.npm_execpath
      ? path.join(path.dirname(process.env.npm_execpath), 'npx-cli.js')
      : null,
    path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npx-cli.js'),
    path.join(path.dirname(path.dirname(process.execPath)), 'lib', 'node_modules', 'npm', 'bin', 'npx-cli.js'),
  ].filter(Boolean);
  const cli = candidates.find((candidate) => existsSync(candidate));
  if (!cli) throw new Error('Could not locate the npm npx launcher. Run this script through npm.');
  return run(process.execPath, [cli, ...args], options);
}

function supabase(args, options = {}) {
  return npx(['--yes', `supabase@${SUPABASE_CLI_VERSION}`, ...args], options);
}

function parseEnv(output) {
  return Object.fromEntries(
    output
      .split(/\r?\n/)
      .map((line) => line.match(/^([A-Z0-9_]+)="(.*)"$/))
      .filter(Boolean)
      .map((match) => [match[1], match[2]]),
  );
}

async function waitForLocalAuth(apiUrl) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`${apiUrl}/auth/v1/health`, { signal: AbortSignal.timeout(2_000) });
      if (response.ok) return;
    } catch {
      // A reset restarts the auth container; retry until its health endpoint is ready.
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  throw new Error('Local Supabase Auth did not become healthy after reset.');
}

console.log('Starting local Supabase for release E2E tests...');
supabase(['start'], { capture: true });
const local = parseEnv(supabase(['status', '-o', 'env'], { capture: true }));

if (!/^http:\/\/(127\.0\.0\.1|localhost):/.test(local.API_URL ?? '')) {
  throw new Error('Refusing E2E setup because Supabase API is not local.');
}
if (!/^postgresql:\/\/postgres:postgres@(127\.0\.0\.1|localhost):/.test(local.DB_URL ?? '')) {
  throw new Error('Refusing E2E schema push because DATABASE_URL is not local Supabase.');
}

const reuseLocalDatabase = !process.env.CI && process.env.LOCAL_E2E_REUSE_DATABASE === '1';
if (!reuseLocalDatabase) {
  console.log('Resetting only the verified local Supabase database...');
  supabase(['db', 'reset', '--local', '--no-seed', '--yes']);
}

const env = {
  ...process.env,
  NODE_ENV: 'development',
  DATABASE_URL: local.DB_URL,
  SUPABASE_URL: local.API_URL,
  SUPABASE_ANON_KEY: local.ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: local.SERVICE_ROLE_KEY,
  VITE_SUPABASE_URL: local.API_URL,
  VITE_SUPABASE_ANON_KEY: local.ANON_KEY,
  TEST_BASE_URL: 'http://127.0.0.1:5000',
};

if (!reuseLocalDatabase) {
  console.log('Applying the application schema to local Supabase...');
  npx(['--no-install', 'drizzle-kit', 'push', '--force'], { env });
} else {
  console.log('Reusing the verified local database for a fast developer rerun...');
}

console.log('Waiting for local Supabase Auth to become healthy...');
await waitForLocalAuth(local.API_URL);

console.log('Running Playwright release flows...');
npx(['--no-install', 'playwright', 'test'], { env });
