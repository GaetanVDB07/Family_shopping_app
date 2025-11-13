import { useState, useEffect } from 'react';
import { useFamilyStatus } from './use-family-status';
import { useAuth } from './use-auth';

const CURRENT_FAMILY_KEY = 'currentFamilyId';

export function useCurrentFamily() {
  const { user } = useAuth();
  const { allFamilies, familiesLoading } = useFamilyStatus();
  const storageKey = user ? `${CURRENT_FAMILY_KEY}:${user.id}` : null;
  const storage = 'localStorage' in globalThis ? globalThis.localStorage : null;
  const [currentFamilyId, setCurrentFamilyId] = useState<string | null>(() => {
    if (!storageKey || !storage) {
      return null;
    }
    return storage.getItem(storageKey);
  });

  // Load stored family whenever the authenticated user changes
  useEffect(() => {
    if (!storageKey || !storage) {
      setCurrentFamilyId(null);
      return;
    }

    const storedId = storage.getItem(storageKey);
    setCurrentFamilyId(storedId);
  }, [storageKey, storage]);

  // Set initial family ID when families are loaded
  useEffect(() => {
    if (!familiesLoading && allFamilies.length > 0 && !currentFamilyId && storageKey && storage) {
      // If no stored family ID, use the first family
      const firstFamilyId = allFamilies[0].familyId;
      setCurrentFamilyId(firstFamilyId);
      storage.setItem(storageKey, firstFamilyId);
    }
  }, [allFamilies, familiesLoading, currentFamilyId, storageKey, storage]);

  // Verify the stored family ID is still valid
  useEffect(() => {
    if (!familiesLoading && allFamilies.length > 0 && currentFamilyId && storageKey && storage) {
      const familyExists = allFamilies.some(f => f.familyId === currentFamilyId);
      if (!familyExists) {
        // If stored family no longer exists, use the first available family
        const firstFamilyId = allFamilies[0].familyId;
        setCurrentFamilyId(firstFamilyId);
        storage.setItem(storageKey, firstFamilyId);
      }
    }
  }, [allFamilies, familiesLoading, currentFamilyId, storageKey, storage]);

  // Clear current family if the user has none available
  useEffect(() => {
    if (!familiesLoading && allFamilies.length === 0 && currentFamilyId) {
      setCurrentFamilyId(null);
      if (storageKey && storage) {
        storage.removeItem(storageKey);
      }
    }
  }, [familiesLoading, allFamilies, currentFamilyId, storageKey, storage]);

  const updateCurrentFamily = (familyId: string) => {
    setCurrentFamilyId(familyId);
    if (storageKey && storage) {
      storage.setItem(storageKey, familyId);
    }
  };

  const currentFamily = allFamilies.find(f => f.familyId === currentFamilyId);

  return {
    currentFamilyId,
    currentFamily,
    updateCurrentFamily,
    isLoading: familiesLoading
  };
}
