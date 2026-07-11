import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: {
      getClaims: vi.fn(async () => ({
        data: null,
        error: { message: 'Invalid token' },
      })),
    },
  }),
}));

vi.mock('pg', () => ({
  Pool: vi.fn(function Pool() {
    return {
      on: vi.fn(),
      query: vi.fn(async () => undefined),
    };
  }),
}));

vi.mock('drizzle-orm/node-postgres', () => ({
  drizzle: () => ({
    select: vi.fn(() => ({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn(async () => []),
    })),
  }),
}));

async function callHandler(method: string, url: string, headers: Record<string, string> = {}) {
  const { default: handler } = await import('../api/index.js');
  const req = {
    method,
    url,
    headers: {
      host: 'localhost',
      ...headers,
    },
    body: undefined,
  };
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    headers: {} as Record<string, string>,
    setHeader(name: string, value: string) {
      this.headers[name] = value;
      return this;
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: unknown) {
      this.body = data;
      return this;
    },
    end() {
      return this;
    },
  };

  await handler(req, res);
  return res;
}

describe('api/index.js integration', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.DATABASE_URL = 'postgres://test';
    process.env.SUPABASE_URL = 'http://supabase.test';
    process.env.SUPABASE_ANON_KEY = 'anon-test-key';
  });

  it('responds on /api/ping without authentication', async () => {
    const res = await callHandler('GET', '/api/ping');

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('returns 404 for unknown API routes', async () => {
    const res = await callHandler('GET', '/api/does-not-exist');

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ message: 'API route not found' });
  });

  it('does not expose a public /api/test fingerprint route', async () => {
    const res = await callHandler('GET', '/api/test');

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ message: 'API route not found' });
  });

  it('requires authentication on protected routes', async () => {
    const res = await callHandler('GET', '/api/user/family');

    expect(res.statusCode).toBe(401);
    expect(res.body).toMatchObject({ message: 'No authorization token provided' });
  });

  it('rejects invalid bearer tokens', async () => {
    const res = await callHandler('GET', '/api/user/family', {
      authorization: 'Bearer invalid-token',
    });

    expect(res.statusCode).toBe(401);
    expect(res.body).toMatchObject({ message: 'Invalid or expired token' });
  });

  it('handles CORS preflight requests', async () => {
    const res = await callHandler('OPTIONS', '/api/grocery-items', {
      origin: 'http://localhost:5000',
    });

    expect(res.statusCode).toBe(200);
  });
});

describe('expressMiddleware adapter', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.DATABASE_URL = 'postgres://test';
    process.env.SUPABASE_URL = 'http://supabase.test';
    process.env.SUPABASE_ANON_KEY = 'anon-test-key';
  });

  it('routes /api/ping through Express', async () => {
    const { expressMiddleware } = await import('../api/index.js');
    const app = express();
    app.use('/api', expressMiddleware);

    const res = await request(app).get('/api/ping');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});
