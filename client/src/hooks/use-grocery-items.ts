import { QueryClient, useQuery } from "@tanstack/react-query";
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

export async function fetchGroceryItems(familyId: string): Promise<GroceryItemsResult> {
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
}

export function groceryItemsQueryOptions(familyId: string) {
  return {
    queryKey: ["/api/grocery-items", familyId] as const,
    queryFn: () => fetchGroceryItems(familyId),
  };
}

export function prefetchGroceryItems(queryClient: QueryClient, familyId: string) {
  return queryClient.prefetchQuery({
    ...groceryItemsQueryOptions(familyId),
  });
}

export function useGroceryItems(familyId: string | null | undefined) {
  const query = useQuery<GroceryItemsResult>({
    queryKey: ["/api/grocery-items", familyId ?? null],
    queryFn: async () => {
      if (!familyId) {
        return withOfflineFlag([], false);
      }

      return fetchGroceryItems(familyId);
    },
    enabled: !!familyId,
    // Realtime and the visibility-resync hook keep this high-traffic query fresh
    // without adding a second focus-triggered request.
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  return {
    ...query,
    data: query.data ?? [],
    isOfflineData: query.data?.isOfflineData ?? false,
  };
}
