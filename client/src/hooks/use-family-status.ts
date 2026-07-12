import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './use-auth';
import { seedBootstrapGroceryItems } from '@/lib/bootstrap-cache';
import type { AppBootstrapData } from '@shared/schema';

export function userFamiliesQueryKey(userId: string | null) {
  return ['/api/user/families', userId] as const;
}

export function useFamilyStatus() {
  const { user, session } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id ?? null;
  const preferredFamilyId = userId && 'localStorage' in globalThis
    ? globalThis.localStorage.getItem(`currentFamilyId:${userId}`)
    : null;

  const {
    data: bootstrapData,
    isLoading: queryLoading,
    isSuccess,
    error,
    refetch,
  } = useQuery<AppBootstrapData>({
    queryKey: userFamiliesQueryKey(userId),
    queryFn: async () => {
      if (!user || !session) {
        return { families: [], primaryFamilyId: null, groceryItems: [] };
      }

      const bootstrapUrl = preferredFamilyId
        ? `/api/bootstrap?familyId=${encodeURIComponent(preferredFamilyId)}`
        : '/api/bootstrap';
      const response = await fetch(bootstrapUrl, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json() as AppBootstrapData;
        if (data.primaryFamilyId) {
          seedBootstrapGroceryItems(
            queryClient,
            data.primaryFamilyId,
            data.groceryItems ?? [],
          );
        }
        return {
          families: data.families ?? [],
          primaryFamilyId: data.primaryFamilyId ?? null,
          groceryItems: data.groceryItems ?? [],
        };
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
  const families = bootstrapData?.families ?? [];
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
