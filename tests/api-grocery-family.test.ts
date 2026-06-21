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
      query: vi.fn(async (sql: string, params?: unknown[]) => {
        if (pgQueryHandler) {
          return pgQueryHandler(sql, params);
        }
        return undefined;
      }),
    };
  }),
}));

let fakeDb: ReturnType<typeof createFakeDb>;
let pgQueryHandler: ((sql: string, params?: unknown[]) => Promise<unknown>) | undefined;
let fakeDbConfig: {
  memberFamilyIds: string[];
  groceryItems: Record<string, Array<Record<string, unknown>>>;
  deleteReturning?: Array<Record<string, unknown>>;
  existingItemCompleted?: boolean;
};

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

function selectRowsFor(condition: any, selectedFields?: Record<string, unknown>) {
  const params = conditionParams(condition);
  const familyId = params.includes('family-2') ? 'family-2' : 'family-1';

  if (selectedFields && 'count' in selectedFields) {
    return [{ count: fakeDbConfig.memberFamilyIds.length }];
  }

  if (selectedFields && 'addedByUserId' in selectedFields) {
    return (fakeDbConfig.groceryItems[familyId] ?? []).map((item) => ({
      ...item,
      addedByUserId: item.addedByUserId ?? 'user-1',
      sortOrder: item.sortOrder ?? 0,
    }));
  }

  if (selectedFields && 'maxSortOrder' in selectedFields) {
    const items = fakeDbConfig.groceryItems[familyId] ?? [];
    const maxValue = items.reduce(
      (currentMax, item) => Math.max(currentMax, Number(item.sortOrder ?? 0)),
      -1,
    );
    return [{ maxSortOrder: maxValue < 0 ? null : maxValue }];
  }

  if (selectedFields && 'id' in selectedFields && !('addedByUserId' in selectedFields) && !('completed' in selectedFields)) {
    const items = fakeDbConfig.groceryItems[familyId] ?? [];
    const pendingOnly = params.includes(false);
    return items
      .filter((item) => !pendingOnly || item.completed === false)
      .map((item) => ({ id: item.id }));
  }

  if (selectedFields && 'id' in selectedFields && 'completed' in selectedFields && !('addedByUserId' in selectedFields)) {
    const itemId = params.find((param) => typeof param === 'number');
    const scopedFamilyId = params.includes('family-2') ? 'family-2' : 'family-1';
    const items = fakeDbConfig.groceryItems[scopedFamilyId] ?? [];
    const item = items.find((entry) => entry.id === itemId);
    if (item) {
      return [{ id: item.id, completed: item.completed ?? false }];
    }
    if (itemId === 10) {
      return [{ id: 10, completed: fakeDbConfig.existingItemCompleted ?? false }];
    }
    return [];
  }

  if (selectedFields && 'completed' in selectedFields && !('addedByUserId' in selectedFields)) {
    return [{ completed: fakeDbConfig.existingItemCompleted ?? true }];
  }

  if (selectedFields && 'userName' in selectedFields && 'userId' in selectedFields) {
    return [{ userId: 'user-1', userName: 'User One' }];
  }

  if (params.includes(10)) {
    return [{
      id: 10,
      name: 'Milk',
      completed: true,
      addedBy: 'User One',
      familyId,
      addedAt: new Date('2026-01-01T00:00:00.000Z'),
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    }];
  }

  if (!fakeDbConfig.memberFamilyIds.includes(familyId)) {
    return [];
  }

  return [{
    familyId,
    userId: 'user-1',
    userEmail: 'user1@test.dev',
    userName: 'User One',
    role: 'member',
  }];
}

