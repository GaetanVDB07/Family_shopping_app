import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: {
      getClaims: vi.fn(async () => ({
        data: {
          claims: { sub: 'user-1', email: 'user1@test.dev' },
          header: { alg: 'RS256' },
        },
        error: null,
      })),
    },
  }),
}));

vi.mock('pg', () => ({
  Pool: vi.fn(function Pool() {
    return { on: vi.fn(), query: vi.fn() };
  }),
}));

const dbState = vi.hoisted(() => ({ hasFamily: false }));

function rowsFor(selectedFields?: Record<string, unknown>) {
  if (!dbState.hasFamily || !selectedFields) {
    return [];
  }
  if ('familyName' in selectedFields) {
    return [{
      familyId: 'family-1',
      familyName: 'Test Family',
      familyCode: '123456',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      createdBy: 'user-1',
      role: 'admin',
      joinedAt: new Date('2026-01-01T00:00:00.000Z'),
    }];
  }
  if ('memberCount' in selectedFields) {
    return [{ familyId: 'family-1', memberCount: 1 }];
  }
  if ('addedByUserId' in selectedFields) {
    return [{
      id: 1,
      name: 'Melk',
      quantity: null,
      unit: null,
      notes: null,
      completed: false,
      addedByUserId: 'user-1',
      addedByName: 'User One',
      familyId: 'family-1',
      addedAt: new Date('2026-01-02T00:00:00.000Z'),
      sortOrder: 0,
      completedAt: null,
      archivedAt: null,
      createdAt: new Date('2026-01-02T00:00:00.000Z'),
    }];
  }
  if ('userName' in selectedFields) {
    return [{ userId: 'user-1', userName: 'User One', userEmail: 'user1@test.dev' }];
  }
  return [];
}

function selectBuilder(selectedFields?: Record<string, unknown>) {
  const rows = rowsFor(selectedFields);
  return {
    from() { return this; },
    innerJoin() { return this; },
    where() { return this; },
    orderBy() { return this; },
    groupBy() { return this; },
    limit: vi.fn(async () => rows),
    then(resolve: (value: unknown[]) => unknown, reject: (reason?: unknown) => unknown) {
      return Promise.resolve(rows).then(resolve, reject);
    },
  };
}

vi.mock('drizzle-orm/node-postgres', () => ({
  drizzle: () => ({ select: vi.fn((fields?: Record<string, unknown>) => selectBuilder(fields)) }),
}));

async function requestBootstrap() {
  const { default: handler } = await import('../api/index.js');
  const req = {
    method: 'GET',
    url: '/api/bootstrap',
    headers: { authorization: 'Bearer test-token', host: 'localhost' },
  };
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    headers: {} as Record<string, string>,
    setHeader(name: string, value: string) { this.headers[name] = value; return this; },
    status(code: number) { this.statusCode = code; return this; },
    json(data: unknown) { this.body = data; return this; },
    end() { return this; },
  };

  await handler(req, res);
  return res;
}

describe('authenticated app bootstrap', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.DATABASE_URL = 'postgres://test';
    process.env.SUPABASE_URL = 'http://supabase.test';
    process.env.SUPABASE_ANON_KEY = 'anon-test-key';
    dbState.hasFamily = false;
  });

  it('returns a complete empty bootstrap payload for users without a family', async () => {
    const res = await requestBootstrap();

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      families: [],
      primaryFamilyId: null,
      groceryItems: [],
    });
    expect(res.headers['Server-Timing']).toContain('auth;dur=');
    expect(res.headers['Server-Timing']).toContain('total;dur=');
    expect(res.headers['X-API-Timing']).toBe(res.headers['Server-Timing']);
    expect(res.headers['X-Request-Id']).toMatch(/^local-/);
  });

  it('returns family membership and its grocery list in the same response', async () => {
    dbState.hasFamily = true;

    const res = await requestBootstrap();

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      primaryFamilyId: 'family-1',
      families: [{ familyId: 'family-1', familyName: 'Test Family', memberCount: 1 }],
      groceryItems: [{ id: 1, familyId: 'family-1', name: 'Melk', addedBy: 'User One' }],
    });
    expect(res.headers['Server-Timing']).toContain('primary_grocery_items_query;dur=');
    expect(res.headers['X-API-Timing']).toContain('primary_grocery_items_query;dur=');
  });
});
