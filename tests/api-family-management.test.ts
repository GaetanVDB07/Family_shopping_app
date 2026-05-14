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
  Client: vi.fn(() => ({
    connect: vi.fn(async () => undefined),
    query: vi.fn(async () => undefined),
  })),
}));

let fakeDb: ReturnType<typeof createFakeDb>;

vi.mock('drizzle-orm/node-postgres', () => ({
  drizzle: () => fakeDb,
}));

function conditionParams(condition: any): unknown[] {
  if (!condition || typeof condition !== 'object') {
    return [];
  }

  const params: unknown[] = [];
  const seen = new Set<object>();
  const visit = (value: any) => {
    if (!value || typeof value !== 'object' || seen.has(value)) {
      return;
    }
    seen.add(value);

    if (value.constructor?.name === 'Param') {
      params.push(value.value);
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

function selectRowsFor(condition: any) {
  const params = conditionParams(condition);
  const familyId = params.includes('family-2') ? 'family-2' : 'family-1';

  if (params.includes('member-2')) {
    return [{
      id: 'member-2',
      familyId,
      userId: 'user-2',
      userEmail: 'user2@test.dev',
      userName: 'User Two',
      role: 'member',
      joinedAt: new Date('2026-01-01T00:00:00.000Z'),
    }];
  }

  return [{
    family: {
      id: familyId,
      name: familyId === 'family-2' ? 'Family Two' : 'Family One',
      code: 'ABC123',
    },
    member: {
      id: 'admin-membership',
      familyId,
      userId: 'user-1',
      userEmail: 'user1@test.dev',
      userName: 'User One',
      role: 'admin',
      joinedAt: new Date('2026-01-01T00:00:00.000Z'),
    },
    familyId,
    userId: 'user-1',
    userEmail: 'user1@test.dev',
    userName: 'User One',
    role: 'admin',
  }];
}

function createSelectBuilder() {
  return {
    rows: [] as any[],
    from() {
      return this;
    },
    innerJoin() {
      return this;
    },
    where(condition: any) {
      this.rows = selectRowsFor(condition);
      return this;
    },
    limit() {
      return Promise.resolve(this.rows);
    },
    then(resolve: any, reject: any) {
      return Promise.resolve(this.rows).then(resolve, reject);
    },
  };
}

function createFakeDb() {
  return {
    deleteCalls: [] as unknown[][],
    select: vi.fn(() => createSelectBuilder()),
    delete: vi.fn(() => ({
      where: (condition: any) => {
        fakeDb.deleteCalls.push(conditionParams(condition));
        return Promise.resolve({ rowCount: 1 });
      },
    })),
  };
}

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

describe('family management scoping', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.DATABASE_URL = 'postgres://test';
    process.env.SUPABASE_URL = 'http://supabase.test';
    process.env.SUPABASE_ANON_KEY = 'anon-test-key';
    fakeDb = createFakeDb();
  });

  it('deletes the requested admin family', async () => {
    const res = await request('DELETE', '/api/family/details/family-2');

    expect(res.statusCode).toBe(200);
    expect(fakeDb.deleteCalls.at(-1)).toContain('family-2');
  });

  it('leaves only the requested family membership', async () => {
    const res = await request('POST', '/api/family/leave', {
      familyId: 'family-2',
    });

    expect(res.statusCode).toBe(200);
    expect(fakeDb.deleteCalls.at(-1)).toEqual(expect.arrayContaining(['user-1', 'family-2']));
  });

  it('removes a member only from the requested admin family', async () => {
    const res = await request('DELETE', '/api/family/members/member-2?familyId=family-2');

    expect(res.statusCode).toBe(200);
    expect(fakeDb.deleteCalls.at(-1)).toEqual(expect.arrayContaining(['member-2', 'family-2']));
  });
});
