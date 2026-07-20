import { describe, expect, it, vi } from 'vitest';
import { runProductionHealthCheck } from '../scripts/check-production-health.mjs';
import { analyzeRuntimeHealth } from '../scripts/check-runtime-log-alerts.mjs';

describe('production resilience checks', () => {
  it('accepts healthy ping, auth guard, and cron responses', async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      if (url.endsWith('/api/user/families')) return new Response('{}', { status: 401 });
      return new Response('{"ok":true}', { status: 200 });
    });

    const report = await runProductionHealthCheck({
      baseUrl: 'https://app.test',
      cronSecret: 'secret',
      fetchImpl: fetchImpl as typeof fetch,
      samples: 2,
      maxP95Ms: 1_000,
    });

    expect(report.ok).toBe(true);
    expect(report.unauthorizedGuardStatus).toBe(401);
    expect(report.cronStatus).toBe(200);
  });

  it('alerts on elevated 401, 5xx, and latency rates', () => {
    const lines = Array.from({ length: 20 }, (_, index) => JSON.stringify({
      message: 'api_request_completed',
      status: index < 6 ? 401 : index < 9 ? 500 : 200,
      duration_ms: index >= 18 ? 2_500 : 100,
    }));

    const report = analyzeRuntimeHealth(lines);

    expect(report.ok).toBe(false);
    expect(report.alerts.join(' ')).toContain('5xx rate');
    expect(report.alerts.join(' ')).toContain('401 rate');
    expect(report.alerts.join(' ')).toContain('p95');
  });
});
