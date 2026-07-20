import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Plus, Key, LogOut } from 'lucide-react';
import { useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { normalizeJoinCodeInput } from '@/lib/family-code';
import { clearPendingJoinCode, resolveInitialJoinCode } from '@/lib/family-invite';
import { getUserDisplayName } from '@/lib/user-display-name';
import { useToast } from '@/hooks/use-toast';
import { userFamiliesQueryKey } from '@/hooks/use-family-status';
import { maxLengthInputProps } from '@/lib/api-error';

export default function FamilySetup() {
  const [, setLocation] = useLocation();
  const { user, session, signOut } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('create');
  const redirectTimerRef = useRef<number | null>(null);

  const [familyName, setFamilyName] = useState('');
  const [familyCode, setFamilyCode] = useState('');

  useEffect(() => () => {
    if (redirectTimerRef.current !== null) {
      window.clearTimeout(redirectTimerRef.current);
    }
  }, []);

  const scheduleFamiliesRedirect = () => {
    if (redirectTimerRef.current !== null) {
      window.clearTimeout(redirectTimerRef.current);
    }
    redirectTimerRef.current = window.setTimeout(() => {
      redirectTimerRef.current = null;
      setLocation("/families");
    }, 1500);
  };

  useEffect(() => {
    const code = resolveInitialJoinCode();
    if (!code) {
      return;
    }

    setFamilyCode(code);
    setActiveTab('join');
    clearPendingJoinCode();
  }, []);

  const handleCreateFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/families', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ name: familyName }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Kon familie niet aanmaken");
      }

      const { family } = await response.json();
      setSuccess(`Familie "${family.name}" aangemaakt! Familie code: ${family.code}`);

      queryClient.invalidateQueries({ queryKey: userFamiliesQueryKey(user?.id ?? null) });

      scheduleFamiliesRedirect();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Er ging iets mis');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/families/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ code: familyCode.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Kon niet bij familie voegen');
      }

      const { family } = await response.json();
      setSuccess(`Welkom bij familie "${family.name}"!`);

      queryClient.invalidateQueries({ queryKey: userFamiliesQueryKey(user?.id ?? null) });

      scheduleFamiliesRedirect();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Er ging iets mis');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen min-h-[100dvh] bg-background flex items-start justify-center p-3 py-4 sm:items-center sm:p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="p-4 text-center sm:p-6">
          <div className="flex justify-center mb-4">
            <div className="bg-primary text-white p-3 rounded-full">
              <Users className="w-8 h-8" />
            </div>
          </div>
          <h1 className="text-2xl font-semibold leading-none tracking-tight">Familie Setup</h1>
          <CardDescription>
            Maak een nieuwe familie aan of sluit je aan bij een bestaande familie
          </CardDescription>
          <div className="flex flex-col gap-2 mt-4 pt-4 border-t min-[380px]:flex-row min-[380px]:items-center min-[380px]:justify-between">
            <span className="min-w-0 break-words text-sm text-muted-foreground">
              Ingelogd als: {getUserDisplayName(user)}
            </span>
            <Button variant="ghost" className="min-h-11 self-center min-[380px]:self-auto" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Uitloggen
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid h-auto min-h-11 w-full grid-cols-2">
              <TabsTrigger value="create" className="min-w-0 px-2 text-xs min-[380px]:text-sm">
                <Plus className="w-4 h-4 mr-1 min-[380px]:mr-2" />
                Nieuwe Familie
              </TabsTrigger>
              <TabsTrigger value="join" className="min-w-0 px-2 text-xs min-[380px]:text-sm">
                <Key className="w-4 h-4 mr-1 min-[380px]:mr-2" />
                Familie Joinen
              </TabsTrigger>
            </TabsList>

            <TabsContent value="create" className="space-y-4">
              <form onSubmit={handleCreateFamily} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="familyName">Familie Naam</Label>
                  <Input
                    id="familyName"
                    type="text"
                    placeholder="Familie Jansen"
                    value={familyName}
                    onChange={(e) => setFamilyName(e.target.value)}
                    required
                    {...maxLengthInputProps(100, toast)}
                  />
                  <p className="text-sm text-muted-foreground">
                    Deze naam zien andere familieleden
                  </p>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Bezig...' : 'Familie Aanmaken'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="join" className="space-y-4">
              <form onSubmit={handleJoinFamily} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="familyCode">Familie Code</Label>
                  <Input
                    id="familyCode"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    placeholder="123456"
                    value={familyCode}
                    onChange={(e) => setFamilyCode(normalizeJoinCodeInput(e.target.value))}
                    maxLength={6}
                    required
                  />
                  <p className="text-sm text-muted-foreground">
                    Vraag de 6-cijferige code aan een familielid
                  </p>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Bezig...' : 'Bij Familie Voegen'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mt-4 border-green-500/30 bg-green-500/10">
              <AlertDescription className="text-green-700 dark:text-green-300">
                {success}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
