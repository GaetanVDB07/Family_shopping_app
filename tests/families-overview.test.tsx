import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import FamiliesOverview from '@/pages/families-overview';

vi.mock('@tanstack/react-query', () => ({
  useMutation: () => ({
    isPending: false,
    mutate: vi.fn(),
  }),
  useQuery: () => ({
    data: [],
    isLoading: false,
  }),
  useQueryClient: () => ({
    invalidateQueries: vi.fn(),
  }),
}));

vi.mock('@/lib/queryClient', () => ({
  apiRequest: vi.fn(),
}));

vi.mock('wouter', () => ({
  useLocation: () => ['/families', vi.fn()],
}));

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

vi.mock('@/hooks/use-current-family', () => ({
  useCurrentFamily: () => ({ updateCurrentFamily: vi.fn() }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

describe('FamiliesOverview', () => {
  it('shows the app version in the Mijn Families header', () => {
    render(<FamiliesOverview />);

    expect(screen.getByText(`V${__APP_VERSION__}`)).toBeInTheDocument();
  });
});
