import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

function parseLogPayload(line) {
  try {
    const outer = JSON.parse(line);
    if (typeof outer.message !== 'string') {
      return outer;
    }

    try {
      return JSON.parse(outer.message);
    } catch {
      return outer;
    }
  } catch {
    return null;
  }
}

export function analyzeApiTimingLines(lines) {
  const stages = new Map();

  for (const line of lines) {
    const event = parseLogPayload(line.trim());
    if (event?.message !== 'api_stage_completed' || typeof event.duration_ms !== 'number') {
      continue;
    }

    const key = `${event.route ?? 'unknown'} :: ${event.stage ?? 'unknown'}`;
    const durations = stages.get(key) ?? [];
    durations.push(event.duration_ms);
    stages.set(key, durations);
  }

  return [...stages.entries()]
    .map(([stage, durations]) => {
      const sorted = [...durations].sort((a, b) => a - b);
      const p95Index = Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1);
      return {
        stage,
        samples: sorted.length,
        averageMs: Math.round(sorted.reduce((sum, value) => sum + value, 0) / sorted.length),
        p95Ms: sorted[p95Index],
        maxMs: sorted[sorted.length - 1],
      };
    })
    .sort((a, b) => b.p95Ms - a.p95Ms || b.averageMs - a.averageMs);
}

async function readInput() {
  const inputPath = process.argv[2];
  if (inputPath) {
    return readFile(inputPath, 'utf8');
  }

  if (process.stdin.isTTY) {
    throw new Error('Pass a Vercel JSONL log file or pipe `vercel logs --json` into this command.');
  }

  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

async function main() {
  const input = await readInput();
  const report = analyzeApiTimingLines(input.split(/\r?\n/));

  if (report.length === 0) {
    console.log('No api_stage_completed timing events found.');
    return;
  }

  console.table(report);
  console.log(`Slowest p95 stage: ${report[0].stage} (${report[0].p95Ms}ms across ${report[0].samples} samples)`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
