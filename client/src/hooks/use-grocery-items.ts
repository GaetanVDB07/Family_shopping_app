import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  getCachedGroceryItems,
  setCachedGroceryItems,
} from "@/lib/offline-grocery-cache";
import { applyQueuedGroceryMutations } from "@/lib/offline-grocery-pending";
import { GroceryItem } from "@shared/schema";

type GroceryItemsResult = GroceryItem[] & { isOfflineData?: boolean };

function withOfflineFlag(
  items: GroceryItem[],
  isOfflineData: boolean,
): GroceryItemsResult {
  return Object.assign([...items], { isOfflineData });
}

function isAuthorizationError(error: unknown): boolean {
  const status = (error as { status?: unknown })?.status;
  return status === 401 || status === 403;
}

export function useGroceryItems(familyId: string | null | undefined) {
  const query = useQuery<GroceryItemsResult>({
    queryKey: ["/api/grocery-items", familyId],
    queryFn: async () => {
      if (!familyId) {
        return withOfflineFlag([], false);
      }

      try {
        const response = await apiRequest(
          "GET",
          `/api/grocery-items/${familyId}`,
        );
        const items = (await response.json()) as GroceryItem[];
        setCachedGroceryItems(familyId, items);
        return withOfflineFlag(applyQueuedGroceryMutations(familyId, items), false);
      } catch (error) {
        if (isAuthorizationError(error)) {
          throw error;
        }

        const cachedItems = getCachedGroceryItems(familyId);
        if (cachedItems) {
          return withOfflineFlag(
            applyQueuedGroceryMutations(familyId, cachedItems),
            true,
          );
        }

        throw error;
      }
    },
    enabled: !!familyId,
    // The global QueryClient disables window-focus refetch and sets staleTime
    // to Infinity. For the grocery list we want a fresh fetch whenever the user
    // returns to the tab, so we opt this query in explicitly.
    refetchOnWindowFocus: "always",
  });

  return {
    ...query,
    data: query.data ?? [],
    isOfflineData: query.data?.isOfflineData ?? false,
  };
}
