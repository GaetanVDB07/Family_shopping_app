import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const pgQuery = vi.fn(async () => undefined);

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        limit: vi.fn(async () => ({ count: 0, data: null, error: null })),
      }),
    }),
  }),
}));

vi.mock('pg', () => ({
  Client: vi.fn(function Client() {
    return {
      connect: vi.fn(async () => undefined),
      query: pgQuery,
    };
  }),
}));

vi.mock('drizzle-orm/node-postgres', () => ({
  drizzle: () => ({}),
}));

async function requestKeepalive(options: {
  authorization?: string;
} = {}) {
  const { default: handler } = await import('../api/index.js');
  const req = {
    method: 'GET',
    url: '/api/cron/keepalive',
    headers: {
      host: 'localhost',
      ...(options.authorization !== undefined
        ? { authorization: options.authorization }
        : {}),
    },
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

describe('/api/cron/keepalive auth (#79)', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    pgQuery.mockClear();
    process.env = {
      ...originalEnv,
      DATABASE_URL: 'postgres://test',
      SUPABASE_URL: 'http://supabase.test',
      SUPABASE_ANON_KEY: 'anon-test-key',
    };
    delete process.env.CRON_SECRET;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns 503 in production when CRON_SECRET is not configured', async () => {
    process.env.NODE_ENV = 'production';

    const res = await requestKeepalive();

    expect(res.statusCode).toBe(503);
    expect(res.body).toMatchObject({ ok: false, message: 'Keepalive not configured' });
    expect(pgQuery).not.toHaveBeenCalled();
  });

  it('returns 401 in production when Authorization is missing or wrong', async () => {
    process.env.NODE_ENV = 'production';
    process.env.CRON_SECRET = 'cron-test-secret';

    const missing = await requestKeepalive();
    const wrong = await requestKeepalive({ authorization: 'Bearer wrong-secret' });

    expect(missing.statusCode).toBe(401);
    expect(missing.body).toMatchObject({ ok: false, message: 'Unauthorized' });
    expect(wrong.statusCode).toBe(401);
    expect(wrong.body).toMatchObject({ ok: false, message: 'Unauthorized' });
    expect(pgQuery).not.toHaveBeenCalled();
  });

  it('returns 200 in production with a valid Bearer token', async () => {
    process.env.NODE_ENV = 'production';
    process.env.CRON_SECRET = 'cron-test-secret';

    const res = await requestKeepalive({ authorization: 'Bearer cron-test-secret' });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ ok: true, message: 'keepalive ok' });
    expect(pgQuery).toHaveBeenCalledWith('select 1');
  });

  it('allows unauthenticated access in development when CRON_SECRET is unset', async () => {
    process.env.NODE_ENV = 'development';

    const res = await requestKeepalive();

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ ok: true, message: 'keepalive ok' });
    expect(pgQuery).toHaveBeenCalledWith('select 1');
  });

  it('requires Bearer auth in development when CRON_SECRET is set', async () => {
    process.env.NODE_ENV = 'development';
    process.env.CRON_SECRET = 'cron-test-secret';

    const unauthorized = await requestKeepalive();
    const authorized = await requestKeepalive({ authorization: 'Bearer cron-test-secret' });

    expect(unauthorized.statusCode).toBe(401);
    expect(authorized.statusCode).toBe(200);
    expect(authorized.body).toMatchObject({ ok: true, message: 'keepalive ok' });
  });
});
