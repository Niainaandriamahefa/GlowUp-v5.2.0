import { Link } from 'react-router-dom';
import { StickyNote, Target, Flag, Trophy, Wallet, Gem, ArrowRight } from 'lucide-react';
import { useGlowUpData } from '@/context/GlowUpContext';
import { Card } from '@/components/ui/Card';

const LINKS = [
  { to: '/notes', label: 'Notes', icon: StickyNote, color: '#A78BFA' },
  { to: '/objectifs', label: 'Objectifs du mois', icon: Target, color: '#FBBF24' },
  { to: '/big-goals', label: 'Big Goals', icon: Flag, color: '#FBBF24' },
  { to: '/challenges', label: 'Challenges', icon: Trophy, color: '#F97316' },
  { to: '/budget', label: 'Budget & Achats', icon: Wallet, color: '#F87171' },
  { to: '/qualites', label: 'Qualités', icon: Gem, color: '#34D399' },
];

export default function DiversPage() {
  const { data } = useGlowUpData();

  const counts: Record<string, number> = {
    '/notes': data.memos.filter((m) => !m.is_archived).length,
    '/objectifs': data.monthlyObjectives.filter((o) => !o.is_archived && !o.is_validated).length,
    '/big-goals': data.bigGoals.filter((g) => !g.is_archived && !g.is_validated).length,
    '/challenges': data.challenges.filter((c) => !c.is_archived).length,
    '/budget': data.budgetCategories.length,
    '/qualites': data.qualityNotes.length,
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Divers</h1>
        <p className="text-sm text-[var(--color-text-muted)]">Tout ce qui décortique tes idées et tes projets, au même endroit.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {LINKS.map(({ to, label, icon: Icon, color }) => (
          <Link key={to} to={to}>
            <Card className="flex items-center justify-between transition-transform hover:-translate-y-0.5">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: `${color}22` }}>
                  <Icon size={18} style={{ color }} />
                </div>
                <div>
                  <p className="font-medium">{label}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">{counts[to]} élément(s)</p>
                </div>
              </div>
              <ArrowRight size={16} className="text-[var(--color-text-faint)]" />
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
