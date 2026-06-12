import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AuthPage, { ResetPasswordPage } from '@/pages/auth';

const mockResetPasswordForEmail = vi.fn();
const mockSignIn = vi.fn();
const mockSignUp = vi.fn();
const mockUpdatePassword = vi.fn();

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    signIn: mockSignIn,
    signUp: mockSignUp,
    resetPasswordForEmail: mockResetPasswordForEmail,
    updatePassword: mockUpdatePassword,
  }),
}));

describe('AuthPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockSignIn.mockResolvedValue({ data: {}, error: null });
    mockSignUp.mockResolvedValue({ data: {}, error: null });
    mockResetPasswordForEmail.mockResolvedValue({ data: {}, error: null });
  });

  it('shows a forgot password link on the login screen', () => {
    render(<AuthPage />);

    expect(screen.getByRole('button', { name: 'Wachtwoord vergeten?' })).toBeInTheDocument();
  });

  it('switches to the forgot password form', () => {
    render(<AuthPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Wachtwoord vergeten?' }));

    expect(screen.getByRole('button', { name: 'Resetlink versturen' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Wachtwoord')).not.toBeInTheDocument();
  });

  it('passes the display name when signing up', async () => {
    render(<AuthPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Nog geen account? Maak er een aan' }));
    fireEvent.change(screen.getByLabelText('Naam'), { target: { value: '  Marie  ' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'marie@example.com' } });
    fireEvent.change(screen.getByLabelText('Wachtwoord'), { target: { value: 'secret12' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Account aanmaken' }));
      await Promise.resolve();
    });

    expect(mockSignUp).toHaveBeenCalledWith('marie@example.com', 'secret12', 'Marie');
  });

  it('sends a reset email when forgot password is submitted', async () => {
    render(<AuthPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Wachtwoord vergeten?' }));
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'user@example.com' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Resetlink versturen' }));
      await Promise.resolve();
    });

    expect(mockResetPasswordForEmail).toHaveBeenCalledWith('user@example.com');
    expect(
      screen.getByText('We hebben een resetlink naar je e-mailadres gestuurd.')
    ).toBeInTheDocument();
  });
});

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockUpdatePassword.mockResolvedValue({ data: {}, error: null });
  });

  it('updates the password when confirmation matches', async () => {
    render(<ResetPasswordPage />);

    fireEvent.change(screen.getByLabelText('Nieuw wachtwoord'), {
      target: { value: 'new-password' },
    });
    fireEvent.change(screen.getByLabelText('Bevestig wachtwoord'), {
      target: { value: 'new-password' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Wachtwoord opslaan' }));
      await Promise.resolve();
    });

    expect(mockUpdatePassword).toHaveBeenCalledWith('new-password');
    expect(
      screen.getByText('Je wachtwoord is bijgewerkt. Je kunt nu verder met de app.')
    ).toBeInTheDocument();
  });

  it('shows an error when passwords do not match', async () => {
    render(<ResetPasswordPage />);

    fireEvent.change(screen.getByLabelText('Nieuw wachtwoord'), {
      target: { value: 'new-password' },
    });
    fireEvent.change(screen.getByLabelText('Bevestig wachtwoord'), {
      target: { value: 'different-password' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Wachtwoord opslaan' }));
      await Promise.resolve();
    });

    expect(mockUpdatePassword).not.toHaveBeenCalled();
    expect(screen.getByText('Wachtwoorden komen niet overeen')).toBeInTheDocument();
  });
});
