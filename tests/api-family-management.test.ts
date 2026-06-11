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
      admin: {
        deleteUser: vi.fn(async () => ({ error: null })),
      },
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

type TestScenario = {
  membershipRole: 'admin' | 'member';
  counts: {
    otherAdmins: number;
    otherMembers: number;
    familyAdmins: number;
  };
  targetMember: {
    id: string;
    role: 'admin' | 'member';
    userId: string;
  };
  accountMemberships: Array<{
    familyId: string;
    role: 'admin' | 'member';
    otherAdmins: number;
    otherMembers: number;
  }>;
};

let testScenario: TestScenario;

function defaultScenario(): TestScenario {
  return {
    membershipRole: 'admin',
    counts: {
      otherAdmins: 0,
      otherMembers: 0,
      familyAdmins: 1,
    },
    targetMember: {
      id: 'member-2',
      role: 'member',
      userId: 'user-2',
    },
    accountMemberships: [{
      familyId: 'family-1',
      role: 'admin',
      otherAdmins: 0,
      otherMembers: 0,
    }],
  };
}

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

function familyIdFromParams(params: unknown[]) {
  return params.includes('family-2') ? 'family-2' : 'family-1';
}

function selectRowsFor(condition: any, isCountQuery: boolean) {
  const params = conditionParams(condition);

  if (isCountQuery) {
    const countsAdmins = params.includes('admin');
    const excludesCurrentUser = params.includes('user-1');

    if (countsAdmins && excludesCurrentUser) {
      return [{ value: testScenario.counts.otherAdmins }];
    }

    if (countsAdmins) {
      return [{ value: testScenario.counts.familyAdmins }];
    }

    if (excludesCurrentUser) {
      return [{ value: testScenario.counts.otherMembers }];
    }

    return [{ value: 0 }];
  }

  const isFamilyCodeLookup = params.some(
    (param) => typeof param === 'string' && /^\d{6}$/.test(param),
  );
  if (isFamilyCodeLookup) {
    return [];
  }

  const familyId = familyIdFromParams(params);
  const hasUserId = params.includes('user-1');
  const hasFamilyId = params.includes('family-1') || params.includes('family-2');

  if (hasUserId && !hasFamilyId) {
    return testScenario.accountMemberships.map((membership) => ({
      membershipId: `membership-${membership.familyId}`,
      familyId: membership.familyId,
      role: membership.role,
    }));
  }

  if (params.includes(testScenario.targetMember.id)) {
    return [{
      id: testScenario.targetMember.id,
      familyId,
      userId: testScenario.targetMember.userId,
      userEmail: 'target@test.dev',
      userName: 'Target User',
      role: testScenario.targetMember.role,
      joinedAt: new Date('2026-01-01T00:00:00.000Z'),
    }];
  }

  if (hasUserId && hasFamilyId && params.includes('admin')) {
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
        role: testScenario.membershipRole,
        joinedAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    }];
  }

  if (hasUserId && hasFamilyId) {
    return [{
      id: 'current-membership',
      familyId,
      userId: 'user-1',
      userEmail: 'user1@test.dev',
      userName: 'User One',
      role: testScenario.membershipRole,
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
      role: testScenario.membershipRole,
      joinedAt: new Date('2026-01-01T00:00:00.000Z'),
    },
    familyId,
    userId: 'user-1',
    userEmail: 'user1@test.dev',
    userName: 'User One',
    role: testScenario.membershipRole,
  }];
}

