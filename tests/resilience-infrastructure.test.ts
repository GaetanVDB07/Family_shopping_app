import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(__dirname, '..');
const read = (relativePath: string) => readFileSync(path.join(root, relativePath), 'utf8');

describe('release and resilience infrastructure', () => {
  it('runs the mobile release flow against local Supabase in CI', () => {
    const workflow = read('.github/workflows/e2e.yml');
    const runner = read('scripts/run-local-e2e.mjs');
    const config = read('playwright.config.ts');

    expect(workflow).toContain('npm run test:e2e:local');
    expect(runner).toContain("supabase(['start'], { capture: true })");
    expect(runner).toContain('Refusing E2E schema push because DATABASE_URL is not local Supabase.');
    expect(config).toContain("devices['Pixel 5']");
  });

  it('encrypts retained backups and verifies every backup by isolated restore', () => {
    const workflow = read('.github/workflows/database-backup.yml');
    const restoreWorkflow = read('.github/workflows/restore-drill.yml');
    const script = read('scripts/backup-restore-drill.mjs');

    expect(workflow).toContain('BACKUP_ENCRYPTION_KEY');
    expect(workflow).toContain('production-public.dump.enc');
    expect(workflow).toContain('retention-days: 14');
    expect(script).toContain("'pg_restore'");
    expect(script).toContain("'families', (select count(*) from public.families)");
    expect(restoreWorkflow).toContain('--encrypted-input');
  });

  it('alerts through a durable GitHub issue and documents safe recovery', () => {
    const healthWorkflow = read('.github/workflows/production-health.yml');
    const backupWorkflow = read('.github/workflows/database-backup.yml');
    const runbook = read('docs/RESILIENCE_RUNBOOK.md');

    expect(healthWorkflow).toContain('[monitoring] Production health check failing');
    expect(backupWorkflow).toContain('[monitoring] Encrypted production backup failing');
    expect(runbook).toContain('Never point the restore-drill workflow at production.');
    expect(runbook).toContain('application data only');
  });
});
