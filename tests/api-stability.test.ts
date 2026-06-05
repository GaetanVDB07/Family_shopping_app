import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resetJoinRateLimitState } from '../shared/join-security.js';

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
  Client: vi.fn(() => ({
    connect: vi.fn(async () => undefined),
    query: vi.fn(async () => undefined),
  })),
}));

type FakeDbConfig = {
  membershipCount?: number;
  membershipFamilyId?: string | null;
  groceryItems?: Array<Record<string, unknown>>;
};

let fakeDbConfig: FakeDbConfig;
let fakeDb: ReturnType<typeof createFakeDb>;

function conditionParams(condition: unknown): unknown[] {
  if (!condition || typeof condition !== 'object') {
    return [];
  }

  const params: unknown[] = [];
  const seen = new Set<object>();
  const visit = (value: unknown) => {
    if (!value || typeof value !== 'object') {
      return;
    }
    if (seen.has(value)) {
      return;
    }
    seen.add(value);

    const record = value as { constructor?: { name?: string }; value?: unknown };
    if (record.constructor?.name === 'Param') {
      params.push(record.value);
      return;
    }

    for (const entry of Object.values(value)) {
      if (Array.isArray(entry)) {
        entry.forEach(visit);
      } else {
        visit(entry);
      }
    }
  };

  visit(condition);
  return params;
}

function createSelectBuilder(selectedFields?: Record<string, unknown>) {
  return {
    rows: [] as unknown[],
    from() {
      return this;
    },
    innerJoin() {
      return this;
    },
    leftJoin() {
      return this;
    },
    where(condition: unknown) {
      const params = conditionParams(condition);

      if (selectedFields && 'count' in selectedFields) {
        this.rows = [{ count: fakeDbConfig.membershipCount ?? 1 }];
        return this;
      }

      if (params.includes('family-2') && fakeDbConfig.membershipFamilyId === null) {
        this.rows = [];
        return this;
      }

      if (params.includes('family-2')) {
        this.rows = [{
          familyId: 'family-2',
          userId: 'user-1',
          userEmail: 'user1@test.dev',
          userName: 'User One',
          role: 'member',
        }];
        return this;
      }

      if (params.includes(10)) {
        this.rows = [{
          id: 10,
          name: 'Milk',
          familyId: 'family-1',
          completed: false,
          addedBy: 'user-1',
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
        }];
        return this;
      }

      this.rows = [{
        familyId: fakeDbConfig.membershipFamilyId ?? 'family-1',
        userId: 'user-1',
        userEmail: 'user1@test.dev',
        userName: 'User One',
        role: 'member',
      }];
      return this;
    },
    orderBy() {
      return this;
    },
    limit() {
      return Promise.resolve(this.rows);
    },
    then(resolve: (value: unknown) => unknown, reject: (reason?: unknown) => unknown) {
      return Promise.resolve(this.rows).then(resolve, reject);
    },
  };
}

function createFakeDb() {
  return {
    deletedItemIds: [] as number[],
    select: vi.fn((fields?: Record<string, unknown>) => createSelectBuilder(fields)),
    insert: vi.fn(() => ({
      values: () => ({
        returning: vi.fn(async () => [{ id: 1 }]),
      }),
    })),
    update: vi.fn(() => ({
      set: () => ({
        where: () => ({
          returning: vi.fn(async () => []),
        }),
      }),
    })),
    delete: vi.fn(() => ({
      where: (condition: unknown) => {
        const params = conditionParams(condition);
        const itemId = params.find((value) => typeof value === 'number');
        if (typeof itemId === 'number') {
          fakeDb.deletedItemIds.push(itemId);
        }
        return Promise.resolve({ rowCount: 1 });
      },
    })),
  };
}

vi.mock('drizzle-orm/node-postgres', () => ({
  drizzle: () => fakeDb,
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

describe('API stability hardening', () => {
  beforeEach(() => {
    vi.resetModules();
    resetJoinRateLimitState();
    process.env.NODE_ENV = 'development';
    process.env.DATABASE_URL = 'postgres://test';
    process.env.SUPABASE_URL = 'http://supabase.test';
    process.env.SUPABASE_ANON_KEY = 'anon-test-key';
    fakeDbConfig = {
      membershipCount: 1,
      membershipFamilyId: 'family-1',
      groceryItems: [
        { id: 1, name: 'Melk', familyId: 'family-1' },
        { id: 2, name: 'melk', familyId: 'family-1' },
        { id: 3, name: 'Brood', familyId: 'family-2' },
      ],
    };
    fakeDb = createFakeDb();
  });

  it('rejects cleanup-duplicates without familyId (#72)', async () => {
    const res = await request('POST', '/api/cleanup-duplicates', {});

    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({ message: 'familyId is required' });
  });

  it('rejects cleanup-duplicates for families the user does not belong to (#72)', async () => {
    fakeDbConfig.membershipFamilyId = null;

    const res = await request('POST', '/api/cleanup-duplicates', { familyId: 'family-2' });

    expect(res.statusCode).toBe(403);
    expect(res.body).toMatchObject({ message: 'Access denied: Not a member of this family' });
  });

  it('requires familyId when creating grocery items for multi-family users (#74)', async () => {
    fakeDbConfig.membershipCount = 2;

    const res = await request('POST', '/api/grocery-items', { name: 'Melk' });

    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({
      message: 'familyId is required when you belong to multiple families',
    });
  });

  it('rejects invalid join code format (#75)', async () => {
    const res = await request('POST', '/api/families/join', { code: 'ABC123' });

    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({ message: 'Invalid family code format' });
  });

  it('hides cleanup-duplicates in production (#72)', async () => {
    process.env.NODE_ENV = 'production';

    const res = await request('POST', '/api/cleanup-duplicates', { familyId: 'family-1' });

    expect(res.statusCode).toBe(404);
  });

  it('rate limits repeated join attempts (#75)', async () => {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const res = await request('POST', '/api/families/join', { code: '123456' });
      expect(res.statusCode).not.toBe(429);
    }

    const blocked = await request('POST', '/api/families/join', { code: '123456' });
    expect(blocked.statusCode).toBe(429);
    expect(blocked.body).toMatchObject({
      message: 'Too many join attempts. Please try again later.',
    });
  });
});
