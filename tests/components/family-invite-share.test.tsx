import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FamilyInviteShare } from '@/components/family-invite-share';

const toastSpy = vi.fn();

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: toastSpy }),
}));

describe('FamilyInviteShare', () => {
  beforeEach(() => {
    toastSpy.mockReset();
    vi.stubGlobal('location', { origin: 'https://example.com' });
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it('renders invite link and QR code for the family code', () => {
    render(<FamilyInviteShare familyCode="123456" />);

    expect(screen.getByDisplayValue('https://example.com/family-setup?code=123456')).toBeInTheDocument();
    expect(screen.getByText('Scan om direct te joinen')).toBeInTheDocument();
  });

  it('copies the invite link to the clipboard', async () => {
    render(<FamilyInviteShare familyCode="123456" />);

    fireEvent.click(screen.getByRole('button', { name: 'Kopieer uitnodigingslink' }));

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        'https://example.com/family-setup?code=123456',
      );
    });
  });
});
