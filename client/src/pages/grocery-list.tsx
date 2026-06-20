import { useState, useCallback, useMemo, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { GroceryItem, InsertGroceryItem } from "@shared/schema";
import { useGroceryItems } from "@/hooks/use-grocery-items";
import { useGroceryHistory } from "@/hooks/use-grocery-history";
import { useFamilyMemberNames } from "@/hooks/use-family-member-names";
import { resolveAddedByDisplayName } from "@/lib/family-member-names";
import { GroceryItemComponent, GroceryItemEditValues } from "@/components/grocery-item";
import { AddItemForm } from "@/components/add-item-form";
import { SortableGroceryList } from "@/components/sortable-grocery-list";
import { sortGroceryItems } from "@/lib/grocery-item-sort";
import { DeleteAllConfirmationDialog } from "@/components/delete-all-confirmation-dialog";
import { UserMenu } from "@/components/user-menu";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useWebSocket } from "@/hooks/use-websocket";
import { useAuth } from "@/hooks/use-auth";
import { useFamilyStatus } from "@/hooks/use-family-status";
import { useCurrentFamily } from "@/hooks/use-current-family";
import { useToast } from "@/hooks/use-toast";
import { toastApiError } from "@/lib/api-error";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { useOfflineGrocerySync } from "@/hooks/use-offline-grocery-sync";
import { Search, ShoppingCart, Trash2, RefreshCw, Users, CheckCircle, Circle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function GroceryList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [historySuggestionsActive, setHistorySuggestionsActive] = useState(false);
  const [, setLocation] = useLocation();
  const params = useParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const { allFamilies, familiesLoading } = useFamilyStatus();
  const { currentFamilyId, currentFamily, updateCurrentFamily } = useCurrentFamily();
  const isOnline = useOnlineStatus();

  // Update current family if URL param is different (for direct navigation)
  useEffect(() => {
    if (!params.familyId || params.familyId === currentFamilyId || familiesLoading) {
      return;
    }

    const belongsToFamily = allFamilies.some((family) => family.familyId === params.familyId);

    if (belongsToFamily) {
      updateCurrentFamily(params.familyId);
      return;
    }

    if (currentFamilyId) {
      setLocation(`/grocery-list/${currentFamilyId}`);
    } else {
      setLocation("/families");
    }
  }, [params.familyId, currentFamilyId, familiesLoading, allFamilies, updateCurrentFamily, setLocation]);

  const familyId = currentFamilyId || params.familyId;
  const memberNames = useFamilyMemberNames(familyId);

  // Fetch grocery items for the specific family
  const { data: items = [], isLoading, refetch, isOfflineData } = useGroceryItems(familyId);
  const { data: historyItems = [] } = useGroceryHistory(familyId, {
    enabled: historySuggestionsActive,
  });
  const {
    queuedMutationCount,
    isSyncingQueuedChanges,
    syncFailed,
    queueAddItem,
    queueToggleItem,
    queueUpdateItem,
    queueDeleteItem,
  } = useOfflineGrocerySync({
    familyId,
    isOfflineData,
    isOnline,
    refetch,
    userId: user?.id || "",
    userLabel: user?.user_metadata?.name || user?.email || "Offline",
  });

  // Pull to refresh functionality
  const { isPulling, isRefreshing, pullDistance, shouldShowIndicator } = usePullToRefresh({
    onRefresh: async () => {
      await refetch();
    },
    threshold: 80,
  });

  // WebSocket connection for real-time updates
  useWebSocket({
    familyId,
    onResync: () => {
      void refetch();
    },
    onItemAdded: (item) => {
      console.log(`[${new Date().toISOString()}] Client: WebSocket itemAdded:`, item);
      const resolvedItem = {
        ...item,
        addedBy: resolveAddedByDisplayName(item.addedBy, memberNames),
      };
      queryClient.setQueryData(["/api/grocery-items", familyId], (old: GroceryItem[] = []) => {
        const exists = old.some((existingItem) => existingItem.id === resolvedItem.id);
        console.log(`[${new Date().toISOString()}] Client: WebSocket item exists in cache:`, exists, 'Item ID:', resolvedItem.id);
        if (exists) {
          console.log(`[${new Date().toISOString()}] Client: WebSocket duplicate item prevented:`, resolvedItem.id);
          return old;
        }
        return sortGroceryItems([...old, resolvedItem]);
      });
    },
    onItemUpdated: (updatedItem) => {
      console.log(`[${new Date().toISOString()}] Client: WebSocket itemUpdated:`, updatedItem);
      const resolvedItem = {
        ...updatedItem,
        addedBy: resolveAddedByDisplayName(updatedItem.addedBy, memberNames),
      };
      queryClient.setQueryData(["/api/grocery-items", familyId], (old: GroceryItem[] = []) => {
        const updated = old.map((item) => (
          item.id === resolvedItem.id ? resolvedItem : item
        ));
        console.log(`[${new Date().toISOString()}] Client: WebSocket updated ${old.length} items`);
        return sortGroceryItems(updated);
      });
    },
    onItemDeleted: (id) => {
      console.log(`[${new Date().toISOString()}] Client: WebSocket itemDeleted:`, id);
      queryClient.setQueryData(["/api/grocery-items", familyId], (old: GroceryItem[] = []) => {
        const filtered = old.filter((item) => item.id !== id);
        console.log(`[${new Date().toISOString()}] Client: WebSocket deleted item ${id}, ${old.length} -> ${filtered.length} items`);
        return filtered;
      });
    },
    onSync: (syncedItems) => {
      console.log(`[${new Date().toISOString()}] Client: WebSocket sync with ${syncedItems.length} items`);
      // Use a more robust sync that prevents duplicates
      queryClient.setQueryData(["/api/grocery-items", familyId], (old: GroceryItem[] = []) => {
        console.log(`[${new Date().toISOString()}] Client: WebSocket replacing ${old.length} items with ${syncedItems.length} synced items`);
        return syncedItems;
      });
    },
  });

  // Add item mutation
  const addItemMutation = useMutation({
    mutationFn: async (data: InsertGroceryItem) => {
      console.log(`[${new Date().toISOString()}] Client: Starting mutation for item:`, data);
      const response = await apiRequest("POST", "/api/grocery-items", { ...data, familyId });
      const result = await response.json();
      console.log(`[${new Date().toISOString()}] Client: Mutation response:`, result);
      return result;
    },
    onSuccess: (newItem: GroceryItem) => {
      console.log(`[${new Date().toISOString()}] Client: Mutation success`);
      // Always update cache to ensure UI feedback - with better duplicate prevention
      queryClient.setQueryData(["/api/grocery-items", familyId], (old: GroceryItem[] = []) => {
        // Check if item already exists to prevent duplicates
        const exists = old.some(item => item.id === newItem.id);
        console.log(`[${new Date().toISOString()}] Client: Item exists in cache:`, exists, 'Item ID:', newItem.id, 'Cache size:', old.length);
        if (exists) {
          console.log(`[${new Date().toISOString()}] Client: Mutation duplicate prevented:`, newItem.id);
          return old; // Return unchanged to prevent duplicate
        }
        console.log(`[${new Date().toISOString()}] Client: Adding new item to cache:`, newItem.id);
        return sortGroceryItems([...old, newItem]);
      });
    },
    onError: (error) => {
      console.log(`[${new Date().toISOString()}] Client: Mutation error`);
      toastApiError(toast, error, "Kon item niet toevoegen. Probeer het opnieuw.");
    },
  });

  // Toggle item mutation
  const toggleItemMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: number; completed: boolean }) => {
      const response = await apiRequest("PATCH", `/api/grocery-items/${id}`, { completed, familyId });
      return response.json();
    },
    onMutate: async ({ id, completed }) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ["/api/grocery-items", familyId] });

      // Snapshot the previous value
      const previousItems = queryClient.getQueryData<GroceryItem[]>(["/api/grocery-items", familyId]);

      // Optimistically update to the new value
      queryClient.setQueryData(["/api/grocery-items", familyId], (old: GroceryItem[] = []) =>
        old.map((item) => (item.id === id ? { ...item, completed } : item))
      );

      // Return a context object with the snapshotted value
      return { previousItems };
    },
    onSuccess: (updatedItem: GroceryItem) => {
      queryClient.setQueryData(["/api/grocery-items", familyId], (old: GroceryItem[] = []) => {
        const isVisible = !updatedItem.archivedAt;
        const exists = old.some((item) => item.id === updatedItem.id);

        if (!isVisible) {
          return old.filter((item) => item.id !== updatedItem.id);
        }

        if (exists) {
          return old.map((item) => (item.id === updatedItem.id ? updatedItem : item));
        }

        return [...old, updatedItem];
      });
      void queryClient.invalidateQueries({ queryKey: ["/api/grocery-items", familyId, "history"] });
    },
    onError: (err, { id }, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousItems) {
        queryClient.setQueryData(["/api/grocery-items", familyId], context.previousItems);
      }
      toastApiError(toast, err, "Kon item niet bijwerken. Probeer het opnieuw.");
    },
  });

  // Edit item mutation
  const editItemMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: GroceryItemEditValues }) => {
      const response = await apiRequest("PATCH", `/api/grocery-items/${id}`, { ...updates, familyId });
      return response.json();
    },
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: ["/api/grocery-items", familyId] });

      const previousItems = queryClient.getQueryData<GroceryItem[]>(["/api/grocery-items", familyId]);

      queryClient.setQueryData(["/api/grocery-items", familyId], (old: GroceryItem[] = []) =>
        old.map((item) => (item.id === id ? { ...item, ...updates } : item))
      );

      return { previousItems };
    },
    onSuccess: (updatedItem: GroceryItem) => {
      queryClient.setQueryData(["/api/grocery-items", familyId], (old: GroceryItem[] = []) =>
        old.map((item) => (item.id === updatedItem.id ? updatedItem : item))
      );
    },
    onError: (err, variables, context) => {
      if (context?.previousItems) {
        queryClient.setQueryData(["/api/grocery-items", familyId], context.previousItems);
      }
      toastApiError(toast, err, "Kon item niet bewerken. Probeer het opnieuw.");
    },
  });

  // Delete item mutation
  const deleteItemMutation = useMutation({
    mutationFn: async (id: number) => {
      const familyQuery = familyId ? `?familyId=${encodeURIComponent(familyId)}` : "";
      await apiRequest("DELETE", `/api/grocery-items/${id}${familyQuery}`);
      return id;
    },
    onMutate: async (id: number) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["/api/grocery-items", familyId] });

      // Snapshot the previous value
      const previousItems = queryClient.getQueryData<GroceryItem[]>(["/api/grocery-items", familyId]);

      // Optimistically remove the item
      queryClient.setQueryData(["/api/grocery-items", familyId], (old: GroceryItem[] = []) =>
        old.filter((item) => item.id !== id)
      );

      return { previousItems };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["/api/grocery-items", familyId, "history"] });
    },
    onError: (err, id, context) => {
      // If the mutation fails, roll back
      if (context?.previousItems) {
        queryClient.setQueryData(["/api/grocery-items", familyId], context.previousItems);
      }
      toastApiError(toast, err, "Kon item niet verwijderen. Probeer het opnieuw.");
    },
  });

  // Delete all items mutation
  const deleteAllItemsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", `/api/grocery-items/delete-all/${familyId}`);
      return response.json();
    },
    onMutate: async () => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["/api/grocery-items", familyId] });

      // Snapshot the previous value
      const previousItems = queryClient.getQueryData<GroceryItem[]>(["/api/grocery-items", familyId]);

      // Optimistically clear all items
      queryClient.setQueryData(["/api/grocery-items", familyId], []);

      return { previousItems };
    },
    onSuccess: (response) => {
      setShowDeleteAllDialog(false);
      void queryClient.invalidateQueries({ queryKey: ["/api/grocery-items", familyId, "history"] });
      const archivedCount = response.archivedCount ?? 0;
      const deletedCount = response.deletedCount ?? 0;
      const description = archivedCount > 0
        ? `${deletedCount} openstaande items verwijderd. ${archivedCount} afgevinkte items bewaard in je geschiedenis.`
        : `${deletedCount} items verwijderd van de lijst`;
      toast({
        title: "Lijst gewist",
        description,
      });
    },
    onError: (err, variables, context) => {
      // If the mutation fails, roll back
      if (context?.previousItems) {
        queryClient.setQueryData(["/api/grocery-items", familyId], context.previousItems);
      }
      setShowDeleteAllDialog(false);
      toastApiError(toast, err, "Kon lijst niet wissen. Probeer het opnieuw.");
    },
  });

  // Mark all items as completed mutation
  const markAllCompletedMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("PATCH", `/api/grocery-items/mark-all-completed/${familyId}`);
      return response.json();
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["/api/grocery-items", familyId] });
      const previousItems = queryClient.getQueryData<GroceryItem[]>(["/api/grocery-items", familyId]);
      
      // Optimistically mark all items as completed
      queryClient.setQueryData(["/api/grocery-items", familyId], (old: GroceryItem[] = []) =>
        old.map((item) => ({ ...item, completed: true }))
      );
      
      return { previousItems };
    },
    onSuccess: (response) => {
      // No toast notification for bulk actions
    },
    onError: (err, variables, context) => {
      if (context?.previousItems) {
        queryClient.setQueryData(["/api/grocery-items", familyId], context.previousItems);
      }
      toastApiError(toast, err, "Kon items niet markeren. Probeer het opnieuw.");
    },
  });

  // Mark all items as pending mutation
  const markAllPendingMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("PATCH", `/api/grocery-items/mark-all-pending/${familyId}`);
      return response.json();
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["/api/grocery-items", familyId] });
      const previousItems = queryClient.getQueryData<GroceryItem[]>(["/api/grocery-items", familyId]);
      
      // Optimistically mark all items as pending
      queryClient.setQueryData(["/api/grocery-items", familyId], (old: GroceryItem[] = []) =>
        old.map((item) => ({ ...item, completed: false }))
      );
      
      return { previousItems };
    },
    onSuccess: (response) => {
      // No toast notification for bulk actions
    },
    onError: (err, variables, context) => {
      if (context?.previousItems) {
        queryClient.setQueryData(["/api/grocery-items", familyId], context.previousItems);
      }
      toastApiError(toast, err, "Kon items niet markeren. Probeer het opnieuw.");
    },
  });

  // Reorder items mutation
  const reorderItemsMutation = useMutation({
    mutationFn: async (orderedIds: number[]) => {
      const response = await apiRequest("PATCH", "/api/grocery-items/reorder", { familyId, orderedIds });
      return response.json() as Promise<{ items: GroceryItem[] }>;
    },
    onMutate: async (orderedIds) => {
      await queryClient.cancelQueries({ queryKey: ["/api/grocery-items", familyId] });
      const previousItems = queryClient.getQueryData<GroceryItem[]>(["/api/grocery-items", familyId]);

      queryClient.setQueryData(["/api/grocery-items", familyId], (old: GroceryItem[] = []) => {
        const sortOrderById = new Map(orderedIds.map((id, index) => [id, index]));
        return sortGroceryItems(
          old.map((item) =>
            sortOrderById.has(item.id)
              ? { ...item, sortOrder: sortOrderById.get(item.id)! }
              : item,
          ),
        );
      });

      return { previousItems };
    },
    onSuccess: (response) => {
      queryClient.setQueryData(["/api/grocery-items", familyId], response.items);
    },
    onError: (err, _orderedIds, context) => {
      if (context?.previousItems) {
        queryClient.setQueryData(["/api/grocery-items", familyId], context.previousItems);
      }
      toastApiError(toast, err, "Kon volgorde niet opslaan. Probeer het opnieuw.");
    },
  });

  // Filter and sort items (with additional deduplication safety)
  const filteredItems = useMemo(() => {
    // First, ensure no duplicates exist (safety net)
    const uniqueItems = items.filter((item, index, self) => 
      self.findIndex(i => i.id === item.id) === index
    );
    
    if (uniqueItems.length !== items.length) {
      console.warn(`🔧 Filtered out ${items.length - uniqueItems.length} duplicate items from render`);
    }
    
    const filtered = uniqueItems.filter((item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    const pending = filtered
      .filter((item) => !item.completed)
      .sort((a, b) => a.sortOrder - b.sortOrder || new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime());
    const completed = filtered.filter((item) => item.completed);
    
    return { pending, completed };
  }, [items, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    const total = items.length;
    const completed = items.filter((item) => item.completed).length;
    const remaining = total - completed;
    const completionPercent = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return { total, completed, remaining, completionPercent };
  }, [items]);

  const handleAddItem = useCallback(async (
    name: string,
    addedBy: string,
    options?: { notes?: string; quantity?: string; unit?: string },
  ) => {
    console.log(`[${new Date().toISOString()}] Client: handleAddItem called with name: "${name}"`);
    if (queueAddItem(name, options)) {
      return;
    }

    await addItemMutation.mutateAsync({ 
      name, 
      quantity: options?.quantity ?? null,
      unit: options?.unit ?? null,
      notes: options?.notes ?? null,
      completed: false,
      addedBy: user?.id || "" // Use current user's ID
    });
  }, [addItemMutation, queueAddItem, user?.id]);

  const handleReactivateItem = useCallback((id: number) => {
    const activeItem = items.find((entry) => entry.id === id);
    const historyItem = historyItems.find((entry) => entry.id === id);

    if (!activeItem && !historyItem) {
      return;
    }

    if (activeItem && queueToggleItem(activeItem)) {
      return;
    }

    toggleItemMutation.mutate({ id, completed: false });
  }, [historyItems, items, queueToggleItem, toggleItemMutation]);

  const handleToggleItem = useCallback((id: number) => {
    const item = items.find((item) => item.id === id);
    if (item) {
      if (queueToggleItem(item)) {
        return;
      }

      toggleItemMutation.mutate({ id, completed: !item.completed });
    }
  }, [items, queueToggleItem, toggleItemMutation]);

  const handleUpdateItem = useCallback(async (id: number, updates: GroceryItemEditValues) => {
    if (queueUpdateItem(id, updates)) {
      return;
    }

    await editItemMutation.mutateAsync({ id, updates });
  }, [editItemMutation, queueUpdateItem]);

  const handleDeleteItem = useCallback((item: GroceryItem) => {
    if (queueDeleteItem(item)) {
      return;
    }

    // Delete immediately without confirmation
    deleteItemMutation.mutate(item.id);
  }, [deleteItemMutation, queueDeleteItem]);

  const handleDeleteAll = useCallback(() => {
    setShowDeleteAllDialog(true);
  }, []);

  const handleConfirmDeleteAll = useCallback(() => {
    deleteAllItemsMutation.mutate();
  }, [deleteAllItemsMutation]);

  const handleMarkAllCompleted = useCallback(() => {
    markAllCompletedMutation.mutate();
  }, [markAllCompletedMutation]);

  const handleMarkAllPending = useCallback(() => {
    markAllPendingMutation.mutate();
  }, [markAllPendingMutation]);

  const handleReorderItems = useCallback((orderedIds: number[]) => {
    if (!isOnline || isOfflineData || reorderItemsMutation.isPending) {
      return;
    }

    reorderItemsMutation.mutate(orderedIds);
  }, [isOfflineData, isOnline, reorderItemsMutation]);

  const canReorderItems = isOnline && !isOfflineData && !searchQuery;

  if (isLoading) {
    return (
      <div className="max-w-md mx-auto bg-background min-h-screen shadow-lg">
        <div className="bg-primary text-white p-6 sticky top-0 z-50 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <ShoppingCart className="text-2xl" />
              <div>
                <h1 className="text-xl font-semibold">
                  {currentFamily?.familyName || 'Familie Boodschappenlijst'}
                </h1>
              </div>
            </div>
          </div>
        </div>
        <div className="p-6 space-y-6">
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-8 w-full" />
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  // Show families page if no family selected
  if (!familyId) {
    return (
      <div className="max-w-md mx-auto bg-background min-h-screen shadow-lg">
        <div className="bg-primary text-white p-6 sticky top-0 z-50 shadow-md">
          <h1 className="text-xl font-semibold">Geen familie geselecteerd</h1>
        </div>
        <div className="p-6 text-center">
          <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">Selecteer een familie om de boodschappenlijst te bekijken.</p>
          <Button onClick={() => setLocation("/families")}>
            Ga naar Families
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-background min-h-screen shadow-lg relative">
      {/* Pull to refresh indicator */}
      {shouldShowIndicator && (
        <div 
          className="absolute top-0 left-0 right-0 z-40 flex items-center justify-center pt-4 transition-all duration-300"
          style={{
            transform: `translateY(${isRefreshing ? '0px' : `-${Math.max(0, 60 - pullDistance)}px`})`,
            opacity: isRefreshing ? 1 : Math.min(1, pullDistance / 40),
          }}
        >
          <div className="bg-card rounded-full p-3 shadow-lg border border-border">
            <RefreshCw className={`w-5 h-5 text-primary ${isRefreshing ? 'animate-spin' : ''}`} />
          </div>
        </div>
      )}

      {/* Header with better mobile spacing */}
      <header 
        className="bg-primary text-white p-6 sticky top-0 z-50 shadow-md"
        style={{ paddingTop: 'max(24px, env(safe-area-inset-top))' }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <ShoppingCart className="text-2xl" />
            </div>
            <div>
              <h1 className="text-xl font-semibold leading-tight">
                {currentFamily?.familyName || 'Familie Boodschappenlijst'}
              </h1>
              {allFamilies.length > 1 && (
                <div className="flex items-center space-x-2 text-sm opacity-75">
                  <Users className="w-3 h-3" />
                  <span>{allFamilies.length} families</span>
                </div>
              )}
            </div>
          </div>
          <UserMenu groceryItems={items} familyName={currentFamily?.familyName} />
        </div>
      </header>

      {/* Search Bar with better mobile design */}
      <div className="p-6 bg-card border-b border-border">
        <div className="relative">
          <Input
            type="text"
            placeholder="Zoek in boodschappenlijst..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 pr-4 py-4 text-base border-2 border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200"
          />
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        </div>
      </div>

      {(!isOnline || isOfflineData || queuedMutationCount > 0 || isSyncingQueuedChanges || syncFailed) ? (
        <div className="px-6 py-3 border-b border-amber-500/30 bg-amber-500/10 text-sm text-amber-800 dark:text-amber-200">
          {isSyncingQueuedChanges ? "Wij synchroniseren je wijzigingen..." : null}
          {!isSyncingQueuedChanges && syncFailed ? "Sommige wijzigingen konden nog niet worden gesynchroniseerd." : null}
          {!isSyncingQueuedChanges && !syncFailed && (!isOnline || isOfflineData)
            ? "Je bent offline. Wij synchroniseren je wijzigingen zodra je weer online bent."
            : null}
          {!isSyncingQueuedChanges && !syncFailed && isOnline && !isOfflineData && queuedMutationCount > 0
            ? "Er staan wijzigingen klaar om te synchroniseren."
            : null}
        </div>
      ) : null}

      {/* Quick Stats with better mobile layout */}
      <div className="px-6 py-4 bg-card border-b border-border">
        {items.length > 0 ? (
          <div className="mb-4 rounded-2xl border border-primary/20 bg-primary/10 p-4">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-semibold text-foreground">
                {stats.completed} van {stats.total} klaar
              </span>
              <span className={stats.remaining === 0 ? "font-semibold text-primary" : "font-medium text-orange-600"}>
                {stats.remaining === 0 ? "Alles afgevinkt" : `${stats.remaining} te gaan`}
              </span>
            </div>
            <div
              className="mt-3 h-2 overflow-hidden rounded-full bg-background"
              role="progressbar"
              aria-label="Voortgang boodschappen"
              aria-valuemin={0}
              aria-valuemax={stats.total}
              aria-valuenow={stats.completed}
            >
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${stats.completionPercent}%` }}
              />
            </div>
          </div>
        ) : null}
        {items.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllCompleted}
              disabled={markAllCompletedMutation.isPending || !isOnline || isOfflineData}
              className="text-green-600 border-green-500/30 hover:bg-green-500/10 hover:border-green-500/50 rounded-lg px-3 py-2 w-full"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Alles afvinken
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllPending}
              disabled={markAllPendingMutation.isPending || !isOnline || isOfflineData}
              className="text-orange-600 border-orange-500/30 hover:bg-orange-500/10 hover:border-orange-500/50 rounded-lg px-3 py-2 w-full"
            >
              <Circle className="w-4 h-4 mr-2" />
              Nog te kopen
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeleteAll}
              disabled={!isOnline || isOfflineData}
              className="text-red-600 border-red-500/30 hover:bg-red-500/10 hover:border-red-500/50 rounded-lg px-3 py-2 w-full"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Wis alles
            </Button>
          </div>
        )}
      </div>

      {/* Main Content with better mobile spacing */}
      <main className="pb-32"> {/* Increased bottom padding for better FAB spacing */}
        {items.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <ShoppingCart className="w-20 h-20 mx-auto mb-6 text-muted-foreground/60" />
            <h3 className="text-xl font-medium mb-3">Geen boodschappen</h3>
            <p className="text-base">Voeg je eerste item toe om te beginnen</p>
          </div>
        ) : (
          <>
            {stats.remaining === 0 && items.length > 0 && !searchQuery ? (
              <div className="mx-6 mt-6 rounded-2xl border border-primary/20 bg-primary/10 p-5 text-center">
                <CheckCircle className="mx-auto mb-3 h-9 w-9 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">Alles afgevinkt</h2>
                <p className="mt-1 text-sm text-muted-foreground">Je boodschappenlijst is klaar.</p>
              </div>
            ) : null}

            {/* Pending Items */}
            {filteredItems.pending.length > 0 && (
              <div className="px-6 py-4">
                <h2 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">
                  Nog te kopen ({filteredItems.pending.length})
                </h2>
                {canReorderItems ? (
                  <SortableGroceryList
                    items={filteredItems.pending}
                    onReorder={handleReorderItems}
                    onToggle={handleToggleItem}
                    onDelete={handleDeleteItem}
                    onUpdate={handleUpdateItem}
                    disabled={reorderItemsMutation.isPending}
                  />
                ) : (
                  <div className="space-y-2">
                    {filteredItems.pending.map((item, index) => (
                      <div
                        key={`pending-${item.id}-${item.name}`}
                        className="animate-in slide-in-from-left duration-300"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <GroceryItemComponent
                          item={item}
                          onToggle={handleToggleItem}
                          onDelete={handleDeleteItem}
                          onUpdate={handleUpdateItem}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Completed Items */}
            {filteredItems.completed.length > 0 && (
              <div className="px-6 py-4 border-t border-border">
                <h2 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">
                  Afgevinkt ({filteredItems.completed.length})
                </h2>
                <div className="space-y-2">
                  {filteredItems.completed.map((item, index) => (
                    <div
                      key={`completed-${item.id}-${item.name}`}
                      className="animate-in slide-in-from-left duration-300"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <GroceryItemComponent
                        item={item}
                        onToggle={handleToggleItem}
                        onDelete={handleDeleteItem}
                        onUpdate={handleUpdateItem}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {searchQuery && filteredItems.pending.length === 0 && filteredItems.completed.length === 0 && (
              <div className="p-12 text-center text-muted-foreground">
                <Search className="w-20 h-20 mx-auto mb-6 text-muted-foreground/60" />
                <h3 className="text-xl font-medium mb-3">Geen resultaten</h3>
                <p className="text-base">Geen items gevonden voor "{searchQuery}"</p>
              </div>
            )}
          </>
        )}
      </main>

      {/* Add Item Form */}
      <AddItemForm
        onAddItem={handleAddItem}
        onReactivateItem={handleReactivateItem}
        isLoading={addItemMutation.isPending}
        existingItems={items}
        historyItems={historyItems}
        onSuggestionsActiveChange={setHistorySuggestionsActive}
      />

      {/* Delete All Confirmation Dialog */}
      <DeleteAllConfirmationDialog
        isOpen={showDeleteAllDialog}
        onClose={() => setShowDeleteAllDialog(false)}
        onConfirm={handleConfirmDeleteAll}
        isLoading={deleteAllItemsMutation.isPending}
        itemCount={items.length}
      />
    </div>
  );
}
