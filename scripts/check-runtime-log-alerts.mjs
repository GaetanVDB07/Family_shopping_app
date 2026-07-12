import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

function parseEvent(line) {
  try {
    const outer = JSON.parse(line);
    if (typeof outer.message !== 'string') return outer;
    try { return JSON.parse(outer.message); } catch { return outer; }
  } catch {
    return null;
  }
}

export function analyzeRuntimeHealth(lines, {
  maxP95Ms = 1_500,
  maxServerErrorRate = 0.05,
  maxUnauthorizedRate = 0.25,
  minimumRateSamples = 20,
} = {}) {
  const requests = lines
    .map((line) => parseEvent(line.trim()))
    .filter((event) => event?.message === 'api_request_completed')
    .filter((event) => typeof event.status === 'number' && typeof event.duration_ms === 'number');

  if (requests.length === 0) {
    return { ok: true, samples: 0, alerts: [], note: 'No completed API requests in the window.' };
  }

  const durations = requests.map((event) => event.duration_ms).sort((a, b) => a - b);
  const p95Ms = durations[Math.min(durations.length - 1, Math.ceil(durations.length * 0.95) - 1)];
  const serverErrors = requests.filter((event) => event.status >= 500).length;
  const unauthorized = requests.filter((event) => event.status === 401).length;
  const alerts = [];

  if (p95Ms > maxP95Ms) alerts.push(`API p95 ${p95Ms}ms exceeded ${maxP95Ms}ms`);
  if (requests.length >= minimumRateSamples && serverErrors / requests.length > maxServerErrorRate) {
    alerts.push(`5xx rate ${((serverErrors / requests.length) * 100).toFixed(1)}% exceeded ${(maxServerErrorRate * 100).toFixed(1)}%`);
  }
  if (requests.length >= minimumRateSamples && unauthorized / requests.length > maxUnauthorizedRate) {
    alerts.push(`401 rate ${((unauthorized / requests.length) * 100).toFixed(1)}% exceeded ${(maxUnauthorizedRate * 100).toFixed(1)}%`);
  }

  return {
    ok: alerts.length === 0,
    samples: requests.length,
    alerts,
    p95Ms,
    serverErrors,
    unauthorized,
  };
}

async function main() {
  const inputPath = process.argv[2];
  if (!inputPath) throw new Error('Pass a Vercel JSONL log file.');
  const report = analyzeRuntimeHealth((await readFile(inputPath, 'utf8')).split(/\r?\n/));
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
