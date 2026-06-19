import { useState, type ReactNode } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ShoppingCart, Eye, EyeOff } from 'lucide-react';
import { maxLengthInputProps } from '@/lib/api-error';
import { useToast } from '@/hooks/use-toast';

type AuthMode = 'login' | 'signup' | 'forgot';

function AuthShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-primary text-white p-3 rounded-full">
              <ShoppingCart className="w-8 h-8" />
            </div>
          </div>
          <CardTitle className="text-2xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </div>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  showPassword,
  onToggleShow,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  showPassword: boolean;
  onToggleShow: () => void;
  hint?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={showPassword ? 'text' : 'password'}
          placeholder="••••••••"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          minLength={6}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
          onClick={onToggleShow}
        >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
      </div>
      {hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { signIn, signUp, resetPasswordForEmail } = useAuth();
  const { toast } = useToast();

  const resetMessages = () => {
    setError('');
    setSuccess('');
  };

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    resetMessages();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    resetMessages();

    try {
      if (mode === 'forgot') {
        const result = await resetPasswordForEmail(email);
        if (result.error) {
          setError(result.error.message);
        } else {
          setSuccess('We hebben een resetlink naar je e-mailadres gestuurd.');
        }
        return;
      }

      const result =
        mode === 'login'
          ? await signIn(email, password)
          : await signUp(email, password, name.trim());

      if (result.error) {
        setError(result.error.message);
      }
    } catch {
      setError('Er is een onverwachte fout opgetreden');
    } finally {
      setLoading(false);
    }
  };

  const descriptions: Record<AuthMode, string> = {
    login: 'Log in op je account',
    signup: 'Maak een nieuw account aan',
    forgot: 'We sturen je een link om je wachtwoord te resetten',
  };

  return (
    <AuthShell title="Familie Boodschappenlijst" description={descriptions[mode]}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'signup' && (
          <div className="space-y-2">
            <Label htmlFor="name">Naam</Label>
            <Input
              id="name"
              type="text"
              placeholder="Je voornaam"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              {...maxLengthInputProps(50, toast)}
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="je@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        {mode !== 'forgot' && (
          <PasswordField
            id="password"
            label="Wachtwoord"
            value={password}
            onChange={setPassword}
            showPassword={showPassword}
            onToggleShow={() => setShowPassword(!showPassword)}
            hint={mode === 'signup' ? 'Minimaal 6 karakters' : undefined}
          />
        )}

        {mode === 'login' && (
          <div className="text-right">
            <Button
              type="button"
              variant="link"
              className="h-auto p-0 text-sm"
              onClick={() => switchMode('forgot')}
            >
              Wachtwoord vergeten?
            </Button>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading
            ? 'Bezig...'
            : mode === 'login'
              ? 'Inloggen'
              : mode === 'signup'
                ? 'Account aanmaken'
                : 'Resetlink versturen'}
        </Button>
      </form>

      <div className="mt-6 text-center space-y-2">
        {mode === 'forgot' ? (
          <Button variant="link" onClick={() => switchMode('login')} className="text-sm">
            Terug naar inloggen
          </Button>
        ) : (
          <Button
            variant="link"
            onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
            className="text-sm"
          >
            {mode === 'login'
              ? 'Nog geen account? Maak er een aan'
              : 'Al een account? Log in'}
          </Button>
        )}
      </div>
    </AuthShell>
  );
}

export function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { updatePassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password !== confirmPassword) {
      setError('Wachtwoorden komen niet overeen');
      return;
    }

    setLoading(true);

    try {
      const result = await updatePassword(password);
      if (result.error) {
        setError(result.error.message);
      } else {
        setSuccess('Je wachtwoord is bijgewerkt. Je kunt nu verder met de app.');
        setPassword('');
        setConfirmPassword('');
      }
    } catch {
      setError('Er is een onverwachte fout opgetreden');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Nieuw wachtwoord"
      description="Kies een nieuw wachtwoord voor je account"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <PasswordField
          id="new-password"
          label="Nieuw wachtwoord"
          value={password}
          onChange={setPassword}
          showPassword={showPassword}
          onToggleShow={() => setShowPassword(!showPassword)}
          hint="Minimaal 6 karakters"
        />

        <PasswordField
          id="confirm-password"
          label="Bevestig wachtwoord"
          value={confirmPassword}
          onChange={setConfirmPassword}
          showPassword={showConfirmPassword}
          onToggleShow={() => setShowConfirmPassword(!showConfirmPassword)}
        />

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <Button type="submit" className="w-full" disabled={loading || Boolean(success)}>
          {loading ? 'Bezig...' : 'Wachtwoord opslaan'}
        </Button>
      </form>
    </AuthShell>
  );
}
