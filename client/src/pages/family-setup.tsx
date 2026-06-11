import { useState } from 'react';
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

export default function FamilySetup() {
  const [, setLocation] = useLocation();
  const { user, session, signOut } = useAuth();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Create family state
  const [familyName, setFamilyName] = useState('');
  
  // Join family state
  const [familyCode, setFamilyCode] = useState('');

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
      
      // Invalidate family status query to trigger redirect
      queryClient.invalidateQueries({ queryKey: ["/api/user/family"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/families"] });
      
      // Small delay to show success message, then the App will automatically redirect
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
      
      // Invalidate family status query to trigger redirect
      queryClient.invalidateQueries({ queryKey: ["/api/user/family"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/families"] });
      
      // Small delay to show success message, then the App will automatically redirect
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
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
            <span className="text-sm text-gray-600">
              Ingelogd als: {user?.email}
            </span>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Uitloggen
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="create" className="w-full">
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
                    maxLength={100}
                  />
                  <p className="text-sm text-gray-500">
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
                  <p className="text-sm text-gray-500">
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
            <Alert className="mt-4 border-green-200 bg-green-50">
              <AlertDescription className="text-green-800">
                {success}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
