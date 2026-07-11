import { useState, useEffect, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useFamilyStatus, userFamiliesQueryKey } from "@/hooks/use-family-status";
import { useAuth } from "@/hooks/use-auth";
import { useCurrentFamily } from "@/hooks/use-current-family";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { maxLengthInputProps, toastApiError } from "@/lib/api-error";
import { Users, Plus, UserPlus, Crown, Settings } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import type { FamilyWithRole } from "@shared/schema";
import { isValidJoinCode, normalizeJoinCodeInput } from "@/lib/family-code";
import { clearPendingJoinCode, resolveInitialJoinCode } from "@/lib/family-invite";
import { prefetchGroceryItems } from "@/hooks/use-grocery-items";
import { prefetchFamilyMemberNames } from "@/hooks/use-family-member-names";
import { preloadGroceryListPage } from "@/lib/page-preload";

export default function FamiliesOverview() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { allFamilies, familiesLoading } = useFamilyStatus();
  const { updateCurrentFamily } = useCurrentFamily();
  const { toast } = useToast();
  const [joinCode, setJoinCode] = useState("");
  const [newFamilyName, setNewFamilyName] = useState("");
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const code = resolveInitialJoinCode();
    if (!code) {
      return;
    }

    setJoinCode(code);
    setShowJoinDialog(true);
    clearPendingJoinCode();
  }, []);

  const families: FamilyWithRole[] = allFamilies.map((family) => ({
    id: family.id,
    name: family.name,
    code: family.code,
    role: family.role,
    memberCount: family.memberCount,
    createdAt: new Date(family.createdAt),
    createdBy: family.createdBy,
  }));
  const isLoading = familiesLoading;

  // Join family mutation
  const joinFamilyMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await apiRequest("POST", "/api/families/join", { code });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userFamiliesQueryKey(user?.id ?? null) });
      setJoinCode("");
      setShowJoinDialog(false);
    },
    onError: (error: unknown) => {
      toastApiError(toast, error, "Kon niet bij familie voegen.");
    },
  });

  // Create family mutation
  const createFamilyMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await apiRequest("POST", "/api/families", {
        name,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userFamiliesQueryKey(user?.id ?? null) });
      setNewFamilyName("");
      setShowCreateDialog(false);
    },
    onError: (error: unknown) => {
      toastApiError(toast, error, "Kon familie niet aanmaken.");
    },
  });

  const handleJoinFamily = () => {
    if (isValidJoinCode(joinCode)) {
      joinFamilyMutation.mutate(joinCode);
    }
  };

  const handleCreateFamily = () => {
    if (newFamilyName.trim()) {
      createFamilyMutation.mutate(newFamilyName.trim());
    }
  };

  const navigateToFamily = (familyId: string) => {
    // Store the current family ID for the grocery list
    updateCurrentFamily(familyId);
    setLocation(`/grocery-list/${familyId}`);
  };

  const prefetchFamilyData = useCallback((familyId: string) => {
    preloadGroceryListPage();
    void prefetchGroceryItems(queryClient, familyId);
    void prefetchFamilyMemberNames(queryClient, familyId);
  }, [queryClient]);

  const primaryFamilyId = families[0]?.id;

  useEffect(() => {
    if (!primaryFamilyId) {
      return;
    }

    const preloadPrimaryFamily = () => prefetchFamilyData(primaryFamilyId);

    const idleWindow = window as Window & {
      requestIdleCallback?: Window["requestIdleCallback"];
      cancelIdleCallback?: Window["cancelIdleCallback"];
    };

    if (idleWindow.requestIdleCallback && idleWindow.cancelIdleCallback) {
      const idleCallbackId = idleWindow.requestIdleCallback(preloadPrimaryFamily, {
        timeout: 1_500,
      });
      return () => idleWindow.cancelIdleCallback?.(idleCallbackId);
    }

    const timeoutId = window.setTimeout(preloadPrimaryFamily, 200);
    return () => window.clearTimeout(timeoutId);
  }, [prefetchFamilyData, primaryFamilyId]);

  const navigateToFamilyManagement = (familyId: string) => {
    updateCurrentFamily(familyId);
    setLocation(`/family-management/${familyId}`);
  };

  if (isLoading) {
    return (
      <div className="max-w-md mx-auto bg-background min-h-screen shadow-lg">
        <div className="bg-primary text-white p-4 sticky top-0 z-50 shadow-md">
          <h1 className="text-lg font-semibold">Laden...</h1>
        </div>
        <div className="p-4">
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-muted rounded"></div>
            <div className="h-32 bg-muted rounded"></div>
            <div className="h-32 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-background min-h-screen shadow-lg">
      {/* Header */}
      <header className="bg-primary text-white p-4 sticky top-0 z-50 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img
              src={`/favicon.svg?v=${__APP_VERSION__}&mark=empty-cart`}
              alt=""
              className="h-10 w-10 shrink-0 rounded-xl shadow-sm ring-1 ring-white/25"
            />
            <div>
              <h1 className="text-lg font-semibold leading-tight">Mijn Families</h1>
              <span className="text-xs opacity-75">V{__APP_VERSION__}</span>
            </div>
          </div>
          <span className="text-sm opacity-75">{families?.length || 0}</span>
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* Action Buttons */}
        <div className="grid grid-cols-1 min-[380px]:grid-cols-2 gap-3">
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="flex items-center space-x-2">
                <Plus className="w-4 h-4" />
                <span>Nieuwe Familie</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nieuwe Familie Aanmaken</DialogTitle>
                <DialogDescription>
                  Maak een nieuwe familie aan en nodig anderen uit om deel te nemen.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="family-name">Familie Naam</Label>
                  <Input
                    id="family-name"
                    value={newFamilyName}
                    onChange={(e) => setNewFamilyName(e.target.value)}
                    placeholder="Bijv. Familie van der Berg"
                    {...maxLengthInputProps(100, toast)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Annuleren
                </Button>
                <Button 
                  onClick={handleCreateFamily}
                  disabled={!newFamilyName.trim() || createFamilyMutation.isPending}
                >
                  {createFamilyMutation.isPending ? "Aanmaken..." : "Familie Aanmaken"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center space-x-2">
                <UserPlus className="w-4 h-4" />
                <span>Familie Joinen</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Familie Joinen</DialogTitle>
                <DialogDescription>
                  Voer de 6-cijferige familiecode in om je bij een bestaande familie aan te sluiten.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="join-code">Familie Code</Label>
                  <Input
                    id="join-code"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    value={joinCode}
                    onChange={(e) => setJoinCode(normalizeJoinCodeInput(e.target.value))}
                    placeholder="123456"
                    maxLength={6}
                    className="font-mono text-center tracking-wider"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowJoinDialog(false)}>
                  Annuleren
                </Button>
                <Button 
                  onClick={handleJoinFamily}
                  disabled={!isValidJoinCode(joinCode) || joinFamilyMutation.isPending}
                >
                  {joinFamilyMutation.isPending ? "Joinen..." : "Familie Joinen"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Families List */}
        {families && families.length > 0 ? (
          <div className="space-y-4">
            {families.map((family) => (
              <Card
                key={family.id}
                className="hover:shadow-md transition-shadow"
                onMouseEnter={() => prefetchFamilyData(family.id)}
                onFocus={() => prefetchFamilyData(family.id)}
                onTouchStart={() => prefetchFamilyData(family.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="flex min-w-0 items-start gap-2">
                      <Users className="w-5 h-5" />
                      <span className="min-w-0 break-words">{family.name}</span>
                    </CardTitle>
                    <div className="flex shrink-0 items-center space-x-2">
                      <Badge variant={family.role === "admin" ? "default" : "secondary"}>
                        {family.role === "admin" ? (
                          <><Crown className="w-3 h-3 mr-1" />Admin</>
                        ) : (
                          "Lid"
                        )}
                      </Badge>
                    </div>
                  </div>
                  <CardDescription>
                    {family.memberCount} {family.memberCount === 1 ? 'lid' : 'leden'} • Code: {family.code}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex space-x-2">
                    <Button 
                      className="flex-1" 
                      onClick={() => navigateToFamily(family.id)}
                      onMouseEnter={() => prefetchFamilyData(family.id)}
                      onFocus={() => prefetchFamilyData(family.id)}
                      onTouchStart={() => prefetchFamilyData(family.id)}
                    >
                      Boodschappenlijst
                    </Button>
                    {family.role === "admin" && (
                      <Button 
                        variant="outline" 
                        size="icon"
                        className="h-11 w-11 shrink-0"
                        onClick={() => navigateToFamilyManagement(family.id)}
                        aria-label={`${family.name} beheren`}
                      >
                        <Settings className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-8">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Geen families</h3>
              <p className="text-muted-foreground mb-6">Je bent nog geen lid van een familie. Maak een nieuwe familie aan of join een bestaande familie.</p>
              <div className="space-y-2">
                <Button onClick={() => setShowCreateDialog(true)} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Nieuwe Familie Aanmaken
                </Button>
                <Button onClick={() => setShowJoinDialog(true)} variant="outline" className="w-full">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Familie Joinen
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
