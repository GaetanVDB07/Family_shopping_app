import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useWebSocket } from '@/hooks/use-websocket';
import { useAuth } from '@/hooks/use-auth';
import type { GroceryItem } from '@shared/schema';

vi.mock('@/hooks/use-auth', () => ({
  useAuth: vi.fn(),
}));

type PostgresHandler = (payload: { new?: Record<string, unknown>; old?: Record<string, unknown> }) => void;

const channelHandlers: Record<string, PostgresHandler> = {};
let subscribeStatusCallback: ((status: string) => void) | null = null;

const mockChannel = {
  on: vi.fn((_event: string, config: { event: string }, handler: PostgresHandler) => {
    channelHandlers[config.event] = handler;
    return mockChannel;
  }),
  subscribe: vi.fn((callback: (status: string) => void) => {
    subscribeStatusCallback = callback;
    return mockChannel;
  }),
  unsubscribe: vi.fn(async () => undefined),
};

vi.mock('@/lib/supabase', () => ({
  default: {
    channel: vi.fn(() => mockChannel),
  },
}));

const mockedUseAuth = vi.mocked(useAuth);

describe('useWebSocket', () => {
  const onItemAdded = vi.fn();
  const onItemUpdated = vi.fn();
  const onItemDeleted = vi.fn();
  const onSync = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    subscribeStatusCallback = null;
    for (const key of Object.keys(channelHandlers)) {
      delete channelHandlers[key];
    }

    mockedUseAuth.mockReturnValue({
      user: { id: 'user-1', email: 'user1@test.dev' } as any,
      session: { access_token: 'token' } as any,
      loading: false,
      isPasswordRecovery: false,
      signUp: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updatePassword: vi.fn(),
    });
  });

  it('stays disconnected without an authenticated session', async () => {
    mockedUseAuth.mockReturnValue({
      user: null,
      session: null,
      loading: false,
      isPasswordRecovery: false,
      signUp: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updatePassword: vi.fn(),
    });

    renderHook(() =>
      useWebSocket({
        familyId: 'family-1',
        onItemAdded,
        onItemUpdated,
        onItemDeleted,
        onSync,
      }),
    );

    await waitFor(() => {
      expect(mockChannel.subscribe).not.toHaveBeenCalled();
    });
  });

  it('calls onResync after a realtime reconnect', async () => {
    const onResync = vi.fn();

    renderHook(() =>
      useWebSocket({
        familyId: 'family-1',
        onItemAdded,
        onItemUpdated,
        onItemDeleted,
        onSync,
        onResync,
      }),
    );

    await waitFor(() => {
      expect(mockChannel.subscribe).toHaveBeenCalled();
    });

    subscribeStatusCallback?.('SUBSCRIBED');
    subscribeStatusCallback?.('CLOSED');
    subscribeStatusCallback?.('SUBSCRIBED');

    await waitFor(() => {
      expect(onResync).toHaveBeenCalledTimes(1);
    });
  });

  it('normalizes INSERT payloads before calling onItemAdded', async () => {
    renderHook(() =>
      useWebSocket({
        familyId: 'family-1',
        onItemAdded,
        onItemUpdated,
        onItemDeleted,
        onSync,
      }),
    );

    await waitFor(() => {
      expect(channelHandlers.INSERT).toBeDefined();
    });

    channelHandlers.INSERT({
      new: {
        id: 12,
        name: 'Melk',
        completed: false,
        added_by: 'user-abc',
        family_id: 'family-1',
        created_at: '2026-01-15T10:00:00.000Z',
      },
    });

    expect(onItemAdded).toHaveBeenCalledWith({
      id: 12,
      name: 'Melk',
      quantity: null,
      unit: null,
      notes: null,
      completed: false,
      addedBy: 'user-abc',
      familyId: 'family-1',
      addedAt: new Date('2026-01-15T10:00:00.000Z'),
      sortOrder: 0,
      completedAt: null,
      archivedAt: null,
      createdAt: new Date('2026-01-15T10:00:00.000Z'),
    } satisfies GroceryItem);
  });

  it('normalizes DELETE payloads before calling onItemDeleted', async () => {
    renderHook(() =>
      useWebSocket({
        familyId: 'family-1',
        onItemAdded,
        onItemUpdated,
        onItemDeleted,
        onSync,
      }),
    );

    await waitFor(() => {
      expect(channelHandlers.DELETE).toBeDefined();
    });

    channelHandlers.DELETE({
      old: {
        id: 7,
        name: 'Brood',
        completed: true,
        added_by: 'user-abc',
        family_id: 'family-1',
        created_at: '2026-01-15T10:00:00.000Z',
      },
    });

    expect(onItemDeleted).toHaveBeenCalledWith(7);
  });

  it('does not reconnect when auth object identity changes but token and user id stay the same', async () => {
    const { rerender } = renderHook(() =>
      useWebSocket({
        familyId: 'family-1',
        onItemAdded,
        onItemUpdated,
        onItemDeleted,
        onSync,
      }),
    );

    await waitFor(() => {
      expect(mockChannel.subscribe).toHaveBeenCalledTimes(1);
    });

    mockedUseAuth.mockReturnValue({
      user: { id: 'user-1', email: 'user1@test.dev' } as any,
      session: { access_token: 'token' } as any,
      loading: false,
      isPasswordRecovery: false,
      signUp: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updatePassword: vi.fn(),
    });

    rerender();

    expect(mockChannel.subscribe).toHaveBeenCalledTimes(1);
    expect(mockChannel.unsubscribe).not.toHaveBeenCalled();
  });

  it('reconnects when the access token changes', async () => {
    const { rerender } = renderHook(() =>
      useWebSocket({
        familyId: 'family-1',
        onItemAdded,
        onItemUpdated,
        onItemDeleted,
        onSync,
      }),
    );

    await waitFor(() => {
      expect(mockChannel.subscribe).toHaveBeenCalledTimes(1);
    });

    mockedUseAuth.mockReturnValue({
      user: { id: 'user-1', email: 'user1@test.dev' } as any,
      session: { access_token: 'new-token' } as any,
      loading: false,
      isPasswordRecovery: false,
      signUp: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updatePassword: vi.fn(),
    });

    rerender();

    await waitFor(() => {
      expect(mockChannel.unsubscribe).toHaveBeenCalled();
      expect(mockChannel.subscribe).toHaveBeenCalledTimes(2);
    });
  });

  it('unsubscribes from the previous channel when the family changes', async () => {
    const { rerender } = renderHook(
      ({ familyId }) =>
        useWebSocket({
          familyId,
          onItemAdded,
          onItemUpdated,
          onItemDeleted,
          onSync,
        }),
      { initialProps: { familyId: 'family-1' as string | null } },
    );

    await waitFor(() => {
      expect(mockChannel.subscribe).toHaveBeenCalledTimes(1);
    });

    rerender({ familyId: 'family-2' });

    await waitFor(() => {
      expect(mockChannel.unsubscribe).toHaveBeenCalled();
      expect(mockChannel.subscribe).toHaveBeenCalledTimes(2);
    });
  });
});
