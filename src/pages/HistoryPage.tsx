import { useMemo, useState } from 'react';
import { Search, ArrowUpDown, CheckCircle2 } from 'lucide-react';
import { useGlowUpData } from '@/context/GlowUpContext';
import type { HistoryModule } from '@/types';
import { Card } from '@/components/ui/Card';
import { Input, Select, Badge } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { todayISO, startOfWeekISO, currentMonth } from '@/lib/utils';

import { Archive, ArchiveRestore, Trash2 } from 'lucide-react';

const ACCOMPLISHMENT_KEYWORDS = ['accompli', 'atteint', 'réalisé', 'effectué', 'soldée', 'terminé'];

function isAccomplishmentEvent(action: string): boolean {
  const a = action.toLowerCase();
  return ACCOMPLISHMENT_KEYWORDS.some((k) => a.includes(k));
}

type PeriodPreset = 'all' | 'today' | 'week' | 'month' | 'custom';

const MODULE_LABEL: Record<HistoryModule, string> = {
  planning: 'Planning',
  todo: 'ToDo Priorité',
  habits: 'Habitudes',
  checklist: 'Checklist',
  objectifs: 'Objectifs',
  big_goals: 'Big Goals',
  challenges: 'Challenges',
  budget: 'Budget',
  dettes: 'Dettes',
  achats: 'Achats',
  epargne: 'Épargne',
  notes: 'Notes',
  journal: 'Journal',
  versets: 'Versets',
  citations: 'Citations',
  archive: 'Archive',
};

const MODULE_COLOR: Record<string, string> = {
  planning: '#8B5CF6',
  todo: '#60A5FA',
  habits: '#34D399',
  checklist: '#34D399',
  objectifs: '#FBBF24',
  big_goals: '#FBBF24',
  challenges: '#F97316',
  budget: '#F87171',
  dettes: '#F87171',
  achats: '#F87171',
  epargne: '#34D399',
  notes: '#A78BFA',
  journal: '#A78BFA',
  versets: '#F472B6',
  citations: '#F472B6',
  archive: '#6B7280',
};

type SortDir = 'desc' | 'asc';

export default function HistoryPage() {
  const { data, update, remove } = useGlowUpData();
  const [showArchived, setShowArchived] = useState(false);
  const [moduleFilter, setModuleFilter] = useState<'all' | HistoryModule>('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortDir>('desc');
  const [monthFilter, setMonthFilter] = useState('');
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [onlyAccomplishments, setOnlyAccomplishments] = useState(false);

  const filtered = useMemo(() => {
    let events = data.historyEvents.filter((e) => e.is_archived === showArchived);
    if (moduleFilter !== 'all') events = events.filter((e) => e.module === moduleFilter);
    if (monthFilter) events = events.filter((e) => e.occurred_at.slice(0, 7) === monthFilter);
    if (onlyAccomplishments) events = events.filter((e) => isAccomplishmentEvent(e.action));

    if (periodPreset === 'today') {
      const today = todayISO();
      events = events.filter((e) => e.occurred_at.slice(0, 10) === today);
    } else if (periodPreset === 'week') {
      const weekStart = startOfWeekISO();
      events = events.filter((e) => e.occurred_at.slice(0, 10) >= weekStart);
    } else if (periodPreset === 'month') {
      const month = currentMonth();
      events = events.filter((e) => e.occurred_at.slice(0, 7) === month);
    } else if (periodPreset === 'custom' && (customFrom || customTo)) {
      events = events.filter((e) => {
        const d = e.occurred_at.slice(0, 10);
        if (customFrom && d < customFrom) return false;
        if (customTo && d > customTo) return false;
        return true;
      });
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      events = events.filter(
        (e) => e.label.toLowerCase().includes(q) || e.action.toLowerCase().includes(q) || e.detail?.toLowerCase().includes(q)
      );
    }
    events.sort((a, b) =>
      sort === 'desc'
        ? new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()
        : new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime()
    );
    return events;
  }, [data.historyEvents, moduleFilter, search, sort, monthFilter, periodPreset, customFrom, customTo, onlyAccomplishments, showArchived]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Historique</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          Toutes tes actions importantes, tous modules confondus — {data.historyEvents.length} événements.
        </p>
      </div>

      <Card className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {([
            ['all', 'Tout'],
            ['today', 'Jour'],
            ['week', 'Semaine'],
            ['month', 'Mois'],
            ['custom', 'Période personnalisée'],
          ] as [PeriodPreset, string][]).map(([key, label]) => (
            <Button key={key} variant={periodPreset === key ? 'primary' : 'ghost'} size="sm" onClick={() => setPeriodPreset(key)}>
              {label}
            </Button>
          ))}
          <Button variant={onlyAccomplishments ? 'primary' : 'ghost'} size="sm" onClick={() => setOnlyAccomplishments((v) => !v)}>
            <CheckCircle2 size={13} /> Accomplissements
          </Button>
          <span className="mx-1 w-px self-stretch bg-[var(--color-border)]" />
          <Button variant={!showArchived ? 'primary' : 'ghost'} size="sm" onClick={() => setShowArchived(false)}>
            Actifs
          </Button>
          <Button variant={showArchived ? 'primary' : 'ghost'} size="sm" onClick={() => setShowArchived(true)}>
            <Archive size={13} /> Archivés
          </Button>
        </div>

        {periodPreset === 'custom' && (
          <div className="flex flex-wrap gap-3">
            <div>
              <label className="mb-1 block text-xs text-[var(--color-text-muted)]">Du</label>
              <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[var(--color-text-muted)]">Au</label>
              <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[160px] flex-1">
            <label className="mb-1 block text-xs text-[var(--color-text-muted)]">Recherche</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-faint)]" />
              <Input className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher…" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--color-text-muted)]">Module</label>
            <Select value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value as any)}>
              <option value="all">Tous</option>
              {Object.entries(MODULE_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--color-text-muted)]">Mois précis</label>
            <Input type="month" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} />
          </div>
          <button
            onClick={() => setSort((s) => (s === 'desc' ? 'asc' : 'desc'))}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-2 text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)]"
          >
            <ArrowUpDown size={13} /> {sort === 'desc' ? 'Plus récent' : 'Plus ancien'}
          </button>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <Card className="text-center text-sm text-[var(--color-text-faint)]">Aucun événement pour ces filtres.</Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((e) => (
            <Card key={e.id} className="flex items-start gap-3 py-3">
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ background: MODULE_COLOR[e.module] }} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{e.action}</span>
                  <Badge color={MODULE_COLOR[e.module]}>{MODULE_LABEL[e.module]}</Badge>
                </div>
                <p className="text-sm text-[var(--color-text-muted)]">{e.label}</p>
                {e.detail && <p className="text-xs text-[var(--color-text-faint)]">{e.detail}</p>}
              </div>
              <span className="shrink-0 text-xs text-[var(--color-text-faint)]">
                {new Date(e.occurred_at).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
              <div className="flex shrink-0 gap-1">
                <button
                  onClick={() => update('historyEvents', e.id, { is_archived: !e.is_archived })}
                  title={e.is_archived ? 'Restaurer' : 'Archiver'}
                  className="text-[var(--color-text-faint)] hover:text-[var(--color-violet-soft)]"
                >
                  {e.is_archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
                </button>
                <button onClick={() => remove('historyEvents', e.id)} title="Supprimer" className="text-[var(--color-text-faint)] hover:text-[var(--color-danger)]">
                  <Trash2 size={14} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
