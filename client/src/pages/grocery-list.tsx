import { useState, useCallback, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { GroceryItem, InsertGroceryItem } from "@shared/schema";
import { GroceryItemComponent } from "@/components/grocery-item";
import { AddItemForm } from "@/components/add-item-form";
import { DeleteConfirmationDialog } from "@/components/delete-confirmation-dialog";
import { DeleteAllConfirmationDialog } from "@/components/delete-all-confirmation-dialog";
import { UserMenu } from "@/components/user-menu";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useWebSocket } from "@/hooks/use-websocket";
import { useAuth } from "@/hooks/use-auth";
import { useFamilyStatus } from "@/hooks/use-family-status";
import { useToast } from "@/hooks/use-toast";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import { Search, ShoppingCart, Wifi, WifiOff, Trash2, RefreshCw, ArrowLeft, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function GroceryList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [itemToDelete, setItemToDelete] = useState<GroceryItem | null>(null);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [, setLocation] = useLocation();
  const params = useParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const { familyMembership, allFamilies } = useFamilyStatus();

  // Get family ID from URL params or fallback to first family for legacy support
  const familyId = params.familyId || localStorage.getItem('currentFamilyId') || familyMembership?.id;
  
  // Find the current family info
  const currentFamily = useMemo(() => {
    if (!familyId) return null;
    return allFamilies.find(f => f.familyId === familyId) || null;
  }, [familyId, allFamilies]);

  // Redirect to families overview if no family found
  useEffect(() => {
    if (!familyId && allFamilies.length > 0) {
      setLocation("/families");
    }
  }, [familyId, allFamilies, setLocation]);

  // Fetch grocery items for the specific family
  const { data: items = [], isLoading, refetch } = useQuery<GroceryItem[]>({
    queryKey: ["/api/grocery-items", familyId],
    queryFn: async () => {
      if (!familyId) return [];
      const response = await apiRequest("GET", `/api/grocery-items/${familyId}`);
      return response.json();
    },
    enabled: !!familyId,
  });

  // Pull to refresh functionality
  const { isPulling, isRefreshing, pullDistance, shouldShowIndicator } = usePullToRefresh({
    onRefresh: async () => {
      await refetch();
      toast({
        title: "Bijgewerkt",
        description: "Lijst is ververst",
      });
    },
    threshold: 80,
  });

  // Debug: Log items to see duplicates
  useEffect(() => {
    console.log(`[${new Date().toISOString()}] Items in cache:`, items.length);
    const itemCounts: Record<number, number> = {};
    items.forEach(item => {
      itemCounts[item.id] = (itemCounts[item.id] || 0) + 1;
    });
    const duplicates = Object.entries(itemCounts).filter(([_, count]) => (count as number) > 1);
    if (duplicates.length > 0) {
      console.log(`[${new Date().toISOString()}] DUPLICATE ITEMS IN CACHE:`, duplicates);
    }
  }, [items]);

  // WebSocket connection for real-time updates
  const { isConnected: wsConnected } = useWebSocket({
    onItemAdded: (item) => {
      console.log(`[${new Date().toISOString()}] Client: WebSocket itemAdded:`, item);
      queryClient.setQueryData(["/api/grocery-items", familyId], (old: GroceryItem[] = []) => {
        // Check if item already exists to prevent duplicates
        const exists = old.some(existingItem => existingItem.id === item.id);
        console.log(`[${new Date().toISOString()}] Client: WebSocket item exists in cache:`, exists);
        return exists ? old : [...old, item];
      });
      setIsConnected(true);
    },
    onItemUpdated: (updatedItem) => {
      console.log(`[${new Date().toISOString()}] Client: WebSocket itemUpdated:`, updatedItem);
      queryClient.setQueryData(["/api/grocery-items", familyId], (old: GroceryItem[] = []) =>
        old.map((item) => (item.id === updatedItem.id ? updatedItem : item))
      );
      setIsConnected(true);
    },
    onItemDeleted: (id) => {
      console.log(`[${new Date().toISOString()}] Client: WebSocket itemDeleted:`, id);
      queryClient.setQueryData(["/api/grocery-items", familyId], (old: GroceryItem[] = []) =>
        old.filter((item) => item.id !== id)
      );
      setIsConnected(true);
    },
    onSync: (syncedItems) => {
      console.log(`[${new Date().toISOString()}] Client: WebSocket sync with ${syncedItems.length} items`);
      queryClient.setQueryData(["/api/grocery-items", familyId], syncedItems);
      setIsConnected(true);
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
      // Always update cache to ensure UI feedback
      queryClient.setQueryData(["/api/grocery-items", familyId], (old: GroceryItem[] = []) => {
        // Check if item already exists to prevent duplicates
        const exists = old.some(item => item.id === newItem.id);
        console.log(`[${new Date().toISOString()}] Client: Item exists in cache:`, exists);
        return exists ? old : [...old, newItem];
      });
      toast({
        title: "Toegevoegd",
        description: `"${newItem.name}" is toegevoegd aan de lijst.`,
      });
    },
    onError: () => {
      console.log(`[${new Date().toISOString()}] Client: Mutation error`);
      toast({
        title: "Fout",
        description: "Kon item niet toevoegen. Probeer het opnieuw.",
        variant: "destructive",
      });
    },
  });

  // Toggle item mutation
  const toggleItemMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: number; completed: boolean }) => {
      const response = await apiRequest("PATCH", `/api/grocery-items/${id}`, { completed });
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
      // Update with the actual response from the server
      queryClient.setQueryData(["/api/grocery-items", familyId], (old: GroceryItem[] = []) =>
        old.map((item) => (item.id === updatedItem.id ? updatedItem : item))
      );
    },
    onError: (err, { id }, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousItems) {
        queryClient.setQueryData(["/api/grocery-items", familyId], context.previousItems);
      }
      toast({
        title: "Fout",
        description: "Kon item niet bijwerken. Probeer het opnieuw.",
        variant: "destructive",
      });
    },
  });

  // Delete item mutation
  const deleteItemMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/grocery-items/${id}`);
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
      setItemToDelete(null);
      toast({
        title: "Verwijderd",
        description: "Item verwijderd van lijst",
      });
    },
    onError: (err, id, context) => {
      // If the mutation fails, roll back
      if (context?.previousItems) {
        queryClient.setQueryData(["/api/grocery-items", familyId], context.previousItems);
      }
      setItemToDelete(null);
      toast({
        title: "Fout",
        description: "Kon item niet verwijderen. Probeer het opnieuw.",
        variant: "destructive",
      });
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
      toast({
        title: "Lijst gewist",
        description: `${response.deletedCount} items verwijderd van de lijst`,
      });
    },
    onError: (err, variables, context) => {
      // If the mutation fails, roll back
      if (context?.previousItems) {
        queryClient.setQueryData(["/api/grocery-items", familyId], context.previousItems);
      }
      setShowDeleteAllDialog(false);
      toast({
        title: "Fout",
        description: "Kon lijst niet wissen. Probeer het opnieuw.",
        variant: "destructive",
      });
    },
  });

  // Filter and sort items
  const filteredItems = useMemo(() => {
    const filtered = items.filter((item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    const pending = filtered.filter((item) => !item.completed);
    const completed = filtered.filter((item) => item.completed);
    
    return { pending, completed };
  }, [items, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    const total = items.length;
    const completed = items.filter((item) => item.completed).length;
    const remaining = total - completed;
    
    return { total, completed, remaining };
  }, [items]);

  const handleAddItem = useCallback(async (name: string, addedBy: string) => {
    console.log(`[${new Date().toISOString()}] Client: handleAddItem called with name: "${name}"`);
    await addItemMutation.mutateAsync({ 
      name, 
      completed: false,
      addedBy: user?.id || "" // Use current user's ID
    });
  }, [addItemMutation, user?.id]);

  const handleToggleItem = useCallback((id: number) => {
    const item = items.find((item) => item.id === id);
    if (item) {
      toggleItemMutation.mutate({ id, completed: !item.completed });
    }
  }, [items, toggleItemMutation]);

  const handleDeleteItem = useCallback((item: GroceryItem) => {
    setItemToDelete(item);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (itemToDelete) {
      deleteItemMutation.mutate(itemToDelete.id);
    }
  }, [itemToDelete, deleteItemMutation]);

  const handleDeleteAll = useCallback(() => {
    setShowDeleteAllDialog(true);
  }, []);

  const handleConfirmDeleteAll = useCallback(() => {
    deleteAllItemsMutation.mutate();
  }, [deleteAllItemsMutation]);

  if (isLoading) {
    return (
      <div className="max-w-md mx-auto bg-white min-h-screen shadow-lg">
        <div className="bg-primary text-white p-6 sticky top-0 z-50 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setLocation("/families")} 
                className="text-white hover:bg-white/20 p-2"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
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
      <div className="max-w-md mx-auto bg-white min-h-screen shadow-lg">
        <div className="bg-primary text-white p-6 sticky top-0 z-50 shadow-md">
          <h1 className="text-xl font-semibold">Geen familie geselecteerd</h1>
        </div>
        <div className="p-6 text-center">
          <Users className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 mb-4">Selecteer een familie om de boodschappenlijst te bekijken.</p>
          <Button onClick={() => setLocation("/families")}>
            Ga naar Families
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen shadow-lg relative">
      {/* Pull to refresh indicator */}
      {shouldShowIndicator && (
        <div 
          className="absolute top-0 left-0 right-0 z-40 flex items-center justify-center pt-4 transition-all duration-300"
          style={{
            transform: `translateY(${isRefreshing ? '0px' : `-${Math.max(0, 60 - pullDistance)}px`})`,
            opacity: isRefreshing ? 1 : Math.min(1, pullDistance / 40),
          }}
        >
          <div className="bg-white rounded-full p-3 shadow-lg border border-gray-200">
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
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setLocation("/families")} 
                className="text-white hover:bg-white/20 p-2"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
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
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              {wsConnected ? (
                <>
                  <div className="w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse"></div>
                  <Wifi className="w-5 h-5" />
                  <span className="text-sm">Live</span>
                </>
              ) : (
                <>
                  <div className="w-2.5 h-2.5 bg-red-400 rounded-full"></div>
                  <WifiOff className="w-5 h-5" />
                  <span className="text-sm">Offline</span>
                </>
              )}
            </div>
            <UserMenu />
          </div>
        </div>
      </header>

      {/* Search Bar with better mobile design */}
      <div className="p-6 bg-white border-b border-gray-100">
        <div className="relative">
          <Input
            type="text"
            placeholder="Zoek in boodschappenlijst..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 pr-4 py-4 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200"
          />
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        </div>
      </div>

      {/* Quick Stats with better mobile layout */}
      <div className="px-6 py-4 bg-white border-b border-gray-100">
        <div className="flex justify-between items-center">
          <div className="flex justify-between text-sm text-gray-600 flex-1 space-x-4">
            <span className="font-medium">{stats.total} items</span>
            <span className="text-primary font-medium">{stats.completed} klaar</span>
            <span className="text-orange-500 font-medium">{stats.remaining} te doen</span>
          </div>
          {items.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeleteAll}
              className="ml-4 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 rounded-lg px-3 py-2"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Wis alles
            </Button>
          )}
        </div>
      </div>

      {/* Main Content with better mobile spacing */}
      <main className="pb-32"> {/* Increased bottom padding for better FAB spacing */}
        {items.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <ShoppingCart className="w-20 h-20 mx-auto mb-6 text-gray-300" />
            <h3 className="text-xl font-medium mb-3">Geen boodschappen</h3>
            <p className="text-base">Voeg je eerste item toe om te beginnen</p>
          </div>
        ) : (
          <>
            {/* Pending Items */}
            {filteredItems.pending.length > 0 && (
              <div className="px-6 py-4">
                <h2 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wider">
                  Nog te kopen ({filteredItems.pending.length})
                </h2>
                <div className="space-y-2">
                  {filteredItems.pending.map((item, index) => (
                    <div
                      key={item.id}
                      className="animate-in slide-in-from-left duration-300"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <GroceryItemComponent
                        item={item}
                        onToggle={handleToggleItem}
                        onDelete={handleDeleteItem}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Completed Items */}
            {filteredItems.completed.length > 0 && (
              <div className="px-6 py-4 border-t border-gray-100">
                <h2 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wider">
                  Afgevinkt ({filteredItems.completed.length})
                </h2>
                <div className="space-y-2">
                  {filteredItems.completed.map((item, index) => (
                    <div
                      key={item.id}
                      className="animate-in slide-in-from-left duration-300"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <GroceryItemComponent
                        item={item}
                        onToggle={handleToggleItem}
                        onDelete={handleDeleteItem}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {searchQuery && filteredItems.pending.length === 0 && filteredItems.completed.length === 0 && (
              <div className="p-12 text-center text-gray-500">
                <Search className="w-20 h-20 mx-auto mb-6 text-gray-300" />
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
        isLoading={addItemMutation.isPending}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        item={itemToDelete}
        isOpen={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={handleConfirmDelete}
        isLoading={deleteItemMutation.isPending}
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
