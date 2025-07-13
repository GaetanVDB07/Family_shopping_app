import { useQuery } from '@tanstack/react-query';
import { useAuth } from './use-auth';

interface FamilyMembership {
  family: {
    id: string;
    name: string;
    code: string;
    role: string;
    joinedAt: string;
  } | null;
}

export function useFamilyStatus() {
  const { user, session } = useAuth();

  const { data: familyMembership, isLoading: loading, error } = useQuery<FamilyMembership | null>({
    queryKey: ["/api/user/family"],
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
        return data || null;
      } else if (response.status === 404) {
        // User is not in any family
        return null;
      } else {
        throw new Error('Failed to check family status');
      }
    },
    enabled: !!user && !!session, // Only run if user and session exist
    retry: 1,
  });

  return {
    familyMembership: familyMembership?.family || null,
    loading,
    error: error?.message || null,
    hasFamily: !!familyMembership?.family,
  };
}
