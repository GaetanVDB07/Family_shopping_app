import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { useFamilyStatus } from "@/hooks/use-family-status";
import { useEffect, lazy, Suspense, type ReactNode } from "react";
import { captureInviteCodeFromUrl } from "@/lib/family-invite";
import { ThemeProvider } from "@/components/theme-provider";
import { PageLoading } from "@/components/page-loading";
import { ServiceWorkerUpdatePrompt } from "@/components/service-worker-update-prompt";
import { Button } from "@/components/ui/button";
import { SpeedInsights } from "@vercel/speed-insights/react";

const GroceryList = lazy(() => import("@/pages/grocery-list"));
const AuthPage = lazy(() => import("@/pages/auth"));
const ResetPasswordPage = lazy(() =>
  import("@/pages/auth").then((module) => ({ default: module.ResetPasswordPage })),
);
const FamilySetup = lazy(() => import("@/pages/family-setup"));
const FamilyManagement = lazy(() => import("@/pages/family-management"));
const FamiliesOverview = lazy(() => import("@/pages/families-overview"));
const SettingsPage = lazy(() => import("@/pages/settings"));

function LazyPage({ children }: { children: ReactNode }) {
  return <Suspense fallback={<PageLoading />}>{children}</Suspense>;
}

function DefaultRedirect() {
  const [, setLocation] = useLocation();
  const { hasFamilies, familiesLoading, familyDataReady } = useFamilyStatus();

  useEffect(() => {
    if (familiesLoading || !familyDataReady) {
      return;
    }

    if (hasFamilies) {
      setLocation("/families");
      return;
    }

    if (!hasFamilies && !familiesLoading) {
      setLocation("/family-setup");
    }
  }, [familyDataReady, hasFamilies, familiesLoading, setLocation]);

  return <PageLoading />;
}

function FamilyStatusError({ onRetry }: { onRetry: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm rounded-xl border bg-card p-6 text-center shadow-sm">
        <h1 className="text-lg font-semibold">Families konden niet worden geladen</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Je bent nog ingelogd. Controleer je verbinding en probeer het opnieuw.
        </p>
        <Button className="mt-5 w-full" onClick={onRetry}>
          Opnieuw proberen
        </Button>
      </div>
    </main>
  );
}

function AuthenticatedApp() {
  const { user, loading: authLoading, isPasswordRecovery } = useAuth();
  const {
    hasFamilies,
    familiesLoading,
    familyDataReady,
    familyError,
    refetchFamilies,
  } = useFamilyStatus();

  if (authLoading) {
    return <PageLoading />;
  }

  if (!user) {
    return (
      <LazyPage>
        <AuthPage />
      </LazyPage>
    );
  }

  if (isPasswordRecovery) {
    return (
      <LazyPage>
        <ResetPasswordPage />
      </LazyPage>
    );
  }

  if (familiesLoading) {
    return <PageLoading />;
  }

  if (familyError) {
    return <FamilyStatusError onRetry={() => void refetchFamilies()} />;
  }

  if (!familyDataReady) {
    return <PageLoading />;
  }

  if (!hasFamilies) {
    return (
      <LazyPage>
        <FamilySetup />
      </LazyPage>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Switch>
        <Route path="/families">
          <LazyPage>
            <FamiliesOverview />
          </LazyPage>
        </Route>
        <Route path="/family-setup">
          <LazyPage>
            <FamilySetup />
          </LazyPage>
        </Route>
        <Route path="/family-management/:familyId">
          <LazyPage>
            <FamilyManagement />
          </LazyPage>
        </Route>
        <Route path="/grocery-list/:familyId">
          <LazyPage>
            <GroceryList />
          </LazyPage>
        </Route>
        <Route path="/settings/:familyId">
          <LazyPage>
            <SettingsPage />
          </LazyPage>
        </Route>
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
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <div className="min-h-screen bg-background">
              <Toaster />
              <ServiceWorkerUpdatePrompt />
              <AuthenticatedApp />
              <SpeedInsights />
            </div>
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
