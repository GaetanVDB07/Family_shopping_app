import { render, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthProvider, useAuth } from '@/hooks/use-auth';

const mockGetSession = vi.fn();
const mockUnsubscribe = vi.fn();

vi.mock('@/lib/supabase', () => ({
  default: {
    auth: {
      getSession: () => mockGetSession(),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: mockUnsubscribe } },
      }),
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
    },
  },
}));

vi.mock('@/lib/queryClient', () => ({
  setAuthTokenGetter: vi.fn(),
}));

function ContextTracker({ onValue }: { onValue: (value: ReturnType<typeof useAuth>) => void }) {
  const value = useAuth();
  onValue(value);
  return null;
}

describe('AuthProvider', () => {
  const session = {
    access_token: 'token',
    user: { id: 'user-1', email: 'user@example.com' },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ data: { session } });
  });

  it('keeps a stable context value when auth state is unchanged', async () => {
    const values: ReturnType<typeof useAuth>[] = [];

    function Wrapper({ tick }: { tick: number }) {
      return (
        <AuthProvider>
          <ContextTracker onValue={(value) => values.push(value)} />
          <span data-testid="tick">{tick}</span>
        </AuthProvider>
      );
    }

    const { rerender } = render(<Wrapper tick={0} />);

    await act(async () => {
      await Promise.resolve();
    });

    const before = values.at(-1);
    expect(before).toBeDefined();

    rerender(<Wrapper tick={1} />);

    await act(async () => {
      await Promise.resolve();
    });

    const after = values.at(-1);
    expect(after).toBe(before);
    expect(after?.signIn).toBe(before?.signIn);
    expect(after?.signOut).toBe(before?.signOut);
  });
});
