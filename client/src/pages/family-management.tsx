import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useFamilyStatus } from "@/hooks/use-family-status";
import { useCurrentFamily } from "@/hooks/use-current-family";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { toastApiError } from "@/lib/api-error";
import { FamilyInviteShare } from "@/components/family-invite-share";
import { ArrowLeft, Users, UserX, Trash2, Pencil, Check, X, Crown } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
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

interface FamilyMember {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  role: string;
  joinedAt: string;
}

interface FamilyDetails {
  id: string;
  name: string;
  code: string;
  members: FamilyMember[];
  userRole: string;
}

export default function FamilyManagement() {
  const [, setLocation] = useLocation();
  const params = useParams();
  const { allFamilies, familiesLoading } = useFamilyStatus();
  const { currentFamilyId } = useCurrentFamily();
  const { user } = useAuth();
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState("");
  const [transferTarget, setTransferTarget] = useState<FamilyMember | null>(null);
  const queryClient = useQueryClient();

  const familyId = params.familyId || currentFamilyId;
  
  // Find user's role in this family
  const userFamily = allFamilies.find(f => f.familyId === familyId);
  const isAdmin = userFamily?.role === "admin";

  // Fetch family details including members - only for admins
  const { data: family, isLoading, error } = useQuery<FamilyDetails>({
    queryKey: ["/api/family/details", familyId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/family/details/${familyId}`);
      return response.json();
    },
    retry: 1,
    enabled: !familiesLoading && isAdmin && !!familyId,
  });

  // Log for debugging
  console.log("Family management - familiesLoading:", familiesLoading, "role:", userFamily?.role, "isLoading:", isLoading, "error:", error, "family:", family);

  // Remove member mutation - MUST be before any conditional returns
  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const response = await apiRequest("DELETE", `/api/family/members/${memberId}?familyId=${encodeURIComponent(familyId || "")}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/family/details", familyId] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/families"] });
    },
    onError: (error) => {
      toastApiError(toast, error, "Kon familielid niet verwijderen.");
    },
  });

  // Delete family mutation
  const deleteFamilyMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", `/api/family/details/${familyId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/families"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/family"] });
      setLocation("/families");
    },
    onError: (error) => {
      toastApiError(toast, error, "Kon familie niet verwijderen.");
    },
  });

  // Rename family mutation
  const renameFamilyMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await apiRequest("PATCH", `/api/family/details/${familyId}`, { name });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/family/details", familyId] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/families"] });
      setIsEditingName(false);
      toast({ title: "Naam gewijzigd", description: "De familienaam is succesvol gewijzigd." });
    },
    onError: (error) => {
      toastApiError(toast, error, "Kon de familienaam niet wijzigen.");
    },
  });

  // Transfer admin role mutation
  const transferAdminMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const response = await apiRequest("POST", "/api/family/transfer-admin", { familyId, memberId });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/family/details", familyId] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/families"] });
      setTransferTarget(null);
      toast({ title: "Admin overgedragen", description: "De admin-rol is succesvol overgedragen." });
    },
    onError: (error) => {
      toastApiError(toast, error, "Kon de admin-rol niet overdragen.");
    },
  });

  // Redirect if not admin (only after family data is loaded)
  useEffect(() => {
    if (!familiesLoading && !isAdmin) {
      console.log("Redirecting non-admin user, role:", userFamily?.role);
      setLocation("/families");
    }
  }, [familiesLoading, isAdmin, userFamily?.role, setLocation]);

  // Show loading while family membership is being checked
  if (familiesLoading) {
    return (
      <div className="max-w-md mx-auto bg-white min-h-screen shadow-lg">
        <div className="bg-primary text-white p-4 sticky top-0 z-50 shadow-md">
          <h1 className="text-lg font-semibold">Laden...</h1>
        </div>
        <div className="p-4">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  // Return null if not admin (will redirect via useEffect)
  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto bg-white min-h-screen shadow-lg">
        <div className="bg-primary text-white p-4 sticky top-0 z-50 shadow-md">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="sm" onClick={() => setLocation("/families")} className="text-white hover:bg-white/20">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-lg font-semibold">Geen toegang</h1>
          </div>
        </div>
        <div className="p-4">
          <Alert>
            <AlertDescription>
              Je hebt geen admin-rechten voor deze familie.
            </AlertDescription>
          </Alert>
          <Button onClick={() => setLocation("/families")} className="mt-4">
            Terug naar families
          </Button>
        </div>
      </div>
    );
  }

  const handleRemoveMember = (member: FamilyMember) => {
    if (member.role === "admin") {
      toast({
        title: "Niet toegestaan",
        description: "Je kunt de admin niet verwijderen.",
        variant: "destructive",
      });
      return;
    }
    
    if (confirm(`Weet je zeker dat je ${member.userName || member.userEmail} wilt verwijderen?`)) {
      removeMemberMutation.mutate(member.id);
    }
  };

  const handleDeleteFamily = () => {
    setShowDeleteDialog(true);
  };

  const confirmDeleteFamily = () => {
    deleteFamilyMutation.mutate();
    setShowDeleteDialog(false);
  };

  const handleStartRename = () => {
    setEditName(family?.name || "");
    setIsEditingName(true);
  };

  const handleConfirmRename = () => {
    const trimmed = editName.trim();
    if (!trimmed) {
      toast({ title: "Ongeldig", description: "De naam mag niet leeg zijn.", variant: "destructive" });
      return;
    }
    renameFamilyMutation.mutate(trimmed);
  };

  const handleCancelRename = () => {
    setIsEditingName(false);
    setEditName("");
  };

  const handleTransferAdmin = (member: FamilyMember) => {
    setTransferTarget(member);
  };

  const confirmTransferAdmin = () => {
    if (transferTarget) {
      transferAdminMutation.mutate(transferTarget.id);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-md mx-auto bg-white min-h-screen shadow-lg">
        <div className="bg-primary text-white p-4 sticky top-0 z-50 shadow-md">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="sm" onClick={() => setLocation("/families")} className="text-white hover:bg-white/20">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-lg font-semibold">Familie Beheer</h1>
          </div>
        </div>
        <div className="p-4 space-y-4">
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto bg-white min-h-screen shadow-lg">
        <div className="bg-primary text-white p-4 sticky top-0 z-50 shadow-md">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="sm" onClick={() => setLocation("/families")} className="text-white hover:bg-white/20">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-lg font-semibold">Familie Beheer</h1>
          </div>
        </div>
        <div className="p-4">
          <Alert>
            <AlertDescription>
              <strong>Fout bij laden familie gegevens:</strong> {error.message}
            </AlertDescription>
          </Alert>
          <Button onClick={() => setLocation("/families")} className="mt-4">
            Terug naar families
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen shadow-lg">
      {/* Header */}
      <header className="bg-primary text-white p-4 sticky top-0 z-50 shadow-md">
        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/families")} className="text-white hover:bg-white/20">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-lg font-semibold">Familie Beheer</h1>
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* Family Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="w-5 h-5" />
              {isEditingName ? (
                <div className="flex items-center space-x-2 flex-1">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleConfirmRename();
                      if (e.key === "Escape") handleCancelRename();
                    }}
                    maxLength={100}
                    autoFocus
                    className="h-8"
                    disabled={renameFamilyMutation.isPending}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleConfirmRename}
                    disabled={renameFamilyMutation.isPending}
                    className="h-8 w-8 p-0"
                  >
                    <Check className="w-4 h-4 text-green-600" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCancelRename}
                    disabled={renameFamilyMutation.isPending}
                    className="h-8 w-8 p-0"
                  >
                    <X className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <span>{family?.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleStartRename}
                    className="h-7 w-7 p-0 text-gray-400 hover:text-gray-600"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            </CardTitle>
            <CardDescription>
              Beheer je familie en nodig nieuwe leden uit
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {family?.code ? <FamilyInviteShare familyCode={family.code} /> : null}
          </CardContent>
        </Card>

        {/* Members List */}
        <Card>
          <CardHeader>
            <CardTitle>Familieleden ({family?.members?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            {family?.members && family.members.length > 0 ? (
              <div className="space-y-3">
                {family.members.map((member) => {
                  const canManageMember = member.role !== "admin" && member.userId !== user?.id;

                  return (
                    <div key={member.id} className="p-3 border rounded-lg">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">
                            {member.userName || member.userEmail}
                          </span>
                          <Badge
                            variant="secondary"
                            className={member.role === "admin"
                              ? "shrink-0 gap-1 border-amber-200 bg-amber-100 text-amber-800 leading-none"
                              : "shrink-0 leading-none"
                            }
                          >
                            {member.role === "admin" ? (
                              <>
                                <Crown className="h-3.5 w-3.5 text-amber-600" />
                                Admin
                              </>
                            ) : (
                              "Lid"
                            )}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500 truncate">{member.userEmail}</p>
                        <p className="text-xs text-gray-400">
                          Lid sinds {new Date(member.joinedAt).toLocaleDateString("nl-NL")}
                        </p>
                      </div>
                      {canManageMember && (
                        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTransferAdmin(member)}
                            className="h-8 rounded-full border-amber-200 bg-amber-50 px-3 text-xs text-amber-700 hover:bg-amber-100 hover:text-amber-800"
                            disabled={transferAdminMutation.isPending}
                            title="Admin maken"
                            aria-label={`${member.userName || member.userEmail} admin maken`}
                          >
                            <Crown className="w-4 h-4" />
                            Admin maken
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveMember(member)}
                            className="h-8 rounded-full px-3 text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
                            disabled={removeMemberMutation.isPending}
                            title="Familielid verwijderen"
                            aria-label={`${member.userName || member.userEmail} verwijderen`}
                          >
                            <UserX className="w-4 h-4" />
                            Verwijderen
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">Geen familieleden gevonden</p>
            )}
          </CardContent>
        </Card>

        <Alert>
          <AlertDescription>
            <strong>Let op:</strong> Als admin ben je de eigenaar van deze familie. Je kunt de familie niet verlaten zonder deze te verwijderen.
          </AlertDescription>
        </Alert>

        {/* Delete Family Section */}
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-700 flex items-center space-x-2">
              <Trash2 className="w-5 h-5" />
              <span>Gevaarlijke Zone</span>
            </CardTitle>
            <CardDescription>
              Permanente acties die niet ongedaan gemaakt kunnen worden
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="destructive" 
              onClick={handleDeleteFamily}
              disabled={deleteFamilyMutation.isPending}
              className="w-full"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {deleteFamilyMutation.isPending ? "Verwijderen..." : "Familie Verwijderen"}
            </Button>
            <p className="text-xs text-gray-500 mt-2">
              Dit verwijdert de familie definitief inclusief alle boodschappenlijsten en leden.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Delete Family Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-700">Familie definitief verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>Deze actie kan niet ongedaan worden gemaakt!</strong>
              <br /><br />
              Door de familie "{family?.name}" te verwijderen wordt het volgende permanent gewist:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Alle familieleden worden uit de familie verwijderd</li>
                <li>Alle boodschappenlijsten en items worden gewist</li>
                <li>De familiecode wordt ongeldig</li>
                <li>Deze actie is onomkeerbaar</li>
              </ul>
              <br />
              Weet je zeker dat je door wilt gaan?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteFamily}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteFamilyMutation.isPending}
            >
              {deleteFamilyMutation.isPending ? "Verwijderen..." : "Ja, Familie Verwijderen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Transfer Admin Confirmation Dialog */}
      <AlertDialog open={!!transferTarget} onOpenChange={(open) => { if (!open) setTransferTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Admin-rol overdragen?</AlertDialogTitle>
            <AlertDialogDescription>
              Je staat de admin-rol over aan <strong>{transferTarget?.userName || transferTarget?.userEmail}</strong>.
              <br /><br />
              Hierna word jij een gewoon familielid en kan je de familie niet meer beheren.
              <br /><br />
              Weet je zeker dat je door wilt gaan?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmTransferAdmin}
              disabled={transferAdminMutation.isPending}
            >
              {transferAdminMutation.isPending ? "Overdragen..." : "Ja, Admin Overdragen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
