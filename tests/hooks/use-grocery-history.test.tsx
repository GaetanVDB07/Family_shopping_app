import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useGroceryHistory } from '@/hooks/use-grocery-history';

const apiRequestMock = vi.fn();

vi.mock('@/lib/queryClient', () => ({
  apiRequest: (...args: unknown[]) => apiRequestMock(...args),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useGroceryHistory', () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    apiRequestMock.mockResolvedValue({
      json: async () => [{ id: 1, name: 'Melk' }],
    });
  });

  it('does not fetch history until suggestions are enabled', async () => {
    renderHook(() => useGroceryHistory('family-1', { enabled: false }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(apiRequestMock).not.toHaveBeenCalled();
    });
  });

  it('fetches history when suggestions are enabled', async () => {
    renderHook(() => useGroceryHistory('family-1', { enabled: true }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(apiRequestMock).toHaveBeenCalledWith(
        'GET',
        '/api/grocery-items/family-1/history',
      );
    });
  });
});
