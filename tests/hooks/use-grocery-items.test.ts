import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useGroceryItems } from '@/hooks/use-grocery-items';
import { useQuery } from '@tanstack/react-query';

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-query')>('@tanstack/react-query');
  return {
    ...actual,
    useQuery: vi.fn(),
  };
});

const mockedUseQuery = vi.mocked(useQuery);

describe('useGroceryItems', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockedUseQuery.mockReturnValue({
      data: [],
      isLoading: false,
      refetch: vi.fn(),
    } as any);
  });

  it('calls useQuery with the grocery items endpoint and family id', () => {
    renderHook(() => useGroceryItems('family-1'));

    expect(mockedUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['/api/grocery-items', 'family-1'],
        enabled: true,
      }),
    );
  });

  it('disables the query when no family id is provided', () => {
    renderHook(() => useGroceryItems(null));

    expect(mockedUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['/api/grocery-items', null],
        enabled: false,
      }),
    );
  });

  it('opts the query in to window-focus refetch', () => {
    renderHook(() => useGroceryItems('family-1'));

    expect(mockedUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        refetchOnWindowFocus: 'always',
      }),
    );
  });

  it('returns an empty array when the family id is missing', async () => {
    renderHook(() => useGroceryItems(null));

    const queryFn = mockedUseQuery.mock.calls[0][0].queryFn as () => Promise<unknown[]>;
    const result = await queryFn();

    expect(result).toEqual([]);
  });
});
