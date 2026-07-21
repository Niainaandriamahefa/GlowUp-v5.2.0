import { useMemo } from 'react';
import { Lightbulb, Check } from 'lucide-react';
import { useGlowUpData } from '@/context/GlowUpContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Field';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { todayISO, currentMonth, startOfWeekISO } from '@/lib/utils';

export default function SuggestionsPage() {
  const { data, add, logHistory, isHabitDone } = useGlowUpData();
  const weekStart = startOfWeekISO();
  const month = currentMonth();
  const today = todayISO();

  const microSuggestions = useMemo(() => {
    return data.actionMicroTasks
      .filter((m) => !m.is_archived)
      .map((m) => {
        const count = data.actionMicroTaskLogs.filter((l) => {
          if (l.micro_task_id !== m.id) return false;
          return m.frequency_unit === 'per_week' ? l.date >= weekStart : l.date.slice(0, 7) === month;
        }).length;
        return { ...m, count, missing: Math.max(0, m.frequency_count - count) };
      })
      .filter((m) => m.missing > 0)
      .sort((a, b) => b.missing - a.missing);
  }, [data.actionMicroTasks, data.actionMicroTaskLogs, weekStart, month]);

  const habitSuggestions = useMemo(
    () => data.planningTasks.filter((t) => t.is_daily && !isHabitDone(t.id, today)),
    [data.planningTasks, isHabitDone, today]
  );

  function markDone(microTaskId: string, label: string) {
    add('actionMicroTaskLogs', { micro_task_id: microTaskId, date: today });
    logHistory('checklist', 'Suggestion réalisée', label);
  }

  const totalSuggestions = microSuggestions.length + habitSuggestions.length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Suggestions</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          Basées sur les fréquences de ton Plan d'action et tes habitudes non encore faites aujourd'hui.
        </p>
      </div>

      <Card className="flex items-center gap-3 border-[var(--color-violet)]/30 bg-gradient-to-br from-[var(--color-violet)]/10 to-transparent">
        <Lightbulb size={20} className="text-[var(--color-violet-soft)]" />
        <p className="text-sm">
          {totalSuggestions === 0
            ? "Tout est à jour ! Aucune suggestion pour l'instant."
            : `${totalSuggestions} action${totalSuggestions > 1 ? 's' : ''} en attente selon tes fréquences.`}
        </p>
      </Card>

      {habitSuggestions.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            Habitudes non faites aujourd'hui
          </h2>
          <div className="space-y-2">
            {habitSuggestions.map((t) => (
              <Card key={t.id} className="flex items-center justify-between p-3">
                <span className="text-sm">{t.title}</span>
                <Badge color="var(--color-warning)">À faire</Badge>
              </Card>
            ))}
          </div>
        </div>
      )}

      {microSuggestions.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            Selon les fréquences du Plan d'action
          </h2>
          <div className="space-y-2">
            {microSuggestions.map((m) => (
              <Card key={m.id} className="space-y-2 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{m.title}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">{m.parent_title}</p>
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => markDone(m.id, `${m.parent_title} — ${m.title}`)}>
                    <Check size={14} /> Fait
                  </Button>
                </div>
                <ProgressBar value={(m.count / m.frequency_count) * 100} color="var(--color-warning)" />
                <p className="text-xs text-[var(--color-text-muted)]">
                  Il manque {m.missing} fois {m.frequency_unit === 'per_week' ? 'cette semaine' : 'ce mois-ci'}
                </p>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
