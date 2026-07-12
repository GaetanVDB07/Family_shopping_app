import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import FamilySetup from '@/pages/family-setup';

const setLocation = vi.fn();
const invalidateQueries = vi.fn();

vi.mock('wouter', () => ({
  useLocation: () => ['/', setLocation],
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    invalidateQueries,
  }),
}));

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'test@example.com', user_metadata: { name: 'Marie' } },
    session: { access_token: 'test-token' },
    signOut: vi.fn(),
  }),
}));

const mockResolveInitialJoinCode = vi.fn(() => null as string | null);
const mockClearPendingJoinCode = vi.fn();

vi.mock('@/lib/family-invite', () => ({
  resolveInitialJoinCode: () => mockResolveInitialJoinCode(),
  clearPendingJoinCode: () => mockClearPendingJoinCode(),
}));

describe('FamilySetup', () => {
  beforeEach(() => {
    setLocation.mockReset();
    invalidateQueries.mockReset();
    mockResolveInitialJoinCode.mockReturnValue(null);
    mockClearPendingJoinCode.mockReset();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows the server-generated family code after create', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        family: { id: 'f1', name: 'Familie Jansen', code: '482917' },
      }),
    } as Response);

    render(<FamilySetup />);

    fireEvent.change(screen.getByLabelText('Familie Naam'), {
      target: { value: 'Familie Jansen' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Familie Aanmaken' }));

    await waitFor(() => {
      expect(screen.getByText(/Familie code: 482917/)).toBeInTheDocument();
    });

    expect(fetch).toHaveBeenCalledWith(
      '/api/families',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'Familie Jansen' }),
      }),
    );
  });

  it('cancels the delayed redirect when setup unmounts', async () => {
    const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout');
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        family: { id: 'f1', name: 'Snelle Familie', code: '482917' },
      }),
    } as Response);

    const { unmount } = render(<FamilySetup />);
    fireEvent.change(screen.getByLabelText('Familie Naam'), {
      target: { value: 'Snelle Familie' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Familie Aanmaken' }));

    await screen.findByText(/Familie code: 482917/);
    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
    expect(setLocation).not.toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });

  async function openJoinTab() {
    const user = userEvent.setup();
    await user.click(screen.getByRole('tab', { name: /Familie Joinen/i }));
    await waitFor(() => {
      expect(screen.getByLabelText('Familie Code')).toBeVisible();
    });
  }

  it('shows the family name after join', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        family: { id: 'f1', name: 'De Bakkers', code: '123456' },
      }),
    } as Response);

    render(<FamilySetup />);

    await openJoinTab();
    fireEvent.change(screen.getByLabelText('Familie Code'), {
      target: { value: '123456' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Bij Familie Voegen' }));

    await waitFor(() => {
      expect(screen.getByText('Welkom bij familie "De Bakkers"!')).toBeInTheDocument();
    });

    expect(fetch).toHaveBeenCalledWith(
      '/api/families/join',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ code: '123456' }),
      }),
    );
  });

  it('prefills the join tab when an invite code is present', async () => {
    mockResolveInitialJoinCode.mockReturnValue('482917');

    render(<FamilySetup />);

    await waitFor(() => {
      expect(screen.getByLabelText('Familie Code')).toHaveValue('482917');
    });

    expect(mockClearPendingJoinCode).toHaveBeenCalled();
    expect(screen.getByText('Ingelogd als: Marie')).toBeInTheDocument();
  });

  it('strips non-digits from the join code input', async () => {
    render(<FamilySetup />);

    await openJoinTab();
    const input = screen.getByLabelText('Familie Code') as HTMLInputElement;

    fireEvent.change(input, { target: { value: '12ab34cd56' } });

    expect(input.value).toBe('123456');
  });
});
