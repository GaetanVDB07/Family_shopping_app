import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useFamilyStatus } from "@/hooks/use-family-status";
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
import { Menu, Settings, UserX, LogOut, Users } from "lucide-react";

export function UserMenu() {
  const [, setLocation] = useLocation();
  const { familyMembership } = useFamilyStatus();
  const { signOut } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);

  const isAdmin = familyMembership?.role === "admin";

  // Leave family mutation
  const leaveFamilyMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/family/leave");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/family"] });
      toast({
        title: "Familie verlaten",
        description: "Je hebt de familie succesvol verlaten.",
      });
      setLocation("/family-setup");
    },
    onError: () => {
      toast({
        title: "Fout",
        description: "Kon familie niet verlaten. Probeer het opnieuw.",
        variant: "destructive",
      });
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
      toast({
        title: "Fout",
        description: "Kon niet uitloggen. Probeer het opnieuw.",
        variant: "destructive",
      });
    }
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
            {familyMembership?.familyName}
          </div>
          <div className="px-2 py-1 text-xs text-gray-500">
            {isAdmin ? "Admin" : "Lid"}
          </div>
          <DropdownMenuSeparator />
          
          {isAdmin && (
            <DropdownMenuItem onClick={() => {
              console.log("Navigating to family management...");
              setLocation("/family-management");
            }}>
              <Users className="w-4 h-4 mr-2" />
              Familie Beheren
            </DropdownMenuItem>
          )}
          
          {!isAdmin && (
            <DropdownMenuItem 
              onClick={handleLeaveFamily}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <UserX className="w-4 h-4 mr-2" />
              Familie Verlaten
            </DropdownMenuItem>
          )}
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            onClick={handleSignOut}
            className="text-gray-600"
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
              Weet je zeker dat je de familie "{familyMembership?.familyName}" wilt verlaten? 
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
    </>
  );
}
