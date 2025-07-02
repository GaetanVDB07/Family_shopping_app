import { useState, useEffect } from 'react';
import { useAuth } from './use-auth';

interface FamilyMembership {
  familyId: string;
  familyName: string;
  role: string;
}

export function useFamilyStatus() {
  const { user, session } = useAuth();
  const [familyMembership, setFamilyMembership] = useState<FamilyMembership | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkFamilyMembership() {
      if (!user || !session) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/user/family', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          setFamilyMembership(data || null);
        } else if (response.status === 404) {
          // User is not in any family
          setFamilyMembership(null);
        } else {
          setError('Failed to check family status');
        }
      } catch (err) {
        setError('Failed to check family status');
        console.error('Error checking family status:', err);
      } finally {
        setLoading(false);
      }
    }

    checkFamilyMembership();
  }, [user, session]);

  return {
    familyMembership,
    loading,
    error,
    hasFamily: !!familyMembership,
  };
}