function createSelectBuilder(selectedFields?: unknown) {
  const isCountQuery = Boolean(
    selectedFields
    && typeof selectedFields === 'object'
    && 'value' in (selectedFields as Record<string, unknown>),
  );

  return {
    rows: [] as any[],
    from() {
      return this;
    },
    innerJoin() {
      return this;
    },
    where(condition: any) {
      this.rows = selectRowsFor(condition, isCountQuery);
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
  const insertCalls: any[] = [];

  return {
    deleteCalls: [] as unknown[][],
    insertCalls,
    get familyInsertValues() {
      return insertCalls[0] ?? null;
    },
    get memberInsertValues() {
      return insertCalls[1] ?? null;
    },
    select: vi.fn((fields?: unknown) => createSelectBuilder(fields)),
    insert: vi.fn(() => ({
      values: (values: any) => {
        insertCalls.push(values);
        return {
          returning: vi.fn(async () => [{
            id: 'family-new',
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            ...values,
          }]),
        };
      },
    })),
    transaction: vi.fn(async (callback: (tx: ReturnType<typeof createFakeDb>) => Promise<unknown>) =>
      callback(fakeDb),
    ),
    delete: vi.fn(() => ({
      where: (condition: any) => {
        fakeDb.deleteCalls.push(conditionParams(condition));
        const deleteResult = {
          returning: vi.fn(async () => testScenario.accountMemberships.map((membership) => ({
            familyId: membership.familyId,
          }))),
          then(resolve: any, reject: any) {
            return Promise.resolve({ rowCount: 1 }).then(resolve, reject);
          },
        };
        return deleteResult;
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
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    testScenario = defaultScenario();
    fakeDb = createFakeDb();
  });

  it('deletes the requested admin family', async () => {
    const res = await request('DELETE', '/api/family/details/family-2');

    expect(res.statusCode).toBe(200);
    expect(fakeDb.deleteCalls.at(-1)).toContain('family-2');
  });

  it('creates a family and adds the creator as admin member', async () => {
    const res = await request('POST', '/api/families', {
      name: 'Test Family',
    });

    expect(res.statusCode).toBe(201);
    expect(fakeDb.familyInsertValues).toMatchObject({
      name: 'Test Family',
      createdBy: 'user-1',
    });
    expect(fakeDb.memberInsertValues).toMatchObject({
      familyId: 'family-new',
      userId: 'user-1',
      userEmail: 'user1@test.dev',
      userName: 'User One',
      role: 'admin',
    });
  });

  it('allows a member to leave the requested family', async () => {
    testScenario.membershipRole = 'member';

    const res = await request('POST', '/api/family/leave', {
      familyId: 'family-2',
    });

    expect(res.statusCode).toBe(200);
    expect(fakeDb.deleteCalls.at(-1)).toEqual(expect.arrayContaining(['user-1', 'family-2']));
  });

  it('blocks the sole admin from leaving a family', async () => {
    testScenario.membershipRole = 'admin';
    testScenario.counts.otherAdmins = 0;

    const res = await request('POST', '/api/family/leave', {
      familyId: 'family-2',
    });

    expect(res.statusCode).toBe(403);
    expect(res.body).toMatchObject({
      message: expect.stringContaining('only admin'),
    });
    expect(fakeDb.deleteCalls).toHaveLength(0);
  });

  it('allows an admin to leave when another admin exists', async () => {
    testScenario.membershipRole = 'admin';
    testScenario.counts.otherAdmins = 1;

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

  it('blocks removing the last admin from a family', async () => {
    testScenario.targetMember = {
      id: 'admin-2',
      role: 'admin',
      userId: 'user-2',
    };
    testScenario.counts.familyAdmins = 1;

    const res = await request('DELETE', '/api/family/members/admin-2?familyId=family-2');

    expect(res.statusCode).toBe(403);
    expect(res.body).toMatchObject({
      message: expect.stringContaining('last admin'),
    });
    expect(fakeDb.deleteCalls).toHaveLength(0);
  });

  it('allows removing an admin when another admin remains', async () => {
    testScenario.targetMember = {
      id: 'admin-2',
      role: 'admin',
      userId: 'user-2',
    };
    testScenario.counts.familyAdmins = 2;

    const res = await request('DELETE', '/api/family/members/admin-2?familyId=family-2');

    expect(res.statusCode).toBe(200);
    expect(fakeDb.deleteCalls.at(-1)).toEqual(expect.arrayContaining(['admin-2', 'family-2']));
  });
});

describe('account deletion safeguards', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.DATABASE_URL = 'postgres://test';
    process.env.SUPABASE_URL = 'http://supabase.test';
    process.env.SUPABASE_ANON_KEY = 'anon-test-key';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    testScenario = defaultScenario();
    fakeDb = createFakeDb();
  });

  it('blocks account deletion when user is the only admin of a family with other members', async () => {
    testScenario.accountMemberships = [{
      familyId: 'family-1',
      role: 'admin',
      otherAdmins: 0,
      otherMembers: 2,
    }];
    testScenario.counts.otherAdmins = 0;
    testScenario.counts.otherMembers = 2;

    const res = await request('DELETE', '/api/user/account');

    expect(res.statusCode).toBe(409);
    expect(res.body).toMatchObject({
      message: expect.stringContaining('only admin'),
    });
    expect(fakeDb.deleteCalls).toHaveLength(0);
  });

  it('allows account deletion when the user is the sole family member', async () => {
    testScenario.accountMemberships = [{
      familyId: 'family-1',
      role: 'admin',
      otherAdmins: 0,
      otherMembers: 0,
    }];
    testScenario.counts.otherAdmins = 0;
    testScenario.counts.otherMembers = 0;

    const res = await request('DELETE', '/api/user/account');

    expect(res.statusCode).toBe(200);
    expect(fakeDb.deleteCalls.length).toBeGreaterThan(0);
  });

  it('does not delete families where another admin can manage remaining members', async () => {
    testScenario.accountMemberships = [{
      familyId: 'family-1',
      role: 'admin',
      otherAdmins: 1,
      otherMembers: 2,
    }];
    testScenario.counts.otherAdmins = 1;
    testScenario.counts.otherMembers = 2;

    const res = await request('DELETE', '/api/user/account');

    expect(res.statusCode).toBe(200);
    expect(fakeDb.deleteCalls.some((call) => call.includes('family-1'))).toBe(false);
  });
});
