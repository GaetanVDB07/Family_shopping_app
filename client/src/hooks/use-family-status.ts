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

interface UserFamilyMembership {
  familyId: string;
  familyName: string;
  familyCode: string;
  role: string;
  joinedAt: string;
}

export function useFamilyStatus() {
  const { user, session } = useAuth();

  // Legacy single family query for backward compatibility
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

  // New multi-family query
  const { data: allFamilies, isLoading: familiesLoading } = useQuery<UserFamilyMembership[]>({
    queryKey: ["/api/user/families"],
    queryFn: async () => {
      if (!user || !session) {
        return [];
      }

      const response = await fetch('/api/user/families', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        return data || [];
      } else if (response.status === 404) {
        return [];
      } else {
        throw new Error('Failed to fetch user families');
      }
    },
    enabled: !!user && !!session,
    retry: 1,
  });

  return {
    // Legacy compatibility
    familyMembership: familyMembership?.family || null,
    loading,
    error: error?.message || null,
    hasFamily: !!familyMembership?.family,
    
    // New multi-family support
    allFamilies: allFamilies || [],
    familiesLoading,
    hasFamilies: (allFamilies?.length || 0) > 0,
  };
}
