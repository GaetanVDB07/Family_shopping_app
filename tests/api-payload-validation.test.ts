import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn(async () => ({
        data: {
          user: {
            id: 'user-1',
            email: 'user1@test.dev',
            user_metadata: { name: 'User One' },
          },
        },
        error: null,
      })),
    },
  }),
}));

vi.mock('pg', () => ({
  Client: vi.fn(function Client() {
    return {
      connect: vi.fn(async () => undefined),
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
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(async () => [{ id: 'family-new' }]),
      })),
    })),
    transaction: vi.fn(async (callback) => callback({
      insert: vi.fn(() => ({
        values: vi.fn(() => ({
          returning: vi.fn(async () => [{
            id: 'family-new',
            name: 'Valid Family',
            code: '123456',
            createdBy: 'user-1',
          }]),
        })),
      })),
    })),
  }),
}));

async function request(method: string, url: string, body?: unknown) {
  const { default: handler } = await import('../api/index.js');
  const req = {
    method,
    url,
    headers: {
      authorization: 'Bearer test-token',
      host: 'localhost',
    },
    body,
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

describe('API payload validation (#84)', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.NODE_ENV = 'development';
    process.env.DATABASE_URL = 'postgres://test';
    process.env.SUPABASE_URL = 'http://supabase.test';
    process.env.SUPABASE_ANON_KEY = 'anon-test-key';
  });

  it('rejects whitespace-only family names on create', async () => {
    const res = await request('POST', '/api/families', { name: '   ' });

    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({ message: 'Family name is required' });
  });

  it('rejects whitespace-only grocery item names on create', async () => {
    const res = await request('POST', '/api/grocery-items', {
      name: '   ',
      familyId: 'family-1',
    });

    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({ message: 'Item name is required' });
  });

  it('rejects grocery updates with no mutable fields', async () => {
    const res = await request('PATCH', '/api/grocery-items/10', {
      familyId: 'family-1',
    });

    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({ message: 'No valid fields to update' });
  });
});
