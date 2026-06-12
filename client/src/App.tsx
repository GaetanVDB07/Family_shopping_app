import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { useFamilyStatus } from "@/hooks/use-family-status";
import { useCurrentFamily } from "@/hooks/use-current-family";
import { useEffect } from "react";
import GroceryList from "@/pages/grocery-list";
import AuthPage, { ResetPasswordPage } from "@/pages/auth";
import FamilySetup from "@/pages/family-setup";
import FamilyManagement from "@/pages/family-management";
import FamiliesOverview from "@/pages/families-overview";
import { captureInviteCodeFromUrl } from "@/lib/family-invite";

function DefaultRedirect() {
  const [, setLocation] = useLocation();
  const { hasFamilies, familiesLoading } = useFamilyStatus();

  useEffect(() => {
    if (familiesLoading) {
      return;
    }

    if (hasFamilies) {
      setLocation("/families");
      return;
    }

    if (!hasFamilies && !familiesLoading) {
      setLocation("/family-setup");
    }
  }, [hasFamilies, familiesLoading, setLocation]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-gray-600 mobile-text">Laden...</p>
      </div>
    </div>
  );
}

function AuthenticatedApp() {
  const { user, loading: authLoading, isPasswordRecovery } = useAuth();
  const { hasFamilies, familiesLoading } = useFamilyStatus();
  const { isLoading: currentFamilyLoading } = useCurrentFamily();

  if (authLoading || familiesLoading || currentFamilyLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600 mobile-text">Laden...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  if (isPasswordRecovery) {
    return <ResetPasswordPage />;
  }

  // If user is authenticated but doesn't belong to any family, show family setup
  if (!hasFamilies) {
    return <FamilySetup />;
  }

  // User is authenticated and has families, show the appropriate routes
  return (
    <div className="min-h-screen bg-background">
      <Switch>
        <Route path="/families" component={FamiliesOverview} />
        <Route path="/family-setup" component={FamilySetup} />
        <Route path="/family-management/:familyId" component={FamilyManagement} />
        <Route path="/grocery-list/:familyId" component={GroceryList} />
        <Route path="/grocery-list" component={DefaultRedirect} />
        <Route path="/" component={DefaultRedirect} />
        <Route path="*" component={DefaultRedirect} />
      </Switch>
    </div>
  );
}

function App() {
  useEffect(() => {
    captureInviteCodeFromUrl();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <div className="min-h-screen bg-background">
            <Toaster />
            <AuthenticatedApp />
          </div>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
