import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import GroceryList from '@/pages/grocery-list';
import type { GroceryItem } from '@shared/schema';

const mockItems: GroceryItem[] = [];
const setLocation = vi.fn();

vi.mock('wouter', () => ({
  useLocation: () => ['/grocery-list/family-1', setLocation],
  useParams: () => ({ familyId: 'family-1' }),
}));

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-query')>('@tanstack/react-query');
  return {
    ...actual,
    useMutation: (options: any) => ({
      isPending: false,
      mutate: vi.fn(),
      mutateAsync: vi.fn(async (variables) => options?.mutationFn?.(variables)),
    }),
    useQueryClient: () => ({
      setQueryData: vi.fn(),
      cancelQueries: vi.fn(),
      getQueryData: vi.fn(),
    }),
  };
});

vi.mock('@/hooks/use-grocery-items', () => ({
  useGroceryItems: () => ({
    data: mockItems,
    isLoading: false,
    refetch: vi.fn(),
  }),
}));

vi.mock('@/hooks/use-refetch-on-visibility', () => ({
  useRefetchOnVisibility: vi.fn(),
}));

vi.mock('@/hooks/use-pull-to-refresh', () => ({
  usePullToRefresh: () => ({
    isPulling: false,
    isRefreshing: false,
    pullDistance: 0,
    shouldShowIndicator: false,
  }),
}));

vi.mock('@/hooks/use-websocket', () => ({
  useWebSocket: vi.fn(),
}));

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({ user: { id: 'user-1', email: 'user@test.dev' } }),
}));

vi.mock('@/hooks/use-family-status', () => ({
  useFamilyStatus: () => ({
    allFamilies: [{ familyId: 'family-1', familyName: 'Test Family' }],
    familiesLoading: false,
  }),
}));

vi.mock('@/hooks/use-current-family', () => ({
  useCurrentFamily: () => ({
    currentFamilyId: 'family-1',
    currentFamily: { familyId: 'family-1', familyName: 'Test Family' },
    updateCurrentFamily: vi.fn(),
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/components/user-menu', () => ({
  UserMenu: () => <div data-testid="user-menu" />,
}));

function groceryItem(overrides: Partial<GroceryItem>): GroceryItem {
  return {
    id: 1,
    name: 'Melk',
    quantity: null,
    unit: null,
    notes: null,
    completed: false,
    addedBy: 'tester',
    familyId: 'family-1',
    addedAt: new Date('2026-06-11T12:00:00.000Z'),
    createdAt: new Date('2026-06-11T12:00:00.000Z'),
    ...overrides,
  };
}

describe('GroceryList shopping-friendly polish', () => {
  beforeEach(() => {
    mockItems.length = 0;
    vi.clearAllMocks();
  });

  it('shows grocery progress without switching to a separate mode', () => {
    mockItems.push(
      groceryItem({ id: 1, name: 'Melk', completed: true }),
      groceryItem({ id: 2, name: 'Brood', completed: false }),
      groceryItem({ id: 3, name: 'Appels', completed: false }),
    );

    render(<GroceryList />);

    expect(screen.getByText('1 van 3 klaar')).toBeInTheDocument();
    expect(screen.getByText('2 te gaan')).toBeInTheDocument();

    const progressBar = screen.getByRole('progressbar', { name: 'Voortgang boodschappen' });
    expect(progressBar).toHaveAttribute('aria-valuenow', '1');
    expect(progressBar).toHaveAttribute('aria-valuemax', '3');
  });

  it('shows a done state when every item is completed', () => {
    mockItems.push(
      groceryItem({ id: 1, name: 'Melk', completed: true }),
      groceryItem({ id: 2, name: 'Brood', completed: true }),
    );

    render(<GroceryList />);

    expect(screen.getByText('2 van 2 klaar')).toBeInTheDocument();
    expect(screen.getAllByText('Alles afgevinkt').length).toBeGreaterThan(0);
    expect(screen.getByText('Je boodschappenlijst is klaar.')).toBeInTheDocument();
  });
});
