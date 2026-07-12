import { describe, expect, it } from 'vitest';
import { analyzeApiTimingLines } from '../scripts/analyze-api-timings.mjs';

describe('API timing analyzer', () => {
  it('ranks route stages by p95 and accepts wrapped Vercel messages', () => {
    const lines = [
      JSON.stringify({ message: JSON.stringify({ message: 'api_stage_completed', route: '/api/bootstrap', stage: 'auth', duration_ms: 20 }) }),
      JSON.stringify({ message: 'api_stage_completed', route: '/api/bootstrap', stage: 'families_query', duration_ms: 80 }),
      JSON.stringify({ message: 'api_stage_completed', route: '/api/bootstrap', stage: 'families_query', duration_ms: 120 }),
      'not-json',
    ];

    expect(analyzeApiTimingLines(lines)).toEqual([
      { stage: '/api/bootstrap :: families_query', samples: 2, averageMs: 100, p95Ms: 120, maxMs: 120 },
      { stage: '/api/bootstrap :: auth', samples: 1, averageMs: 20, p95Ms: 20, maxMs: 20 },
    ]);
  });
});
