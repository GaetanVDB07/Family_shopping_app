import { useState, useEffect } from 'react';
import { useFamilyStatus } from './use-family-status';

const CURRENT_FAMILY_KEY = 'currentFamilyId';

export function useCurrentFamily() {
  const { allFamilies, familiesLoading } = useFamilyStatus();
  const [currentFamilyId, setCurrentFamilyId] = useState<string | null>(() => {
    // Try to get from localStorage first
    return localStorage.getItem(CURRENT_FAMILY_KEY);
  });

  // Set initial family ID when families are loaded
  useEffect(() => {
    if (!familiesLoading && allFamilies.length > 0 && !currentFamilyId) {
      // If no stored family ID, use the first family
      const firstFamilyId = allFamilies[0].familyId;
      setCurrentFamilyId(firstFamilyId);
      localStorage.setItem(CURRENT_FAMILY_KEY, firstFamilyId);
    }
  }, [allFamilies, familiesLoading, currentFamilyId]);

  // Verify the stored family ID is still valid
  useEffect(() => {
    if (!familiesLoading && allFamilies.length > 0 && currentFamilyId) {
      const familyExists = allFamilies.some(f => f.familyId === currentFamilyId);
      if (!familyExists) {
        // If stored family no longer exists, use the first available family
        const firstFamilyId = allFamilies[0].familyId;
        setCurrentFamilyId(firstFamilyId);
        localStorage.setItem(CURRENT_FAMILY_KEY, firstFamilyId);
      }
    }
  }, [allFamilies, familiesLoading, currentFamilyId]);

  const updateCurrentFamily = (familyId: string) => {
    setCurrentFamilyId(familyId);
    localStorage.setItem(CURRENT_FAMILY_KEY, familyId);
  };

  const currentFamily = allFamilies.find(f => f.familyId === currentFamilyId);

  return {
    currentFamilyId,
    currentFamily,
    updateCurrentFamily,
    isLoading: familiesLoading
  };
}
