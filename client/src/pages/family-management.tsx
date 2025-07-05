import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useFamilyStatus } from "@/hooks/use-family-status";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Users, Copy, Check, UserX, Trash2 } from "lucide-react";
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
}

export default function FamilyManagement() {
  const [, setLocation] = useLocation();
  const { familyMembership, loading: familyLoading } = useFamilyStatus();
  const { user } = useAuth();
  const { toast } = useToast();
  const [copiedCode, setCopiedCode] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const queryClient = useQueryClient();

  // Fetch family details including members - MUST be before any conditional returns
  const { data: family, isLoading, error } = useQuery<FamilyDetails>({
    queryKey: ["/api/family/details"],
    retry: 1,
    enabled: !familyLoading && familyMembership?.role === "admin", // Only run if admin
  });

  // Log for debugging
  console.log("Family management - familyLoading:", familyLoading, "role:", familyMembership?.role, "isLoading:", isLoading, "error:", error, "family:", family);

  // Remove member mutation - MUST be before any conditional returns
  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const response = await apiRequest("DELETE", `/api/family/members/${memberId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/family/details"] });
      toast({
        title: "Lid verwijderd",
        description: "Het familielid is succesvol verwijderd.",
      });
    },
    onError: () => {
      toast({
        title: "Fout",
        description: "Kon familielid niet verwijderen.",
        variant: "destructive",
      });
    },
  });

  // Delete family mutation
  const deleteFamilyMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", "/api/family");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/family"] });
      toast({
        title: "Familie verwijderd",
        description: "De familie is succesvol verwijderd.",
      });
      setLocation("/family-setup");
    },
    onError: () => {
      toast({
        title: "Fout",
        description: "Kon familie niet verwijderen.",
        variant: "destructive",
      });
    },
  });

  // Redirect if not admin (only after family data is loaded)
  useEffect(() => {
    if (!familyLoading && familyMembership?.role !== "admin") {
      console.log("Redirecting non-admin user, role:", familyMembership?.role);
      setLocation("/");
    }
  }, [familyLoading, familyMembership?.role, setLocation]);

  // Show loading while family membership is being checked
  if (familyLoading) {
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
  if (familyMembership?.role !== "admin") {
    return null;
  }

  const handleCopyCode = async () => {
    if (family?.code) {
      try {
        await navigator.clipboard.writeText(family.code);
        setCopiedCode(true);
        toast({
          title: "Code gekopieerd",
          description: "De familiecode is gekopieerd naar het klembord.",
        });
        setTimeout(() => setCopiedCode(false), 2000);
      } catch (err) {
        toast({
          title: "Fout",
          description: "Kon code niet kopiëren.",
          variant: "destructive",
        });
      }
    }
  };

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

  if (isLoading) {
    return (
      <div className="max-w-md mx-auto bg-white min-h-screen shadow-lg">
        <div className="bg-primary text-white p-4 sticky top-0 z-50 shadow-md">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="sm" onClick={() => setLocation("/")} className="text-white hover:bg-white/20">
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
            <Button variant="ghost" size="sm" onClick={() => setLocation("/")} className="text-white hover:bg-white/20">
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
          <Button onClick={() => setLocation("/")} className="mt-4">
            Terug naar boodschappenlijst
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
          <Button variant="ghost" size="sm" onClick={() => setLocation("/")} className="text-white hover:bg-white/20">
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
              <span>{family?.name}</span>
            </CardTitle>
            <CardDescription>
              Beheer je familie en nodig nieuwe leden uit
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Familie Code</label>
              <div className="flex items-center space-x-2 mt-1">
                <Input 
                  value={family?.code || ""} 
                  readOnly 
                  className="font-mono text-center tracking-wider"
                />
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleCopyCode}
                  className="flex-shrink-0"
                >
                  {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Deel deze code met familieleden om hen uit te nodigen
              </p>
            </div>
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
                {family.members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">
                          {member.userName || member.userEmail}
                        </span>
                        <Badge variant={member.role === "admin" ? "default" : "secondary"}>
                          {member.role === "admin" ? "Admin" : "Lid"}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500">{member.userEmail}</p>
                      <p className="text-xs text-gray-400">
                        Lid sinds {new Date(member.joinedAt).toLocaleDateString("nl-NL")}
                      </p>
                    </div>
                    {member.role !== "admin" && member.userId !== user?.id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveMember(member)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        disabled={removeMemberMutation.isPending}
                      >
                        <UserX className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
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
    </div>
  );
}
