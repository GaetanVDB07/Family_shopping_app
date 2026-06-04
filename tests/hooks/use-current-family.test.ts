import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useCurrentFamily } from '@/hooks/use-current-family';
import { useFamilyStatus } from '@/hooks/use-family-status';
import { useAuth } from '@/hooks/use-auth';
import type { UserFamilyMembership } from '@shared/schema';

vi.mock('@/hooks/use-family-status', () => ({
  useFamilyStatus: vi.fn(),
}));

vi.mock('@/hooks/use-auth', () => ({
  useAuth: vi.fn(),
}));

const mockedUseFamilyStatus = vi.mocked(useFamilyStatus);
const mockedUseAuth = vi.mocked(useAuth);

describe('useCurrentFamily', () => {
  const buildFamily = (overrides: Partial<UserFamilyMembership> = {}): UserFamilyMembership => ({
    familyId: 'family-1',
    familyName: 'Family One',
    familyCode: 'ABC123',
    role: 'member',
    joinedAt: new Date().toISOString(),
    ...overrides,
  });

  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
    mockedUseAuth.mockReturnValue({
      user: { id: 'user-1', email: 'user1@test.dev' } as any,
      session: null,
      loading: false,
      isPasswordRecovery: false,
      signUp: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updatePassword: vi.fn(),
    });
  });

  it('loads the stored family for the active user', () => {
    localStorage.setItem('currentFamilyId:user-1', 'family-42');
    mockedUseFamilyStatus.mockReturnValue({
      allFamilies: [buildFamily({ familyId: 'family-42' })],
      familiesLoading: false,
      hasFamilies: true,
      familyMembership: null,
      loading: false,
      error: null,
      hasFamily: true,
    });

    const { result } = renderHook(() => useCurrentFamily());

    expect(result.current.currentFamilyId).toBe('family-42');
    expect(localStorage.getItem('currentFamilyId:user-1')).toBe('family-42');
  });

  it('automatically selects the first family when none stored', () => {
    mockedUseFamilyStatus.mockReturnValue({
      allFamilies: [buildFamily({ familyId: 'family-99' })],
      familiesLoading: false,
      hasFamilies: true,
      familyMembership: null,
      loading: false,
      error: null,
      hasFamily: true,
    });

    const { result } = renderHook(() => useCurrentFamily());

    expect(result.current.currentFamilyId).toBe('family-99');
    expect(localStorage.getItem('currentFamilyId:user-1')).toBe('family-99');
  });

  it('clears the stored family when none are available', () => {
    localStorage.setItem('currentFamilyId:user-1', 'family-100');

    mockedUseFamilyStatus.mockReturnValue({
      allFamilies: [],
      familiesLoading: false,
      hasFamilies: false,
      familyMembership: null,
      loading: false,
      error: null,
      hasFamily: false,
    });

    const { result } = renderHook(() => useCurrentFamily());

    expect(result.current.currentFamilyId).toBeNull();
    expect(localStorage.getItem('currentFamilyId:user-1')).toBeNull();
  });

  it('updates storage when updating the current family manually', () => {
    mockedUseFamilyStatus.mockReturnValue({
      allFamilies: [buildFamily({ familyId: 'family-1' }), buildFamily({ familyId: 'family-2' })],
      familiesLoading: false,
      hasFamilies: true,
      familyMembership: null,
      loading: false,
      error: null,
      hasFamily: true,
    });

    const { result } = renderHook(() => useCurrentFamily());

    act(() => {
      result.current.updateCurrentFamily('family-2');
    });

    expect(result.current.currentFamilyId).toBe('family-2');
    expect(localStorage.getItem('currentFamilyId:user-1')).toBe('family-2');
  });
});
