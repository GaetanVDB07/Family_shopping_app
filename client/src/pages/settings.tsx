import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { useLocation, useParams } from "wouter";
import {
  ArrowLeft,
  Copy,
  LogOut,
  MessageCircle,
  Monitor,
  Moon,
  Settings,
  Sun,
  Trash2,
  UserX,
  Users,
  Vibrate,
  Volume2,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { toastApiError } from "@/lib/api-error";
import { useAuth } from "@/hooks/use-auth";
import { useCurrentFamily } from "@/hooks/use-current-family";
import { useFamilyStatus, userFamiliesQueryKey } from "@/hooks/use-family-status";
import { useGroceryItems } from "@/hooks/use-grocery-items";
import { useToast } from "@/hooks/use-toast";
import {
  getCheckoffFeedbackPreferences,
  setCheckoffFeedbackPreferences,
  type CheckoffFeedbackPreferences,
} from "@/lib/checkoff-feedback";
import {
  buildWhatsAppShareUrl,
  formatGroceryListForExport,
} from "@/lib/export-grocery-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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

const THEME_OPTIONS = [
  { value: "light", label: "Licht", icon: Sun },
  { value: "dark", label: "Donker", icon: Moon },
  { value: "system", label: "Systeem", icon: Monitor },
] as const;

export function SettingsPage() {
  const [, setLocation] = useLocation();
  const params = useParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const { signOut, user } = useAuth();
  const { allFamilies } = useFamilyStatus();
  const { currentFamilyId } = useCurrentFamily();
  const familyId = params.familyId || currentFamilyId;
  const family = allFamilies.find((entry) => entry.familyId === familyId);
  const { data: groceryItems = [] } = useGroceryItems(familyId);
  const [preferences, setPreferences] = useState<CheckoffFeedbackPreferences>(
    () => getCheckoffFeedbackPreferences(),
  );
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [showDeleteAccountDialog, setShowDeleteAccountDialog] = useState(false);

  const isAdmin = family?.role === "admin";
  const adminFamilies = useMemo(
    () => allFamilies.filter((entry) => entry.role === "admin"),
    [allFamilies],
  );
  const exportText = useMemo(
    () => formatGroceryListForExport(groceryItems, family?.familyName),
    [family?.familyName, groceryItems],
  );

  const leaveFamilyMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/family/leave", { familyId });
      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: userFamiliesQueryKey(user?.id ?? null) });
      setShowLeaveDialog(false);
      setLocation("/families");
    },
    onError: (error) => {
      toastApiError(toast, error, "Kon familie niet verlaten. Probeer het opnieuw.");
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", "/api/user/account");
      return response.json();
    },
    onSuccess: async () => {
      queryClient.clear();
      await signOut();
      setLocation("/");
    },
    onError: (error: Error) => {
      toastApiError(toast, error, "Kon account niet verwijderen");
    },
  });

  const updatePreference = (key: keyof CheckoffFeedbackPreferences, enabled: boolean) => {
    const next = { ...preferences, [key]: enabled };
    setCheckoffFeedbackPreferences(next);
    setPreferences(next);
  };

  const handleCopyList = async () => {
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

  const handleSignOut = async () => {
    try {
      await signOut();
      setLocation("/");
    } catch (error) {
      toast({
        title: "Fout",
        description: error instanceof Error ? error.message : "Kon niet uitloggen.",
        variant: "destructive",
      });
    }
  };

  const backLocation = familyId ? `/grocery-list/${familyId}` : "/families";

  return (
    <div className="mx-auto min-h-screen min-h-[100dvh] max-w-md bg-background shadow-lg">
      <header
        className="sticky top-0 z-50 flex items-center gap-3 bg-primary px-4 pb-4 text-white shadow-md"
        style={{ paddingTop: "max(16px, env(safe-area-inset-top))" }}
      >
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 text-white hover:bg-white/20"
          onClick={() => setLocation(backLocation)}
          aria-label="Terug naar boodschappenlijst"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0">
          <h1 className="text-xl font-semibold">Instellingen</h1>
          <p className="truncate text-sm text-white/75">
            {family?.familyName || "Boodschappen"}
          </p>
        </div>
      </header>

      <main className="space-y-4 p-4 pb-[max(24px,env(safe-area-inset-bottom))]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sun className="h-5 w-5 text-primary" />
              Weergave
            </CardTitle>
            <CardDescription>Kies hoe de app eruitziet.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2" role="group" aria-label="Kleurthema">
              {THEME_OPTIONS.map((option) => {
                const Icon = option.icon;
                const selected = theme === option.value;
                return (
                  <Button
                    key={option.value}
                    type="button"
                    variant={selected ? "default" : "outline"}
                    className="h-auto min-h-16 flex-col gap-1 px-2 py-2"
                    onClick={() => setTheme(option.value)}
                    aria-pressed={selected}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-xs">{option.label}</span>
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Vibrate className="h-5 w-5 text-primary" />
              Afvink-feedback
            </CardTitle>
            <CardDescription>Bepaal wat je voelt en hoort bij het afvinken.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="flex min-h-16 items-center justify-between gap-4 border-b py-3">
              <Label htmlFor="haptic-feedback" className="flex min-w-0 items-center gap-3">
                <Vibrate className="h-5 w-5 shrink-0 text-muted-foreground" />
                <span>
                  <span className="block font-medium">Trillen</span>
                  <span className="block text-sm font-normal text-muted-foreground">Korte trilling bij afvinken</span>
                </span>
              </Label>
              <Switch
                id="haptic-feedback"
                checked={preferences.haptic}
                onCheckedChange={(enabled) => updatePreference("haptic", enabled)}
              />
            </div>
            <div className="flex min-h-16 items-center justify-between gap-4 py-3">
              <Label htmlFor="sound-feedback" className="flex min-w-0 items-center gap-3">
                <Volume2 className="h-5 w-5 shrink-0 text-muted-foreground" />
                <span>
                  <span className="block font-medium">Geluid</span>
                  <span className="block text-sm font-normal text-muted-foreground">Kort geluid bij afvinken</span>
                </span>
              </Label>
              <Switch
                id="sound-feedback"
                checked={preferences.sound}
                onCheckedChange={(enabled) => updatePreference("sound", enabled)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageCircle className="h-5 w-5 text-primary" />
              Lijst delen
            </CardTitle>
            <CardDescription>Deel de openstaande boodschappen met iemand anders.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 min-[380px]:grid-cols-2">
            <Button variant="outline" onClick={() => void handleCopyList()}>
              <Copy className="h-4 w-4" />
              Lijst kopiëren
            </Button>
            <Button
              variant="outline"
              onClick={() => window.open(buildWhatsAppShareUrl(exportText), "_blank", "noopener,noreferrer")}
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-primary" />
              Familie
            </CardTitle>
            <CardDescription>
              Je bent {isAdmin ? "admin" : "lid"} van {family?.familyName || "deze familie"}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isAdmin && familyId ? (
              <Button className="w-full" onClick={() => setLocation(`/family-management/${familyId}`)}>
                <Settings className="h-4 w-4" />
                Familie beheren
              </Button>
            ) : (
              <Button variant="outline" className="w-full text-destructive" onClick={() => setShowLeaveDialog(true)}>
                <UserX className="h-4 w-4" />
                Familie verlaten
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="border-destructive/20">
          <CardHeader>
            <CardTitle className="text-lg">Account</CardTitle>
            <CardDescription>Beheer je sessie en accountgegevens.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full" onClick={() => void handleSignOut()}>
              <LogOut className="h-4 w-4" />
              Uitloggen
            </Button>
            <Button
              variant="ghost"
              className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setShowDeleteAccountDialog(true)}
            >
              <Trash2 className="h-4 w-4" />
              Account verwijderen
            </Button>
          </CardContent>
        </Card>
      </main>

      <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Familie verlaten?</AlertDialogTitle>
            <AlertDialogDescription>
              Je verliest toegang tot de gedeelde boodschappenlijst van {family?.familyName}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={leaveFamilyMutation.isPending}>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => leaveFamilyMutation.mutate()}
              disabled={leaveFamilyMutation.isPending}
            >
              {leaveFamilyMutation.isPending ? "Bezig..." : "Familie verlaten"}
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
                ? `Je verwijdert ook de families die je beheert: ${adminFamilies.map((entry) => entry.familyName).join(", ")}. `
                : "Je verliest toegang tot alle gedeelde boodschappenlijsten. "}
              Deze actie kan niet ongedaan worden gemaakt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteAccountMutation.isPending}>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteAccountMutation.mutate()}
              disabled={deleteAccountMutation.isPending}
            >
              {deleteAccountMutation.isPending ? "Bezig..." : "Account verwijderen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default SettingsPage;
