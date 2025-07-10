import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './use-auth';
import { useEffect } from 'react';

interface FamilyMembership {
  familyId: string;
  familyName: string;
  role: string;
}

export function useFamilyStatus() {
  const { user, session } = useAuth();
  const queryClient = useQueryClient();

  // Invalidate family status query when user changes
  useEffect(() => {
    if (user) {
      queryClient.invalidateQueries({ queryKey: ["/api/user/family"] });
    }
  }, [user?.id, queryClient]);

  const { data: familyMembership, isLoading: loading, error } = useQuery<FamilyMembership | null>({
    queryKey: ["/api/user/family", user?.id], // Include user ID in query key for better caching
    queryFn: async () => {
      if (!user || !session) {
        return null;
      }

      const response = await fetch('/api/user/family', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        return data.family || null; // Return the family property, not the whole object
      } else if (response.status === 404) {
        // User is not in any family
        return null;
      } else {
        throw new Error('Failed to check family status');
      }
    },
    enabled: !!user && !!session, // Only run if user and session exist
    retry: 1,
    staleTime: 0, // Always consider data stale so it gets refetched on user change
  });

  return {
    familyMembership,
    loading,
    error: error?.message || null,
    hasFamily: !!familyMembership,
  };
}
