import type { QueryClient } from '@tanstack/react-query';
import type { GroceryItem } from '@shared/schema';
import { setCachedGroceryItems } from './offline-grocery-cache';
import { applyQueuedGroceryMutations } from './offline-grocery-pending';

export function seedBootstrapGroceryItems(
  queryClient: QueryClient,
  familyId: string,
  items: GroceryItem[],
) {
  setCachedGroceryItems(familyId, items);
  queryClient.setQueryData(
    ['/api/grocery-items', familyId],
    Object.assign([...applyQueuedGroceryMutations(familyId, items)], {
      isOfflineData: false,
    }),
  );
}
