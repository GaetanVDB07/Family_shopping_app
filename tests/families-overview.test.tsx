import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import FamiliesOverview from '@/pages/families-overview';

const mockFamilies = [{
  id: 'family-1',
  name: 'Test Family',
  code: '123456',
  role: 'admin',
  memberCount: 2,
}];

vi.mock('@tanstack/react-query', () => ({
  useMutation: () => ({
    isPending: false,
    mutate: vi.fn(),
  }),
  useQuery: () => ({
    data: mockFamilies,
    isLoading: false,
  }),
  useQueryClient: () => ({
    invalidateQueries: vi.fn(),
    prefetchQuery: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock('@/lib/queryClient', () => ({
  apiRequest: vi.fn(),
}));

vi.mock('wouter', () => ({
  useLocation: () => ['/families', vi.fn()],
}));

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    user: { id: 'user-1' },
    session: { access_token: 'test-token' },
  }),
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

  it('strips non-digits from the join code input (#77)', async () => {
    const user = userEvent.setup();
    render(<FamiliesOverview />);

    await user.click(screen.getAllByRole('button', { name: /Familie Joinen/i })[0]);

    const input = screen.getByLabelText('Familie Code') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'AB12cd34' } });

    expect(input.value).toBe('1234');
    expect(input).toHaveAttribute('placeholder', '123456');
  });

  it('keeps the join button disabled until 6 digits are entered (#77)', async () => {
    const user = userEvent.setup();
    render(<FamiliesOverview />);

    await user.click(screen.getAllByRole('button', { name: /Familie Joinen/i })[0]);

    const joinButton = screen.getByRole('button', { name: /^Familie Joinen$/i });
    expect(joinButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Familie Code'), {
      target: { value: '123456' },
    });

    expect(joinButton).not.toBeDisabled();
  });
});
