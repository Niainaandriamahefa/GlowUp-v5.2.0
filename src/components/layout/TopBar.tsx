import { useState } from 'react';
import { Menu, Wifi, WifiOff, RefreshCw, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useGlowUpData } from '@/context/GlowUpContext';
import { Button } from '@/components/ui/Button';

export function TopBar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { user, signOut, isConfigured } = useAuth();
  const { isOnline, isSyncing, refreshFromCloud } = useGlowUpData();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg)]/90 px-4 py-3 backdrop-blur-md md:px-6">
      <button onClick={onOpenMenu} className="rounded-lg p-2 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)] md:hidden">
        <Menu size={20} />
      </button>

      <div className="hidden md:block" />

      <div className="flex items-center gap-3">
        <div
          className="flex items-center gap-1.5 rounded-full border border-[var(--color-border)] px-3 py-1 text-xs text-[var(--color-text-muted)]"
          title={isConfigured ? (isOnline ? 'Connecté à Supabase' : 'Hors ligne — les changements seront synchronisés au retour du réseau') : 'Supabase non configuré — mode local uniquement'}
        >
          {!isConfigured ? (
            <>
              <WifiOff size={13} /> Mode local
            </>
          ) : isOnline ? (
            <>
              <Wifi size={13} className="text-[var(--color-success)]" /> Synchronisé
            </>
          ) : (
            <>
              <WifiOff size={13} className="text-[var(--color-warning)]" /> Hors ligne
            </>
          )}
          {isSyncing && <RefreshCw size={13} className="animate-spin" />}
        </div>

        {isConfigured && (
          <Button variant="ghost" size="icon" onClick={() => refreshFromCloud()} title="Synchroniser maintenant">
            <RefreshCw size={16} />
          </Button>
        )}

        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-violet)]/20 text-sm font-semibold text-[var(--color-violet-soft)]"
          >
            {(user?.email?.[0] ?? '?').toUpperCase()}
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-10 w-56 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-2 shadow-xl fade-in">
              <p className="truncate px-2 py-1.5 text-xs text-[var(--color-text-muted)]">{user?.email}</p>
              <button
                onClick={signOut}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10"
              >
                <LogOut size={15} /> Déconnexion
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
