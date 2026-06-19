import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Plus, Key, LogOut } from 'lucide-react';
import { useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { normalizeJoinCodeInput } from '@/lib/family-code';
import { clearPendingJoinCode, resolveInitialJoinCode } from '@/lib/family-invite';
import { getUserDisplayName } from '@/lib/user-display-name';
import { useToast } from '@/hooks/use-toast';
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

  const [familyName, setFamilyName] = useState('');
  const [familyCode, setFamilyCode] = useState('');

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

      queryClient.invalidateQueries({ queryKey: ["/api/user/family"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/families"] });

      setTimeout(() => {
        setLocation("/families");
      }, 1500);
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

      queryClient.invalidateQueries({ queryKey: ["/api/user/family"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/families"] });

      setTimeout(() => {
        setLocation("/families");
      }, 1500);
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
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-primary text-white p-3 rounded-full">
              <Users className="w-8 h-8" />
            </div>
          </div>
          <CardTitle className="text-2xl">Familie Setup</CardTitle>
          <CardDescription>
            Maak een nieuwe familie aan of sluit je aan bij een bestaande familie
          </CardDescription>
          <div className="flex justify-between items-center mt-4 pt-4 border-t">
            <span className="text-sm text-muted-foreground">
              Ingelogd als: {getUserDisplayName(user)}
            </span>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Uitloggen
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="create">
                <Plus className="w-4 h-4 mr-2" />
                Nieuwe Familie
              </TabsTrigger>
              <TabsTrigger value="join">
                <Key className="w-4 h-4 mr-2" />
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
