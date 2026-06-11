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
    if (!value || typeof value !== 'object') {
      return;
    }
    if (seen.has(value)) {
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

  if (params.includes(10)) {
    return [{
      id: 10,
      name: 'Milk',
      completed: true,
      addedBy: 'User One',
      familyId,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    }];
  }

  return [{
    familyId,
    userId: 'user-1',
    userEmail: 'user1@test.dev',
    userName: 'User One',
    role: 'member',
  }];
}

function createSelectBuilder() {
  return {
    rows: [] as any[],
    from() {
      return this;
    },
    leftJoin() {
      return this;
    },
    where(condition: any) {
      this.rows = selectRowsFor(condition);
      return this;
    },
    orderBy() {
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
    insertedValues: null as any,
    updateWhereParams: [] as unknown[],
    deleteWhereParams: [] as unknown[],
    select: vi.fn(() => createSelectBuilder()),
    insert: vi.fn(() => ({
      values: (values: any) => {
        fakeDb.insertedValues = values;
        return {
          returning: vi.fn(async () => [{
            id: 10,
            completed: false,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            ...values,
          }]),
        };
      },
    })),
    update: vi.fn(() => ({
      set: (updates: any) => ({
        where: (condition: any) => {
          fakeDb.updateWhereParams = conditionParams(condition);
          return {
            returning: vi.fn(async () => [{
              id: 10,
              name: 'Milk',
              quantity: updates.quantity ?? null,
              unit: updates.unit ?? null,
              notes: updates.notes ?? null,
              completed: updates.completed ?? false,
              addedBy: 'user-1',
              familyId: fakeDb.updateWhereParams.includes('family-2') ? 'family-2' : 'family-1',
              createdAt: new Date('2026-01-01T00:00:00.000Z'),
            }]),
          };
        },
      }),
    })),
    delete: vi.fn(() => ({
      where: (condition: any) => {
        fakeDb.deleteWhereParams = conditionParams(condition);
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

describe('grocery item family scoping', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.DATABASE_URL = 'postgres://test';
    process.env.SUPABASE_URL = 'http://supabase.test';
    process.env.SUPABASE_ANON_KEY = 'anon-test-key';
    fakeDb = createFakeDb();
  });

  it('creates items in the requested family instead of the first membership', async () => {
    const res = await request('POST', '/api/grocery-items', {
      name: 'Milk',
      familyId: 'family-2',
    });

    expect(res.statusCode).toBe(201);
    expect(fakeDb.insertedValues.familyId).toBe('family-2');
  });

  it('stores optional notes when creating an item', async () => {
    const res = await request('POST', '/api/grocery-items', {
      name: 'Melk',
      notes: '  Halfvolle melk  ',
      familyId: 'family-2',
    });

    expect(res.statusCode).toBe(201);
    expect(fakeDb.insertedValues.notes).toBe('Halfvolle melk');
  });

  it('stores optional quantity and unit when creating an item', async () => {
    const res = await request('POST', '/api/grocery-items', {
      name: 'Melk',
      quantity: ' 2 ',
      unit: ' L ',
      familyId: 'family-2',
    });

    expect(res.statusCode).toBe(201);
    expect(fakeDb.insertedValues.quantity).toBe('2');
    expect(fakeDb.insertedValues.unit).toBe('L');
  });

  it('updates quantity and unit without changing completion state', async () => {
    const res = await request('PATCH', '/api/grocery-items/10', {
      quantity: '6',
      unit: 'stuks',
      familyId: 'family-2',
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.quantity).toBe('6');
    expect(res.body.unit).toBe('stuks');
  });

  it('updates notes without changing completion state', async () => {
    const res = await request('PATCH', '/api/grocery-items/10', {
      notes: 'Geen lactose',
      familyId: 'family-2',
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.notes).toBe('Geen lactose');
  });

  it('updates items using the requested family scope', async () => {
    const res = await request('PATCH', '/api/grocery-items/10', {
      completed: true,
      familyId: 'family-2',
    });

    expect(res.statusCode).toBe(200);
    expect(fakeDb.updateWhereParams).toContain('family-2');
  });

  it('deletes items using the requested family scope', async () => {
    const res = await request('DELETE', '/api/grocery-items/10?familyId=family-2');

    expect(res.statusCode).toBe(200);
    expect(fakeDb.deleteWhereParams).toContain('family-2');
  });
});
