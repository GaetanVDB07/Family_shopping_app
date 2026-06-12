import { describe, expect, it } from 'vitest';
import { getUserDisplayName } from '@/lib/user-display-name';
import type { User } from '@supabase/supabase-js';

function mockUser(metadata: Record<string, unknown>, email = 'user@example.com'): User {
  return {
    id: 'user-1',
    email,
    user_metadata: metadata,
  } as User;
}

describe('getUserDisplayName', () => {
  it('prefers signup name metadata', () => {
    expect(getUserDisplayName(mockUser({ name: 'Marie' }))).toBe('Marie');
    expect(getUserDisplayName(mockUser({ user_name: 'Piet' }))).toBe('Piet');
  });

  it('falls back to the email prefix', () => {
    expect(getUserDisplayName(mockUser({}, 'jan@test.dev'))).toBe('jan');
  });
});
