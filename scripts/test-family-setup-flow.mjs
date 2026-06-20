/**
 * Manual integration check for family create/join API fixes.
 * Usage: node scripts/test-family-setup-flow.mjs
 */
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';

dotenv.config({ path: '.env.development' });

const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:5000';
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY');
  process.exit(1);
}

const isLocalSupabase = /localhost|127\.0\.0\.1|0\.0\.0\.0/.test(supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
  : null;

if (!isLocalSupabase && !supabaseAdmin) {
  console.error(
    'Refusing to run against hosted Supabase without SUPABASE_SERVICE_ROLE_KEY.\n' +
      'signUp() would send confirmation emails to disposable addresses and can cause bounces.\n' +
      'Use local Supabase (npx supabase start) or set SUPABASE_SERVICE_ROLE_KEY in .env.development.',
  );
  process.exit(1);
}

const testEmail = `cursor-test-${Date.now()}@example.invalid`;
const testPassword = `Test-${randomBytes(8).toString('hex')}!`;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function api(path, { method = 'GET', token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { status: res.status, json };
}

async function getAccessToken() {
  if (supabaseAdmin) {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
    });
    if (error) throw error;
    const { data: signIn, error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });
    if (signInError) throw signInError;
    return { token: signIn.session.access_token, userId: data.user.id };
  }

  if (!isLocalSupabase) {
    throw new Error(
      'Hosted Supabase requires SUPABASE_SERVICE_ROLE_KEY (signUp sends real auth emails).',
    );
  }

  const { data, error } = await supabase.auth.signUp({
    email: testEmail,
    password: testPassword,
  });
  if (error) throw error;
  if (!data.session?.access_token) {
    throw new Error('Sign-up did not return a session (email confirmation may be required)');
  }
  return { token: data.session.access_token, userId: data.user.id };
}

async function cleanup(userId, familyId, token) {
  if (familyId && token) {
    await api(`/api/family/details/${familyId}`, { method: 'DELETE', token });
  }
  if (userId && supabaseAdmin) {
    await supabaseAdmin.auth.admin.deleteUser(userId);
  }
}

async function main() {
  console.log('Integration test: family create/join flow');
  console.log(`Base URL: ${baseUrl}`);

  const ping = await api('/api/ping');
  assert(ping.status === 200 && ping.json?.ok === true, 'Ping failed');

  const unauthCleanup = await api('/api/cleanup-duplicates', { method: 'POST' });
  assert(unauthCleanup.status === 401, `Expected 401 for unauthenticated cleanup, got ${unauthCleanup.status}`);

  let userId;
  let familyId;
  let token;

  try {
    ({ token, userId } = await getAccessToken());

    const fakeClientCode = 'ABC123';
    const create = await api('/api/families', {
      method: 'POST',
      token,
      body: { name: `Test Family ${Date.now()}`, code: fakeClientCode },
    });
    assert(create.status === 201, `Create family failed: ${create.status}`);
    assert(create.json?.family?.code, 'Create response missing family.code');
    assert(create.json.family.code !== fakeClientCode, 'Server should not use client-provided code');
    assert(/^\d{6}$/.test(create.json.family.code), 'Family code should be 6 digits');

    familyId = create.json.family.id;
    console.log(`Created family "${create.json.family.name}" with code ${create.json.family.code}`);

    const joinWrong = await api('/api/families/join', {
      method: 'POST',
      token,
      body: { code: fakeClientCode },
    });
    assert(joinWrong.status === 404, `Join with fake client code should 404, got ${joinWrong.status}`);

    const joinOk = await api('/api/families/join', {
      method: 'POST',
      token,
      body: { code: create.json.family.code },
    });
    assert(joinOk.status === 400, `Re-join should 400, got ${joinOk.status}`);

    const secondUserEmail = `cursor-test-2-${Date.now()}@example.invalid`;
    let secondToken;
    let secondUserId;

    if (supabaseAdmin) {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: secondUserEmail,
        password: testPassword,
        email_confirm: true,
      });
      if (error) throw error;
      secondUserId = data.user.id;
      const { data: signIn, error: signInError } = await supabase.auth.signInWithPassword({
        email: secondUserEmail,
        password: testPassword,
      });
      if (signInError) throw signInError;
      secondToken = signIn.session.access_token;
    } else {
      console.log('Skipping second-user join test (no service role key)');
      secondToken = null;
    }

    if (secondToken) {
      const joinAsMember = await api('/api/families/join', {
        method: 'POST',
        token: secondToken,
        body: { code: create.json.family.code },
      });
      assert(joinAsMember.status === 200, `Join failed: ${joinAsMember.status}`);
      assert(
        joinAsMember.json?.family?.name === create.json.family.name,
        'Join response should include family.name',
      );
      console.log(`Second user joined family "${joinAsMember.json.family.name}"`);

      await cleanup(secondUserId, null, null);
    }

    const authCleanup = await api('/api/cleanup-duplicates', {
      method: 'POST',
      token,
      body: { familyId },
    });
    assert(authCleanup.status === 200, `Authenticated cleanup failed: ${authCleanup.status}`);

    console.log('All integration checks passed.');
  } finally {
    await cleanup(userId, familyId, token);
  }
}

main().catch((err) => {
  console.error('Integration test failed:', err.message);
  process.exit(1);
});
