import { useQuery } from '@tanstack/react-query';
import { useAuth } from './use-auth';
import type { UserFamilyMembership } from '@shared/schema';

export function userFamiliesQueryKey(userId: string | null) {
  return ['/api/user/families', userId] as const;
}

export function useFamilyStatus() {
  const { user, session } = useAuth();
  const userId = user?.id ?? null;

  const {
    data: allFamilies,
    isLoading: queryLoading,
    isSuccess,
    error,
    refetch,
  } = useQuery<UserFamilyMembership[]>({
    queryKey: userFamiliesQueryKey(userId),
    queryFn: async () => {
      if (!user || !session) {
        return [];
      }

      const response = await fetch('/api/user/families', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        return data || [];
      }

      throw new Error(
        response.status === 401
          ? 'Je sessie kon niet worden gecontroleerd'
          : 'Families konden niet worden opgehaald',
      );
    },
    enabled: !!user && !!session,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  const waitingForSession = Boolean(user && !session);
  const familiesLoading = waitingForSession || queryLoading;
  const familyDataReady = !user || (!waitingForSession && isSuccess);
  const families = allFamilies || [];
  const primaryFamily = families[0] ?? null;

  return {
    familyMembership: primaryFamily
      ? {
          id: primaryFamily.familyId,
          name: primaryFamily.familyName,
          code: primaryFamily.familyCode,
          role: primaryFamily.role,
          joinedAt: primaryFamily.joinedAt,
        }
      : null,
    loading: familiesLoading,
    error: error?.message || null,
    familyError: error?.message || null,
    familyDataReady,
    refetchFamilies: refetch,
    hasFamily: families.length > 0,
    allFamilies: families,
    familiesLoading,
    hasFamilies: families.length > 0,
  };
}
