import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Repeat } from 'lucide-react';
import { useGlowUpData } from '@/context/GlowUpContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Field';
import { todayISO, addWeeksISO, startOfWeekISO, addDaysISO } from '@/lib/utils';

const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

export default function HabitsPage() {
  const { data, toggleHabit, isHabitDone, logHistory } = useGlowUpData();
  const [weekOffset, setWeekOffset] = useState(0);
  const [pendingConfirm, setPendingConfirm] = useState<{ taskId: string; date: string; next: boolean } | null>(null);

  const today = todayISO();
  const thisWeekStart = startOfWeekISO(today);
  const viewedWeekStart = addWeeksISO(thisWeekStart, weekOffset);
  const weekDates = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDaysISO(viewedWeekStart, i)),
    [viewedWeekStart]
  );

  const habitTasks = useMemo(
    () => data.planningTasks.filter((t) => t.is_daily).sort((a, b) => a.start_time.localeCompare(b.start_time)),
    [data.planningTasks]
  );

  const isPastWeek = weekOffset < 0;
  const isFutureWeek = weekOffset > 0;

  function requestToggle(taskId: string, date: string, next: boolean) {
    if (date < today) {
      setPendingConfirm({ taskId, date, next });
    } else {
      toggleHabit(taskId, date, next);
    }
  }

  function confirmToggle() {
    if (!pendingConfirm) return;
    toggleHabit(pendingConfirm.taskId, pendingConfirm.date, pendingConfirm.next);
    logHistory('habits', 'Habitude modifiée (jour passé)', `${pendingConfirm.date}`, 'Modification rétroactive confirmée');
    setPendingConfirm(null);
  }

  function dayStats(date: string) {
    if (habitTasks.length === 0) return { pct: 0, done: 0, total: 0 };
    const done = habitTasks.filter((t) => isHabitDone(t.id, date)).length;
    return { pct: Math.round((done / habitTasks.length) * 100), done, total: habitTasks.length };
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Habitudes</h1>
          <p className="text-sm text-[var(--color-text-muted)]">Ta checklist hebdomadaire de routines.</p>
        </div>
        {weekOffset !== 0 && (
          <Button variant="ghost" size="sm" onClick={() => setWeekOffset(0)}>
            <Calendar size={14} /> Semaine actuelle
          </Button>
        )}
      </div>

      <div className="flex items-center justify-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setWeekOffset((w) => w - 1)}>
          <ChevronLeft size={18} />
        </Button>
        <span className="text-sm font-medium">
          {weekDates[0].split('-').reverse().slice(0, 2).join('/')} – {weekDates[6].split('-').reverse().slice(0, 2).join('/')}
          {isPastWeek && <span className="ml-2 text-xs text-[var(--color-text-faint)]">(passée)</span>}
          {isFutureWeek && <span className="ml-2 text-xs text-[var(--color-text-faint)]">(à venir)</span>}
        </span>
        <Button variant="ghost" size="icon" onClick={() => setWeekOffset((w) => w + 1)}>
          <ChevronRight size={18} />
        </Button>
      </div>

      {habitTasks.length === 0 ? (
        <Card className="text-center text-sm text-[var(--color-text-faint)]">
          Aucune habitude définie. Crée une tâche « quotidienne » depuis la page Planning pour qu'elle apparaisse ici.
        </Card>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="w-56 p-3 text-left text-xs font-medium text-[var(--color-text-muted)]">Habitude</th>
                {weekDates.map((d, i) => (
                  <th key={d} className="p-2 text-center text-xs font-medium text-[var(--color-text-muted)]">
                    <div>{DAY_LABELS[i]}</div>
                    <div className={d === today ? 'text-[var(--color-violet-soft)]' : 'text-[var(--color-text-faint)]'}>
                      {d.slice(8)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {habitTasks.map((task) => (
                <tr key={task.id} className="border-b border-[var(--color-border)] last:border-0">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ background: task.color }} />
                      {task.title}
                    </div>
                  </td>
                  {weekDates.map((d) => (
                    <td key={d} className="p-2 text-center">
                      <div className="flex justify-center">
                        <Checkbox checked={isHabitDone(task.id, d)} onChange={(v) => requestToggle(task.id, d, v)} />
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
              <tr>
                <td className="p-3 text-xs font-medium text-[var(--color-text-muted)]">
                  <Repeat size={13} className="mr-1 inline" /> % du jour
                </td>
                {weekDates.map((d) => (
                  <td key={d} className="p-2 text-center text-xs text-[var(--color-text-muted)]">
                    {dayStats(d).pct}%
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </Card>
      )}

      {pendingConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setPendingConfirm(null)}>
          <Card className="max-w-sm" onClick={(e) => e.stopPropagation()}>
            <p className="mb-4 text-sm">
              Voulez-vous vraiment modifier l'accomplissement du <strong>{pendingConfirm.date}</strong> ? Cette semaine est déjà
              passée.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setPendingConfirm(null)}>
                Annuler
              </Button>
              <Button variant="primary" onClick={confirmToggle}>
                Confirmer
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
