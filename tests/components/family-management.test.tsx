import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import FamilyManagement from '@/pages/family-management';
import { apiRequest } from '@/lib/queryClient';

const setLocation = vi.fn();
const invalidateQueries = vi.fn();
const queryFn = vi.fn();

vi.mock('wouter', () => ({
  useLocation: () => ['/family-management', setLocation],
  useParams: () => ({}),
}));

vi.mock('@tanstack/react-query', () => ({
  useMutation: () => ({
    isPending: false,
    mutate: vi.fn(),
  }),
  useQuery: (options: { queryFn?: () => Promise<unknown>; enabled?: boolean }) => {
    if (options.enabled !== false && options.queryFn) {
      queryFn.mockImplementation(options.queryFn);
      void queryFn();
    }
    return {
      data: {
        id: 'family-from-hook',
        name: 'Test Family',
        code: '123456',
        members: [],
        userRole: 'admin',
      },
      isLoading: false,
      error: null,
    };
  },
  useQueryClient: () => ({
    invalidateQueries,
  }),
}));

vi.mock('@/lib/queryClient', () => ({
  apiRequest: vi.fn(),
}));

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({ user: { id: 'user-1', email: 'admin@test.dev' } }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

const mockUseCurrentFamily = vi.fn();
vi.mock('@/hooks/use-current-family', () => ({
  useCurrentFamily: () => mockUseCurrentFamily(),
}));

const mockUseFamilyStatus = vi.fn();
vi.mock('@/hooks/use-family-status', () => ({
  useFamilyStatus: () => mockUseFamilyStatus(),
}));

describe('FamilyManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('currentFamilyId', 'legacy-wrong-family');
    localStorage.setItem('currentFamilyId:user-1', 'family-from-hook');

    mockUseCurrentFamily.mockReturnValue({
      currentFamilyId: 'family-from-hook',
      currentFamily: null,
      updateCurrentFamily: vi.fn(),
      isLoading: false,
    });

    mockUseFamilyStatus.mockReturnValue({
      allFamilies: [{
        familyId: 'family-from-hook',
        familyName: 'Test Family',
        familyCode: '123456',
        role: 'admin',
        joinedAt: new Date().toISOString(),
      }],
      familiesLoading: false,
    });

    vi.mocked(apiRequest).mockResolvedValue({
      json: async () => ({
        id: 'family-from-hook',
        name: 'Test Family',
        code: '123456',
        members: [],
        userRole: 'admin',
      }),
    } as unknown as Response);
  });

  it('uses the user-scoped current family when the URL has no familyId (#81)', async () => {
    render(<FamilyManagement />);

    await waitFor(() => {
      expect(queryFn).toHaveBeenCalled();
    });

    expect(apiRequest).toHaveBeenCalledWith('GET', '/api/family/details/family-from-hook');
    expect(apiRequest).not.toHaveBeenCalledWith('GET', '/api/family/details/legacy-wrong-family');
  });
});