function createSelectBuilder(selectedFields?: Record<string, unknown>) {
  return {
    rows: [] as any[],
    from() {
      return this;
    },
    leftJoin() {
      return this;
    },
    innerJoin() {
      return this;
    },
    where(condition: any) {
      this.rows = selectRowsFor(condition, selectedFields);
      return this;
    },
    orderBy() {
      if (this.rows.some((row) => "sortOrder" in row)) {
        this.rows = [...this.rows].sort(
          (left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0),
        );
      }
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
    lastUpdates: null as any,
    updateWhereParams: [] as unknown[],
    deleteWhereParams: [] as unknown[],
    select: vi.fn((fields?: Record<string, unknown>) => createSelectBuilder(fields)),
    insert: vi.fn(() => ({
      values: (values: any) => {
        fakeDb.insertedValues = values;
        return {
          returning: vi.fn(async () => [{
            id: 10,
            completed: false,
            addedAt: new Date('2026-01-01T00:00:00.000Z'),
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            ...values,
          }]),
        };
      },
    })),
    update: vi.fn(() => ({
      set: (updates: any) => {
        fakeDb.lastUpdates = updates;
        return {
        where: (condition: any) => {
          fakeDb.updateWhereParams = conditionParams(condition);
          const itemId = fakeDb.updateWhereParams.find((param) => typeof param === 'number');
          const familyId = fakeDb.updateWhereParams.includes('family-2') ? 'family-2' : 'family-1';
          if (itemId !== undefined && updates.sortOrder !== undefined) {
            const items = fakeDbConfig.groceryItems[familyId] ?? [];
            const target = items.find((item) => item.id === itemId);
            if (target) {
              target.sortOrder = updates.sortOrder;
            }
          }
          return {
            returning: vi.fn(async () => [{
              id: 10,
              name: updates.name ?? 'Milk',
              quantity: updates.quantity ?? null,
              unit: updates.unit ?? null,
              notes: updates.notes ?? null,
              completed: updates.completed ?? false,
              addedBy: updates.addedBy ?? 'user-1',
              familyId: fakeDb.updateWhereParams.includes('family-2') ? 'family-2' : 'family-1',
              addedAt: updates.addedAt ?? new Date('2026-01-01T00:00:00.000Z'),
              createdAt: new Date('2026-01-01T00:00:00.000Z'),
            }]),
          };
        },
      };
      },
    })),
    delete: vi.fn(() => ({
      where: (condition: any) => {
        fakeDb.deleteWhereParams = conditionParams(condition);
        return {
          returning: vi.fn(async () => fakeDbConfig.deleteReturning ?? [{ id: 10 }]),
        };
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
    fakeDbConfig = {
      memberFamilyIds: ['family-1', 'family-2'],
      deleteReturning: undefined,
      groceryItems: {
        'family-1': [{
          id: 1,
          name: 'Brood',
          quantity: null,
          unit: null,
          notes: null,
          completed: false,
          addedByUserId: 'user-1',
          familyId: 'family-1',
          addedAt: new Date('2026-01-01T00:00:00.000Z'),
          sortOrder: 0,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
        }, {
          id: 3,
          name: 'Kaas',
          quantity: null,
          unit: null,
          notes: null,
          completed: false,
          addedByUserId: 'user-1',
          familyId: 'family-1',
          addedAt: new Date('2026-01-03T00:00:00.000Z'),
          sortOrder: 1,
          createdAt: new Date('2026-01-03T00:00:00.000Z'),
        }],
        'family-2': [{
          id: 2,
          name: 'Melk',
          quantity: '2',
          unit: 'L',
          notes: null,
          completed: false,
          addedByUserId: 'user-1',
          familyId: 'family-2',
          addedAt: new Date('2026-01-02T00:00:00.000Z'),
          sortOrder: 0,
          createdAt: new Date('2026-01-02T00:00:00.000Z'),
        }],
      },
      existingItemCompleted: true,
    };
    fakeDb = createFakeDb();
    pgQueryHandler = async (sql, params) => {
      if (sql.includes('unnest') && sql.includes('sort_order')) {
        const [orderedIds, sortOrders, familyId] = params as [number[], number[], string];
        const items = fakeDbConfig.groceryItems[familyId] ?? [];
        orderedIds.forEach((id, index) => {
          const target = items.find((item) => item.id === id);
          if (target) {
            target.sortOrder = sortOrders[index];
          }
        });
      }
      return undefined;
    };
  });

  it('returns grocery items for a family the user belongs to', async () => {
    const res = await request('GET', '/api/grocery-items/family-2');

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([{
      id: 2,
      name: 'Melk',
      quantity: '2',
      unit: 'L',
      notes: null,
      completed: false,
      addedBy: 'User One',
      familyId: 'family-2',
      addedAt: new Date('2026-01-02T00:00:00.000Z'),
      sortOrder: 0,
      createdAt: new Date('2026-01-02T00:00:00.000Z'),
    }]);
  });

  it('updates addedAt and addedBy when a completed item is put back on the list', async () => {
    fakeDbConfig.existingItemCompleted = true;

    const res = await request('PATCH', '/api/grocery-items/10', {
      completed: false,
      familyId: 'family-2',
    });

    expect(res.statusCode).toBe(200);
    expect(fakeDb.lastUpdates).toMatchObject({
      completed: false,
      addedBy: 'user-1',
    });
    expect(fakeDb.lastUpdates.addedAt).toBeInstanceOf(Date);
    expect(res.body.addedBy).toBe('User One');
    expect(res.body.addedAt).toBeInstanceOf(Date);
  });

  it('does not refresh addedAt when updating notes on an already pending item', async () => {
    fakeDbConfig.existingItemCompleted = false;

    const res = await request('PATCH', '/api/grocery-items/10', {
      notes: 'Vers',
      familyId: 'family-2',
    });

    expect(res.statusCode).toBe(200);
    expect(fakeDb.lastUpdates).toEqual({ notes: 'Vers' });
  });

  it('rejects grocery list requests for families the user does not belong to', async () => {
    fakeDbConfig.memberFamilyIds = ['family-1'];

    const res = await request('GET', '/api/grocery-items/family-2');

    expect(res.statusCode).toBe(403);
    expect(res.body).toMatchObject({ message: 'Access denied: Not a member of this family' });
  });

  it('rejects grocery queries scoped to a non-member familyId', async () => {
    fakeDbConfig.memberFamilyIds = ['family-1'];

    const res = await request('GET', '/api/grocery-items?familyId=family-2');

    expect(res.statusCode).toBe(403);
    expect(res.body).toMatchObject({ message: 'Access denied: Not a member of this family' });
  });

  it('creates items in the requested family instead of the first membership', async () => {
    const res = await request('POST', '/api/grocery-items', {
      name: 'Milk',
      familyId: 'family-2',
    });

    expect(res.statusCode).toBe(201);
    expect(fakeDb.insertedValues.familyId).toBe('family-2');
    expect(fakeDb.insertedValues.sortOrder).toBe(1);
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

  it('updates item names without changing completion state', async () => {
    const res = await request('PATCH', '/api/grocery-items/10', {
      name: '  Havermelk  ',
      familyId: 'family-2',
    });

    expect(res.statusCode).toBe(200);
    expect(fakeDb.lastUpdates).toEqual({ name: 'Havermelk' });
    expect(res.body.name).toBe('Havermelk');
  });

  it('updates notes without changing completion state', async () => {
    const res = await request('PATCH', '/api/grocery-items/10', {
      notes: 'Geen lactose',
      familyId: 'family-2',
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.notes).toBe('Geen lactose');
  });

  it('returns the current member display name when updating an item', async () => {
    const res = await request('PATCH', '/api/grocery-items/10', {
      completed: true,
      familyId: 'family-2',
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.addedBy).toBe('User One');
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
    fakeDbConfig.existingItemCompleted = false;

    const res = await request('DELETE', '/api/grocery-items/10?familyId=family-2');

    expect(res.statusCode).toBe(200);
    expect(fakeDb.deleteWhereParams).toContain('family-2');
  });

  it('archives completed items instead of deleting them', async () => {
    fakeDbConfig.existingItemCompleted = true;

    const res = await request('DELETE', '/api/grocery-items/10?familyId=family-2');

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ archived: true });
    expect(fakeDb.lastUpdates).toMatchObject({ archivedAt: expect.any(Date) });
  });

  it('returns 404 when deleting a missing grocery item', async () => {
    fakeDbConfig.deleteReturning = [];
    fakeDbConfig.existingItemCompleted = false;

    const res = await request('DELETE', '/api/grocery-items/999?familyId=family-1');

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ message: 'Item not found' });
  });

  it('reorders pending grocery items for a family', async () => {
    const res = await request('PATCH', '/api/grocery-items/reorder', {
      familyId: 'family-1',
      orderedIds: [3, 1],
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.items).toEqual([
      {
        id: 3,
        name: 'Kaas',
        quantity: null,
        unit: null,
        notes: null,
        completed: false,
        addedBy: 'User One',
        familyId: 'family-1',
        addedAt: new Date('2026-01-03T00:00:00.000Z'),
        sortOrder: 0,
        createdAt: new Date('2026-01-03T00:00:00.000Z'),
      },
      {
        id: 1,
        name: 'Brood',
        quantity: null,
        unit: null,
        notes: null,
        completed: false,
        addedBy: 'User One',
        familyId: 'family-1',
        addedAt: new Date('2026-01-01T00:00:00.000Z'),
        sortOrder: 1,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    ]);
  });

  it('persists reorder with a single batch SQL update', async () => {
    const { Client } = await import('pg');
    const clientInstance = vi.mocked(Client).mock.results.at(-1)?.value as {
      query: ReturnType<typeof vi.fn>;
    };

    await request('PATCH', '/api/grocery-items/reorder', {
      familyId: 'family-1',
      orderedIds: [3, 1],
    });

    expect(clientInstance.query).toHaveBeenCalledTimes(1);
    expect(String(clientInstance.query.mock.calls[0][0])).toContain('unnest');
    expect(fakeDb.update).not.toHaveBeenCalled();
  });

  it('rejects reorder requests that omit pending items', async () => {
    const res = await request('PATCH', '/api/grocery-items/reorder', {
      familyId: 'family-1',
      orderedIds: [1],
    });

    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({ message: 'Alle openstaande items moeten worden meegestuurd' });
  });
});
