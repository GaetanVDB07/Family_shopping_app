import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { GroceryItem } from "@shared/schema";
import type { GroceryItemEditValues } from "@/components/grocery-item";
import { apiRequest } from "@/lib/queryClient";
import {
  enqueueGroceryMutation,
  getQueuedGroceryMutations,
  removeQueuedAddMutation,
  replayGroceryMutationQueue,
  updateQueuedAddMutation,
} from "@/lib/offline-grocery-queue";

type GroceryItemsQueryCache = (GroceryItem[] & { isOfflineData?: boolean }) | undefined;

interface AddItemOptions {
  notes?: string;
  quantity?: string;
  unit?: string;
}

interface UseOfflineGrocerySyncOptions {
  familyId: string | null | undefined;
  isOnline: boolean;
  isOfflineData: boolean;
  refetch: () => unknown;
  userId: string;
  userLabel: string;
}

function groceryItemsQueryKey(familyId: string | null | undefined) {
  return ["/api/grocery-items", familyId] as const;
}

function mapGroceryItemsQueryData(
  items: GroceryItemsQueryCache,
  mapItems: (items: GroceryItem[]) => GroceryItem[],
): GroceryItem[] {
  return Object.assign(mapItems(items ?? []), {
    isOfflineData: items?.isOfflineData ?? false,
  });
}

export function useOfflineGrocerySync({
  familyId,
  isOfflineData,
  isOnline,
  refetch,
  userId,
  userLabel,
}: UseOfflineGrocerySyncOptions) {
  const queryClient = useQueryClient();
  const [queuedMutationCount, setQueuedMutationCount] = useState(0);
  const [isSyncingQueuedChanges, setIsSyncingQueuedChanges] = useState(false);
  const [syncFailed, setSyncFailed] = useState(false);

  const refreshQueuedMutationCount = useCallback(() => {
    if (!familyId) {
      setQueuedMutationCount(0);
      return;
    }

    setQueuedMutationCount(getQueuedGroceryMutations(familyId).length);
  }, [familyId]);

  useEffect(() => {
    refreshQueuedMutationCount();
  }, [refreshQueuedMutationCount]);

  useEffect(() => {
    if (!familyId || !isOnline || isOfflineData || queuedMutationCount === 0) {
      return;
    }

    let isActive = true;

    const syncQueuedChanges = async () => {
      setIsSyncingQueuedChanges(true);
      setSyncFailed(false);

      const result = await replayGroceryMutationQueue(familyId, apiRequest);

      if (!isActive) {
        return;
      }

      setQueuedMutationCount(result.remaining);
      setSyncFailed(result.failed);
      setIsSyncingQueuedChanges(false);

      if (result.replayed > 0) {
        void refetch();
      }
    };

    void syncQueuedChanges();

    return () => {
      isActive = false;
    };
  }, [familyId, isOfflineData, isOnline, queuedMutationCount, refetch]);

  const shouldQueue = !isOnline || isOfflineData;

  const queueAddItem = useCallback(
    (name: string, options?: AddItemOptions): boolean => {
      if (!shouldQueue || !familyId) {
        return false;
      }

      const tempId = -Date.now();
      const offlineItem: GroceryItem = {
        id: tempId,
        name,
        quantity: options?.quantity ?? null,
        unit: options?.unit ?? null,
        notes: options?.notes ?? null,
        completed: false,
        addedBy: userLabel,
        addedByName: userLabel,
        familyId,
        addedAt: new Date(),
        sortOrder: 0,
        completedAt: null,
        archivedAt: null,
        createdAt: new Date(),
      };

      queryClient.setQueryData(groceryItemsQueryKey(familyId), (old: GroceryItemsQueryCache) => {
        return mapGroceryItemsQueryData(old, (oldItems) => [...oldItems, offlineItem]);
      });

      enqueueGroceryMutation(familyId, {
        type: "add",
        payload: {
          tempId,
          name,
          quantity: options?.quantity ?? null,
          unit: options?.unit ?? null,
          notes: options?.notes ?? null,
          addedBy: userId,
          addedByName: userLabel,
          completed: false,
        },
      });
      refreshQueuedMutationCount();
      return true;
    },
    [familyId, queryClient, refreshQueuedMutationCount, shouldQueue, userId, userLabel],
  );

  const queueToggleItem = useCallback(
    (item: GroceryItem): boolean => {
      if (!shouldQueue || !familyId) {
        return false;
      }

      const completed = !item.completed;
      const updatedQueuedAdd =
        item.id < 0 && updateQueuedAddMutation(familyId, item.id, { completed });

      queryClient.setQueryData(groceryItemsQueryKey(familyId), (old: GroceryItemsQueryCache) => {
        return mapGroceryItemsQueryData(old, (oldItems) =>
          oldItems.map((entry) => (entry.id === item.id ? { ...entry, completed } : entry)),
        );
      });

      if (!updatedQueuedAdd) {
        enqueueGroceryMutation(familyId, {
          type: "toggle",
          payload: { id: item.id, completed },
        });
      }

      refreshQueuedMutationCount();
      return true;
    },
    [familyId, queryClient, refreshQueuedMutationCount, shouldQueue],
  );

  const queueUpdateItem = useCallback(
    (id: number, updates: GroceryItemEditValues): boolean => {
      if (!shouldQueue || !familyId) {
        return false;
      }

      const updatedQueuedAdd = id < 0 && updateQueuedAddMutation(familyId, id, updates);

      queryClient.setQueryData(groceryItemsQueryKey(familyId), (old: GroceryItemsQueryCache) => {
        return mapGroceryItemsQueryData(old, (oldItems) =>
          oldItems.map((entry) => (entry.id === id ? { ...entry, ...updates } : entry)),
        );
      });

      if (!updatedQueuedAdd) {
        enqueueGroceryMutation(familyId, {
          type: "edit",
          payload: { id, updates },
        });
      }

      refreshQueuedMutationCount();
      return true;
    },
    [familyId, queryClient, refreshQueuedMutationCount, shouldQueue],
  );

  const queueDeleteItem = useCallback(
    (item: GroceryItem): boolean => {
      if (!shouldQueue || !familyId) {
        return false;
      }

      const removedQueuedAdd =
        item.id < 0 && removeQueuedAddMutation(familyId, item.id);

      queryClient.setQueryData(groceryItemsQueryKey(familyId), (old: GroceryItemsQueryCache) => {
        return mapGroceryItemsQueryData(old, (oldItems) =>
          oldItems.filter((entry) => entry.id !== item.id),
        );
      });

      if (!removedQueuedAdd) {
        enqueueGroceryMutation(familyId, {
          type: "delete",
          payload: { id: item.id },
        });
      }

      refreshQueuedMutationCount();
      return true;
    },
    [familyId, queryClient, refreshQueuedMutationCount, shouldQueue],
  );

  return {
    queuedMutationCount,
    isSyncingQueuedChanges,
    syncFailed,
    queueAddItem,
    queueToggleItem,
    queueUpdateItem,
    queueDeleteItem,
  };
}
