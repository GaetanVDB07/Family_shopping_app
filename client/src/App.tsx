import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { useFamilyStatus } from "@/hooks/use-family-status";
import GroceryList from "@/pages/grocery-list";
import AuthPage from "@/pages/auth";
import FamilySetup from "@/pages/family-setup";
import FamilyManagement from "@/pages/family-management";
import FamiliesOverview from "@/pages/families-overview";

function AuthenticatedApp() {
  const { user, loading: authLoading } = useAuth();
  const { hasFamilies, familiesLoading } = useFamilyStatus();

  if (authLoading || familiesLoading) {
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
        <Route path="/" component={FamiliesOverview} />
        <Route path="*" component={FamiliesOverview} />
      </Switch>
    </div>
  );
}

function App() {
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
