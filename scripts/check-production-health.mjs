import { pathToFileURL } from 'node:url';

function percentile(values, ratio) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * ratio) - 1)];
}

async function timedFetch(fetchImpl, url, options = {}) {
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetchImpl(url, { ...options, signal: controller.signal });
    return { response, durationMs: Date.now() - startedAt };
  } finally {
    clearTimeout(timeout);
  }
}

export async function runProductionHealthCheck({
  baseUrl,
  cronSecret,
  fetchImpl = fetch,
  samples = 3,
  maxP95Ms = 1_500,
}) {
  const root = baseUrl.replace(/\/$/, '');
  const pingDurations = [];
  const failures = [];

  for (let sample = 0; sample < samples; sample += 1) {
    const { response, durationMs } = await timedFetch(fetchImpl, `${root}/api/ping`);
    pingDurations.push(durationMs);
    if (response.status >= 500 || !response.ok) {
      failures.push(`Ping sample ${sample + 1} returned HTTP ${response.status}`);
    }
  }

  const unauthorized = await timedFetch(fetchImpl, `${root}/api/user/families`);
  if (unauthorized.response.status !== 401) {
    failures.push(`Unauthenticated guard returned HTTP ${unauthorized.response.status}, expected 401`);
  }

  let cronStatus = 'not-configured';
  if (cronSecret) {
    const cron = await timedFetch(fetchImpl, `${root}/api/cron/keepalive`, {
      headers: { Authorization: `Bearer ${cronSecret}` },
    });
    cronStatus = cron.response.status;
    if (!cron.response.ok) {
      failures.push(`Database keepalive returned HTTP ${cron.response.status}`);
    }
  }

  const p95Ms = percentile(pingDurations, 0.95);
  if (p95Ms > maxP95Ms) {
    failures.push(`Ping p95 ${p95Ms}ms exceeded ${maxP95Ms}ms`);
  }

  return {
    ok: failures.length === 0,
    failures,
    ping: {
      samples: pingDurations.length,
      averageMs: Math.round(pingDurations.reduce((sum, value) => sum + value, 0) / pingDurations.length),
      p95Ms,
      maxMs: Math.max(...pingDurations),
    },
    unauthorizedGuardStatus: unauthorized.response.status,
    cronStatus,
  };
}

async function main() {
  const baseUrl = process.env.PROD_BASE_URL;
  if (!baseUrl) throw new Error('PROD_BASE_URL is required');

  const report = await runProductionHealthCheck({
    baseUrl,
    cronSecret: process.env.CRON_SECRET,
    samples: Number(process.env.HEALTH_SAMPLES || 3),
    maxP95Ms: Number(process.env.MAX_API_P95_MS || 1_500),
  });
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
