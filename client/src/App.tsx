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

function AuthenticatedApp() {
  const { user, loading: authLoading } = useAuth();
  const { hasFamily, loading: familyLoading } = useFamilyStatus();

  if (authLoading || familyLoading) {
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

  // If user is authenticated but doesn't belong to a family, show family setup
  if (!hasFamily) {
    return <FamilySetup />;
  }

  // User is authenticated and has a family, show the grocery list
  return (
    <div className="min-h-screen bg-background">
      <Switch>
        <Route path="/family-setup" component={FamilySetup} />
        <Route path="/family-management" component={FamilyManagement} />
        <Route path="/" component={GroceryList} />
        <Route path="*" component={GroceryList} />
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
