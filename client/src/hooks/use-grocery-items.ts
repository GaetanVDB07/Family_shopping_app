import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { GroceryItem } from "@shared/schema";

export function useGroceryItems(familyId: string | null | undefined) {
  return useQuery<GroceryItem[]>({
    queryKey: ["/api/grocery-items", familyId],
    queryFn: async () => {
      if (!familyId) return [];
      const response = await apiRequest("GET", `/api/grocery-items/${familyId}`);
      return response.json();
    },
    enabled: !!familyId,
    // The global QueryClient disables window-focus refetch and sets staleTime
    // to Infinity. For the grocery list we want a fresh fetch whenever the user
    // returns to the tab, so we opt this query in explicitly.
    refetchOnWindowFocus: "always",
  });
}
