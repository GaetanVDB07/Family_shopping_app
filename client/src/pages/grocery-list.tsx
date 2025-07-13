import { useState, useCallback, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { GroceryItem, InsertGroceryItem } from "@shared/schema";
import { GroceryItemComponent } from "@/components/grocery-item";
import { AddItemForm } from "@/components/add-item-form";
import { DeleteConfirmationDialog } from "@/components/delete-confirmation-dialog";
import { UserMenu } from "@/components/user-menu";
import { Input } from "@/components/ui/input";
import { useWebSocket } from "@/hooks/use-websocket";
import { useAuth } from "@/hooks/use-auth";
import { useFamilyStatus } from "@/hooks/use-family-status";
import { useToast } from "@/hooks/use-toast";
import { Search, ShoppingCart, Wifi, WifiOff } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function GroceryList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [itemToDelete, setItemToDelete] = useState<GroceryItem | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const { familyMembership } = useFamilyStatus();

  // Fetch grocery items
  const { data: items = [], isLoading } = useQuery<GroceryItem[]>({
    queryKey: ["/api/grocery-items"],
    staleTime: 30000, // Consider data fresh for 30 seconds
    refetchOnWindowFocus: true, // Refetch when user returns to tab
  });

  // Debug: Log items to see duplicates
  useEffect(() => {
    console.log(`[${new Date().toISOString()}] Items in cache:`, items.length);
    const itemCounts = {};
    items.forEach(item => {
      itemCounts[item.id] = (itemCounts[item.id] || 0) + 1;
    });
    const duplicates = Object.entries(itemCounts).filter(([_, count]) => count > 1);
    if (duplicates.length > 0) {
      console.log(`[${new Date().toISOString()}] DUPLICATE ITEMS IN CACHE:`, duplicates);
    }
  }, [items]);

  // Update page title with family name
  useEffect(() => {
    const familyName = familyMembership?.familyName;
    if (familyName) {
      document.title = `${familyName} - Familie Boodschappenlijst`;
    } else {
      document.title = 'Familie Boodschappenlijst';
    }
  }, [familyMembership?.familyName]);

  // WebSocket connection for real-time updates
  const { isConnected: wsConnected } = useWebSocket({
    onItemAdded: (item) => {
      console.log(`[${new Date().toISOString()}] Client: WebSocket itemAdded:`, item);
      queryClient.setQueryData(["/api/grocery-items"], (old: GroceryItem[] = []) => {
        // Check if item already exists to prevent duplicates
        const exists = old.some(existingItem => existingItem.id === item.id);
        console.log(`[${new Date().toISOString()}] Client: WebSocket item exists in cache:`, exists);
        return exists ? old : [...old, item];
      });
      setIsConnected(true);
    },
    onItemUpdated: (updatedItem) => {
      console.log(`[${new Date().toISOString()}] Client: WebSocket itemUpdated:`, updatedItem);
      queryClient.setQueryData(["/api/grocery-items"], (old: GroceryItem[] = []) =>
        old.map((item) => (item.id === updatedItem.id ? updatedItem : item))
      );
      setIsConnected(true);
    },
    onItemDeleted: (id) => {
      console.log(`[${new Date().toISOString()}] Client: WebSocket itemDeleted:`, id);
      queryClient.setQueryData(["/api/grocery-items"], (old: GroceryItem[] = []) =>
        old.filter((item) => item.id !== id)
      );
      setIsConnected(true);
    },
    onSync: (syncedItems) => {
      console.log(`[${new Date().toISOString()}] Client: WebSocket sync with ${syncedItems.length} items`);
      queryClient.setQueryData(["/api/grocery-items"], syncedItems);
      setIsConnected(true);
    },
  });

  // Add item mutation
  const addItemMutation = useMutation({
    mutationFn: async (data: InsertGroceryItem) => {
      console.log(`[${new Date().toISOString()}] Client: Starting mutation for item:`, data);
      const response = await apiRequest("POST", "/api/grocery-items", data);
      const result = await response.json();
      console.log(`[${new Date().toISOString()}] Client: Mutation response:`, result);
      return result;
    },
    onMutate: async (newItem) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ["/api/grocery-items"] });

      // Snapshot the previous value
      const previousItems = queryClient.getQueryData<GroceryItem[]>(["/api/grocery-items"]);

      // Optimistically update to the new value
      queryClient.setQueryData(["/api/grocery-items"], (old: GroceryItem[] = []) => [
        ...old,
        { ...newItem, id: Date.now(), createdAt: new Date().toISOString() } as GroceryItem
      ]);

      // Return a context object with the snapshotted value
      return { previousItems };
    },
    onSuccess: (newItem: GroceryItem, variables, context) => {
      console.log(`[${new Date().toISOString()}] Client: Mutation success`);
      
      // Replace the optimistic item with the real one from the server
      queryClient.setQueryData(["/api/grocery-items"], (old: GroceryItem[] = []) => {
        return old.map(item => 
          // Replace the optimistic item (with temp ID) with the real one
          item.id === context?.previousItems?.length ? newItem : 
          item.name === newItem.name && item.addedBy === newItem.addedBy ? newItem : item
        );
      });
      
      toast({
        title: "Toegevoegd",
        description: `"${newItem.name}" is toegevoegd aan de lijst.`,
      });
    },
    onError: (err, newItem, context) => {
      console.log(`[${new Date().toISOString()}] Client: Mutation error`);
      
      // Rollback to the previous value
      queryClient.setQueryData(["/api/grocery-items"], context?.previousItems);
      
      toast({
        title: "Fout",
        description: "Kon item niet toevoegen. Probeer het opnieuw.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Always refetch after error or success to ensure server state
      queryClient.invalidateQueries({ queryKey: ["/api/grocery-items"] });
    },
  });

  // Toggle item mutation
  const toggleItemMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: number; completed: boolean }) => {
      const response = await apiRequest("PATCH", `/api/grocery-items/${id}`, { completed });
      return response.json();
    },
    onMutate: async ({ id, completed }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["/api/grocery-items"] });

      // Snapshot the previous value
      const previousItems = queryClient.getQueryData<GroceryItem[]>(["/api/grocery-items"]);

      // Optimistically update
      queryClient.setQueryData(["/api/grocery-items"], (old: GroceryItem[] = []) =>
        old.map((item) => (item.id === id ? { ...item, completed } : item))
      );

      return { previousItems };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      queryClient.setQueryData(["/api/grocery-items"], context?.previousItems);
      
      toast({
        title: "Fout",
        description: "Kon item niet bijwerken. Probeer het opnieuw.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Refetch to ensure server state
      queryClient.invalidateQueries({ queryKey: ["/api/grocery-items"] });
    },
  });

  // Delete item mutation
  const deleteItemMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/grocery-items/${id}`);
      return id;
    },
    onMutate: async (id) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["/api/grocery-items"] });

      // Snapshot the previous value
      const previousItems = queryClient.getQueryData<GroceryItem[]>(["/api/grocery-items"]);

      // Optimistically update
      queryClient.setQueryData(["/api/grocery-items"], (old: GroceryItem[] = []) =>
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
    onError: (err, variables, context) => {
      // Rollback on error
      queryClient.setQueryData(["/api/grocery-items"], context?.previousItems);
      
      toast({
        title: "Fout",
        description: "Kon item niet verwijderen. Probeer het opnieuw.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Refetch to ensure server state
      queryClient.invalidateQueries({ queryKey: ["/api/grocery-items"] });
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
      addedBy: user?.id || "" // Keep sending user ID, API will return user name
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

  if (isLoading) {
    return (
      <div className="max-w-md mx-auto bg-white min-h-screen shadow-lg">
        <div className="bg-primary text-white p-4 sticky top-0 z-50 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <ShoppingCart className="text-xl" />
              <div>
                <h1 className="text-lg font-semibold">
                  {familyMembership?.familyName || 'Familie'} Boodschappenlijst
                </h1>
                {familyMembership?.familyName && (
                  <p className="text-xs text-green-100 opacity-90">
                    Familie: {familyMembership.familyName}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="p-4 space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-6 w-full" />
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen shadow-lg">
      {/* Header */}
      <header className="bg-primary text-white p-4 sticky top-0 z-50 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <ShoppingCart className="text-xl" />
            <div>
              <h1 className="text-lg font-semibold">
                {familyMembership?.familyName || 'Familie'} Boodschappenlijst
              </h1>
              {familyMembership?.familyName && (
                <p className="text-xs text-green-100 opacity-90">
                  Familie: {familyMembership.familyName}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              {wsConnected ? (
                <>
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <Wifi className="w-4 h-4" />
                  <span className="text-xs">Online</span>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                  <WifiOff className="w-4 h-4" />
                  <span className="text-xs">Offline</span>
                </>
              )}
            </div>
            <UserMenu />
          </div>
        </div>
      </header>

      {/* Search Bar */}
      <div className="p-4 bg-white border-b border-gray-100">
        <div className="relative">
          <Input
            type="text"
            placeholder="Zoek in boodschappenlijst..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-3 border-gray-200 focus:ring-2 focus:ring-primary focus:border-primary"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        </div>
      </div>

      {/* Quick Stats */}
      <div className="p-4 bg-white border-b border-gray-100">
        <div className="flex justify-between text-sm text-gray-600">
          <span>{stats.total} items totaal</span>
          <span className="text-primary">{stats.completed} afgevinkt</span>
          <span className="text-orange-500">{stats.remaining} nog te doen</span>
        </div>
      </div>

      {/* Main Content */}
      <main className="pb-20">
        {items.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium mb-2">Geen boodschappen</h3>
            <p className="text-sm">Voeg je eerste item toe om te beginnen</p>
          </div>
        ) : (
          <>
            {/* Pending Items */}
            {filteredItems.pending.length > 0 && (
              <div className="p-4">
                <h2 className="text-sm font-medium text-gray-600 mb-3 uppercase tracking-wide">
                  Nog te kopen
                </h2>
                {filteredItems.pending.map((item) => (
                  <GroceryItemComponent
                    key={item.id}
                    item={item}
                    onToggle={handleToggleItem}
                    onDelete={handleDeleteItem}
                  />
                ))}
              </div>
            )}

            {/* Completed Items */}
            {filteredItems.completed.length > 0 && (
              <div className="p-4 border-t border-gray-100">
                <h2 className="text-sm font-medium text-gray-600 mb-3 uppercase tracking-wide">
                  Afgevinkt
                </h2>
                {filteredItems.completed.map((item) => (
                  <GroceryItemComponent
                    key={item.id}
                    item={item}
                    onToggle={handleToggleItem}
                    onDelete={handleDeleteItem}
                  />
                ))}
              </div>
            )}

            {searchQuery && filteredItems.pending.length === 0 && filteredItems.completed.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                <Search className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium mb-2">Geen resultaten</h3>
                <p className="text-sm">Geen items gevonden voor "{searchQuery}"</p>
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
    </div>
  );
}
