import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Field';

export default function AuthPage() {
  const { session, isConfigured, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (session) return <Navigate to="/" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    const result = mode === 'signin' ? await signIn(email, password) : await signUp(email, password, fullName);

    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else if (mode === 'signup') {
      setInfo("Compte créé ! Vérifie ta boîte mail pour confirmer ton adresse, puis connecte-toi.");
      setMode('signin');
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] px-4">
      <div className="w-full max-w-sm fade-in">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl">
            <img src="/logo-glowup.png" alt="GlowUp" className="h-full w-full object-cover" />
          </div>
          <h1 className="font-display text-2xl font-semibold">GlowUp</h1>
          <p className="text-sm text-[var(--color-text-muted)]">Ton second cerveau, centralisé.</p>
        </div>

        {!isConfigured && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 p-3 text-xs text-[var(--color-warning)]">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <span>
              Supabase n'est pas encore configuré (fichier .env). L'authentification est indisponible tant que
              VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY ne sont pas renseignées. Voir le README.
            </span>
          </div>
        )}

        <div className="mb-6 flex rounded-xl border border-[var(--color-border)] p-1">
          <button
            onClick={() => setMode('signin')}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${mode === 'signin' ? 'bg-[var(--color-violet)] text-white' : 'text-[var(--color-text-muted)]'}`}
          >
            Connexion
          </button>
          <button
            onClick={() => setMode('signup')}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${mode === 'signup' ? 'bg-[var(--color-violet)] text-white' : 'text-[var(--color-text-muted)]'}`}
          >
            Inscription
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <Label>Nom complet</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ton nom" required />
            </div>
          )}
          <div>
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="toi@exemple.com" required />
          </div>
          <div>
            <Label>Mot de passe</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" minLength={6} required />
          </div>

          {error && <p className="text-xs text-[var(--color-danger)]">{error}</p>}
          {info && <p className="text-xs text-[var(--color-success)]">{info}</p>}

          <Button type="submit" variant="primary" className="w-full" disabled={loading || !isConfigured}>
            {loading ? 'Chargement…' : mode === 'signin' ? 'Se connecter' : "Créer mon compte"}
          </Button>
        </form>
      </div>
    </div>
  );
}
