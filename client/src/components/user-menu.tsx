import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { toastApiError } from "@/lib/api-error";
import { useFamilyStatus, userFamiliesQueryKey } from "@/hooks/use-family-status";
import { useCurrentFamily } from "@/hooks/use-current-family";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Menu, UserX, LogOut, Users, Home, UserMinus, Copy, MessageCircle } from "lucide-react";
import { ThemeToggleMenu } from "@/components/theme-toggle";
import type { GroceryItem } from "@shared/schema";
import {
  buildWhatsAppShareUrl,
  formatGroceryListForExport,
} from "@/lib/export-grocery-list";

interface UserMenuProps {
  groceryItems?: GroceryItem[];
  familyName?: string;
}

export function UserMenu({ groceryItems, familyName }: UserMenuProps = {}) {
  const [, setLocation] = useLocation();
  const { allFamilies } = useFamilyStatus();
  const { currentFamilyId, currentFamily } = useCurrentFamily();
  const { signOut, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [showDeleteAccountDialog, setShowDeleteAccountDialog] = useState(false);

  const isAdmin = currentFamily?.role === "admin";
  const adminFamilies = useMemo(
    () => allFamilies.filter((family) => family.role === "admin"),
    [allFamilies]
  );

  // Leave family mutation
  const leaveFamilyMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/family/leave", { familyId: currentFamilyId });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userFamiliesQueryKey(user?.id ?? null) });
      setLocation("/families");
    },
    onError: (error) => {
      toastApiError(toast, error, "Kon familie niet verlaten. Probeer het opnieuw.");
    },
  });

  const handleLeaveFamily = () => {
    if (isAdmin) {
      toast({
        title: "Niet toegestaan",
        description: "Als admin kun je de familie niet verlaten. Je kunt alleen de familie verwijderen.",
        variant: "destructive",
      });
      return;
    }
    setShowLeaveDialog(true);
  };

  const confirmLeaveFamily = () => {
    leaveFamilyMutation.mutate();
    setShowLeaveDialog(false);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setLocation("/");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Kon niet uitloggen. Probeer het opnieuw.";
      toast({
        title: "Fout",
        description: message,
        variant: "destructive",
      });
    }
  };

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", "/api/user/account");
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Kon account niet verwijderen");
      }
      return response.json();
    },
    onSuccess: async () => {
      queryClient.clear();
      await signOut();
      setShowDeleteAccountDialog(false);
      toast({
        title: "Account verwijderd",
        description: "Je account en gegevens zijn verwijderd.",
      });
      setLocation("/");
    },
    onError: (error: Error) => {
      toastApiError(toast, error, "Kon account niet verwijderen");
    },
  });

  const confirmDeleteAccount = () => {
    deleteAccountMutation.mutate();
  };

  const exportText =
    groceryItems && groceryItems.length > 0
      ? formatGroceryListForExport(groceryItems, familyName)
      : null;

  const copyExportedList = async () => {
    if (!exportText) {
      return;
    }

    try {
      await navigator.clipboard.writeText(exportText);
      toast({
        title: "Gekopieerd",
        description: "De boodschappenlijst staat op je klembord.",
      });
    } catch {
      toast({
        title: "Fout",
        description: "Kon de lijst niet kopiëren naar het klembord.",
        variant: "destructive",
      });
    }
  };

  const shareExportedListOnWhatsApp = () => {
    if (!exportText) {
      return;
    }

    window.open(buildWhatsAppShareUrl(exportText), "_blank", "noopener,noreferrer");
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
            <Menu className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <div className="px-2 py-1.5 text-sm font-medium">
            {currentFamily?.familyName || "Onbekende Familie"}
          </div>
          <div className="px-2 py-1 text-xs text-muted-foreground">
            {isAdmin ? "Admin" : "Lid"} • {allFamilies.length} {allFamilies.length === 1 ? 'familie' : 'families'}
          </div>
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={() => setLocation("/families")}>
            <Home className="w-4 h-4 mr-2" />
            Alle Families
          </DropdownMenuItem>

          {isAdmin && currentFamilyId && (
            <DropdownMenuItem onClick={() => {
              console.log("Navigating to family management...");
              setLocation(`/family-management/${currentFamilyId}`);
            }}>
              <Users className="w-4 h-4 mr-2" />
              Familie Beheren
            </DropdownMenuItem>
          )}
          
          {!isAdmin && currentFamilyId && (
            <DropdownMenuItem 
              onClick={handleLeaveFamily}
              className="text-red-600 hover:text-red-600 hover:bg-red-500/10"
            >
              <UserX className="w-4 h-4 mr-2" />
              Familie Verlaten
            </DropdownMenuItem>
          )}

          <DropdownMenuItem
            onClick={() => setShowDeleteAccountDialog(true)}
            className="text-red-600 hover:text-red-600 hover:bg-red-500/10"
          >
            <UserMinus className="w-4 h-4 mr-2" />
            Account verwijderen
          </DropdownMenuItem>

          {exportText ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => void copyExportedList()}>
                <Copy className="w-4 h-4 mr-2" />
                Lijst kopiëren
              </DropdownMenuItem>
              <DropdownMenuItem onClick={shareExportedListOnWhatsApp}>
                <MessageCircle className="w-4 h-4 mr-2" />
                Deel via WhatsApp
              </DropdownMenuItem>
            </>
          ) : null}

          <DropdownMenuSeparator />

          <ThemeToggleMenu />
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            onClick={handleSignOut}
            className="text-muted-foreground"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Uitloggen
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Leave Family Confirmation Dialog */}
      <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Familie verlaten?</AlertDialogTitle>
            <AlertDialogDescription>
              Weet je zeker dat je de familie "{currentFamily?.familyName}" wilt verlaten? 
              Je verliest toegang tot de gedeelde boodschappenlijst en kunt alleen opnieuw 
              toetreden als een admin je uitnodigt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmLeaveFamily}
              className="bg-red-600 hover:bg-red-700"
              disabled={leaveFamilyMutation.isPending}
            >
              {leaveFamilyMutation.isPending ? "Bezig..." : "Familie Verlaten"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteAccountDialog} onOpenChange={setShowDeleteAccountDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Account verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              {adminFamilies.length > 0
                ? `Als admin verwijder je ook de families: ${adminFamilies
                    .map((family) => `"${family.familyName}"`)
                    .join(', ')}.`
                : "Je verliest toegang tot alle gedeelde boodschappenlijsten."}
              {adminFamilies.length > 0 ? " Deze actie kan niet ongedaan worden gemaakt." : " Dit kan niet ongedaan worden gemaakt."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteAccountMutation.isPending}>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteAccount}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteAccountMutation.isPending}
            >
              {deleteAccountMutation.isPending ? "Bezig..." : "Verwijder account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
