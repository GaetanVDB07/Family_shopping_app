import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { GroceryItem } from "@shared/schema";

type UseGroceryHistoryOptions = {
  enabled?: boolean;
};

export function useGroceryHistory(
  familyId: string | null | undefined,
  options: UseGroceryHistoryOptions = {},
) {
  const suggestionsEnabled = options.enabled ?? false;

  const query = useQuery<GroceryItem[]>({
    queryKey: ["/api/grocery-items", familyId, "history"],
    queryFn: async () => {
      if (!familyId) {
        return [];
      }

      const response = await apiRequest(
        "GET",
        `/api/grocery-items/${familyId}/history`,
      );
      return (await response.json()) as GroceryItem[];
    },
    enabled: !!familyId && suggestionsEnabled,
    staleTime: 60_000,
  });

  return {
    ...query,
    data: query.data ?? [],
  };
}
