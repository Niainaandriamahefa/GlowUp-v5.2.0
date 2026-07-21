import { useMemo, useState, useEffect, useRef } from 'react';
import { Plus, Trash2, ChevronLeft, ChevronRight, Eye, EyeOff, CalendarClock, X, Pencil } from 'lucide-react';
import { useGlowUpData } from '@/context/GlowUpContext';
import type { Period, PlanningTask, MicroTaskEntry } from '@/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Checkbox, Input, Label, Select, Textarea } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { todayISO, uid, addDaysISO } from '@/lib/utils';

const PERIOD_LABEL: Record<Period, string> = { matin: 'Matin (5h-12h)', apres_midi: 'Après-midi (12h-17h)', soir: 'Soir (17h-20h)', nuit: 'Nuit (20h-4h)' };
const COLORS = ['#8B5CF6', '#34D399', '#FBBF24', '#F87171', '#60A5FA'];

function periodForTime(time: string): Period {
  const [h] = time.split(':').map(Number);
  if (h >= 5 && h < 12) return 'matin';
  if (h >= 12 && h < 17) return 'apres_midi';
  if (h >= 17 && h < 20) return 'soir';
  return 'nuit';
}

export default function PlanningPage() {
  const { data, add, update, remove, logHistory, toggleHabit, isHabitDone, getHabitLabel, setHabitLabel, getDayOverride, setDayOverride, isHiddenForDay, setHiddenForDay } = useGlowUpData();
  const [view, setView] = useState<'planning' | 'timeline'>('planning');
  const [date, setDate] = useState(todayISO());
  const [showHidden, setShowHidden] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PlanningTask | null>(null);
  const [reportTarget, setReportTarget] = useState<PlanningTask | null>(null);
  const [reportDate, setReportDate] = useState('');
  const [personalizeTarget, setPersonalizeTarget] = useState<PlanningTask | null>(null);
  const [personalizeDraft, setPersonalizeDraft] = useState('');
  const [personalizeStart, setPersonalizeStart] = useState('');
  const [personalizeEnd, setPersonalizeEnd] = useState('');
  const [personalizeColor, setPersonalizeColor] = useState(COLORS[0]);
  const [personalizeNotes, setPersonalizeNotes] = useState('');

  const [title, setTitle] = useState('');
  const [period, setPeriod] = useState<Period>('matin');
  const [start, setStart] = useState('08:00');
  const [end, setEnd] = useState('09:00');
  const [notes, setNotes] = useState('');
  const [isDaily, setIsDaily] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [color, setColor] = useState(COLORS[0]);
  const [microDraft, setMicroDraft] = useState('');
  const [microTasks, setMicroTasks] = useState<MicroTaskEntry[]>([]);

  useEffect(() => setPeriod(periodForTime(start)), [start]);

  const knownTitles = useMemo(
    () => Array.from(new Set(data.planningTasks.map((t) => t.title))).sort(),
    [data.planningTasks]
  );

  const dayTasks = useMemo(() => {
    return data.planningTasks
      .filter((t) => t.date === date || t.is_daily)
      .filter((t) => !(t.is_daily && isHiddenForDay(t.id, date)))
      .filter((t) => showHidden || !t.is_hidden_by_default || t.is_done)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
  }, [data.planningTasks, date, showHidden, data.habitCompletions]);

  const grouped = useMemo(() => {
    const g: Record<Period, PlanningTask[]> = { matin: [], apres_midi: [], soir: [], nuit: [] };
    dayTasks.forEach((t) => {
      const override = t.is_daily ? getDayOverride(t.id, date) : undefined;
      const effectiveStart = override?.override_start_time ?? t.start_time;
      const p = t.is_daily ? periodForTime(effectiveStart) : t.period;
      g[p].push(t);
    });
    return g;
  }, [dayTasks, data.habitCompletions, date]);

  function openCreate(prefillStart?: string, prefillEnd?: string) {
    setEditing(null);
    setTitle('');
    setStart(prefillStart ?? '08:00');
    setEnd(prefillEnd ?? '09:00');
    setNotes('');
    setIsDaily(false);
    setIsHidden(false);
    setColor(COLORS[0]);
    setMicroTasks([]);
    setModalOpen(true);
  }

  function openEdit(task: PlanningTask) {
    setEditing(task);
    setTitle(task.title);
    setStart(task.start_time);
    setEnd(task.end_time);
    setNotes(task.notes ?? '');
    setIsDaily(task.is_daily);
    setIsHidden(task.is_hidden_by_default);
    setColor(task.color);
    setMicroTasks(task.micro_tasks ?? []);
    setModalOpen(true);
  }

  function handleSave() {
    if (!title.trim()) return;
    const payload = {
      title: title.trim(),
      notes: notes.trim() || null,
      period,
      start_time: start,
      end_time: end,
      color,
      is_daily: isDaily,
      is_hidden_by_default: isHidden,
      is_done: editing?.is_done ?? false,
      order_index: editing?.order_index ?? 0,
      date,
      micro_tasks: microTasks,
    };
    if (editing) update('planningTasks', editing.id, payload);
    else {
      add('planningTasks', payload);
      logHistory('planning', 'Tâche planifiée', title.trim(), date);
    }
    setModalOpen(false);
  }

  function handleDone(task: PlanningTask, v: boolean) {
    if (task.is_daily) {
      // Une tâche quotidienne est une seule ligne partagée par tous les jours :
      // sa complétion doit être enregistrée par date (habit_completions),
      // jamais sur le champ is_done de la tâche elle-même — sinon cocher un
      // jour cocherait la tâche pour TOUS les jours (bug de synchro Habitudes).
      toggleHabit(task.id, date, v);
      if (v) logHistory('habits', 'Habitude accomplie', task.title, date);
    } else {
      update('planningTasks', task.id, { is_done: v });
      if (v) logHistory('planning', 'Tâche accomplie', task.title, task.date);
    }
  }

  function isTaskDoneForDate(task: PlanningTask): boolean {
    return task.is_daily ? isHabitDone(task.id, date) : task.is_done;
  }

  function displayTitle(task: PlanningTask): string {
    if (!task.is_daily) return task.title;
    return getHabitLabel(task.id, date) || task.title;
  }

  function effectiveFields(task: PlanningTask) {
    if (!task.is_daily) {
      return { start: task.start_time, end: task.end_time, color: task.color, notes: task.notes };
    }
    const o = getDayOverride(task.id, date);
    return {
      start: o?.override_start_time ?? task.start_time,
      end: o?.override_end_time ?? task.end_time,
      color: o?.override_color ?? task.color,
      notes: o?.override_notes ?? task.notes,
    };
  }

  function openPersonalize(task: PlanningTask) {
    setPersonalizeTarget(task);
    const eff = effectiveFields(task);
    setPersonalizeDraft(getHabitLabel(task.id, date) ?? '');
    setPersonalizeStart(eff.start);
    setPersonalizeEnd(eff.end);
    setPersonalizeColor(eff.color);
    setPersonalizeNotes(eff.notes ?? '');
  }

  function savePersonalize() {
    if (!personalizeTarget) return;
    setDayOverride(personalizeTarget.id, date, {
      daily_label: personalizeDraft.trim() || null,
      override_start_time: personalizeStart !== personalizeTarget.start_time ? personalizeStart : null,
      override_end_time: personalizeEnd !== personalizeTarget.end_time ? personalizeEnd : null,
      override_color: personalizeColor !== personalizeTarget.color ? personalizeColor : null,
      override_notes: personalizeNotes.trim() && personalizeNotes.trim() !== (personalizeTarget.notes ?? '') ? personalizeNotes.trim() : null,
    });
    logHistory('habits', 'Personnalisation du jour', personalizeTarget.title, date);
    setPersonalizeTarget(null);
  }

  function addMicroDraft() {
    if (!microDraft.trim()) return;
    setMicroTasks((m) => [...m, { id: uid(), text: microDraft.trim(), done: false }]);
    setMicroDraft('');
  }

  function toggleMicroInline(task: PlanningTask, microId: string) {
    const next = (task.micro_tasks ?? []).map((m) => (m.id === microId ? { ...m, done: !m.done } : m));
    update('planningTasks', task.id, { micro_tasks: next });
  }

  function confirmReport() {
    if (!reportTarget || !reportDate) return;
    if (reportTarget.is_daily) {
      // Une tâche quotidienne "reportée" devient une occurrence ponctuelle à la nouvelle date
      add('planningTasks', { ...stripMeta(reportTarget), date: reportDate, is_daily: false, is_done: false });
    } else {
      update('planningTasks', reportTarget.id, { date: reportDate });
    }
    logHistory('planning', 'Tâche reportée', reportTarget.title, `Vers le ${reportDate}`);
    setReportTarget(null);
    setReportDate('');
  }

  function stripMeta(t: PlanningTask) {
    const { id, user_id, created_at, updated_at, deleted_at, ...rest } = t;
    return rest;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Planning</h1>
          <p className="text-sm text-[var(--color-text-muted)]">Organise tes journées, heure par heure.</p>
        </div>
        <Button variant="primary" onClick={() => openCreate()}>
          <Plus size={16} /> Nouvelle tâche
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setDate(addDaysISO(date, -1))}>
            <ChevronLeft size={16} />
          </Button>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-40" />
          <Button variant="ghost" size="icon" onClick={() => setDate(addDaysISO(date, 1))}>
            <ChevronRight size={16} />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDate(todayISO())}>
            Aujourd'hui
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowHidden((v) => !v)}>
            {showHidden ? <EyeOff size={14} /> : <Eye size={14} />}
            {showHidden ? 'Masquer par défaut' : 'Voir tout'}
          </Button>
          <div className="flex rounded-lg border border-[var(--color-border)] p-0.5">
            <Button variant={view === 'planning' ? 'primary' : 'ghost'} size="sm" onClick={() => setView('planning')}>
              Planning
            </Button>
            <Button variant={view === 'timeline' ? 'primary' : 'ghost'} size="sm" onClick={() => setView('timeline')}>
              Emploi du temps
            </Button>
          </div>
        </div>
      </div>

      {view === 'planning' ? (
        <div className="space-y-6">
          {(['matin', 'apres_midi', 'soir', 'nuit'] as Period[]).map((p) => (
            <div key={p}>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">{PERIOD_LABEL[p]}</h2>
              {grouped[p].length === 0 ? (
                <p className="text-sm text-[var(--color-text-faint)]">Rien de prévu.</p>
              ) : (
                <div className="space-y-2">
                  {grouped[p].map((task) => {
                    const eff = effectiveFields(task);
                    return (
                    <Card key={task.id} className="p-3" style={{ borderLeftColor: eff.color, borderLeftWidth: 3 }}>
                      <div className="flex items-center gap-3">
                        <Checkbox checked={isTaskDoneForDate(task)} onChange={(v) => handleDone(task, v)} />
                        <div className="min-w-0 flex-1 cursor-pointer" onClick={() => openEdit(task)}>
                          <p className={isTaskDoneForDate(task) ? 'text-[var(--color-text-faint)] line-through' : ''}>
                            {displayTitle(task)}
                            {task.is_daily && getHabitLabel(task.id, date) && (
                              <span className="ml-1.5 text-[10px] font-normal text-[var(--color-text-faint)]">(base : {task.title})</span>
                            )}
                          </p>
                          <p className="text-xs text-[var(--color-text-muted)]">
                            {eff.start} – {eff.end}
                            {task.is_daily && ' · quotidien'}
                          </p>
                          {eff.notes && <p className="mt-0.5 text-xs text-[var(--color-text-faint)]">{eff.notes}</p>}
                        </div>
                        {task.is_daily && (
                          <Button variant="ghost" size="icon" title="Personnaliser pour ce jour" onClick={() => openPersonalize(task)}>
                            <Pencil size={14} />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Reporter à une autre date"
                          onClick={() => {
                            setReportTarget(task);
                            setReportDate(addDaysISO(date, 1));
                          }}
                        >
                          <CalendarClock size={14} />
                        </Button>
                        <Button
                          variant="danger"
                          size="icon"
                          title={task.is_daily ? 'Supprimer uniquement pour ce jour' : 'Supprimer'}
                          onClick={() => {
                            if (task.is_daily) {
                              setHiddenForDay(task.id, date, true);
                              logHistory('planning', 'Tâche masquée pour ce jour', task.title, date);
                            } else {
                              remove('planningTasks', task.id);
                            }
                          }}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                      {task.micro_tasks && task.micro_tasks.length > 0 && (
                        <ul className="ml-8 mt-2 space-y-1 border-l border-[var(--color-border)] pl-3">
                          {task.micro_tasks.map((m) => (
                            <li key={m.id} className="flex items-center gap-2 text-xs">
                              <Checkbox checked={m.done} onChange={() => toggleMicroInline(task, m.id)} />
                              <span className={m.done ? 'text-[var(--color-text-faint)] line-through' : 'text-[var(--color-text-muted)]'}>{m.text}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </Card>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <TimelineView
          tasks={dayTasks}
          onEdit={openEdit}
          isToday={date === todayISO()}
          onCreateAt={(s, e) => openCreate(s, e)}
          getEffective={effectiveFields}
          onReschedule={(task, newStart, newEnd) => {
            if (task.is_daily) {
              setDayOverride(task.id, date, { override_start_time: newStart, override_end_time: newEnd });
            } else {
              update('planningTasks', task.id, { start_time: newStart, end_time: newEnd });
            }
            logHistory('planning', 'Tâche déplacée (glisser-déposer)', task.title, `${newStart}–${newEnd} le ${date}`);
          }}
        />
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Modifier la tâche' : 'Nouvelle tâche'}>
        <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
          <div>
            <Label>Titre</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus list="known-titles" placeholder="Choisis ou crée une tâche" />
            <datalist id="known-titles">
              {knownTitles.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Période (auto)</Label>
              <Select value={period} onChange={(e) => setPeriod(e.target.value as Period)}>
                <option value="matin">Matin</option>
                <option value="apres_midi">Après-midi</option>
                <option value="soir">Soir</option>
                <option value="nuit">Nuit</option>
              </Select>
            </div>
            <div>
              <Label>Début</Label>
              <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div>
              <Label>Fin</Label>
              <Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div>
            <Label>Micro-tâches du jour</Label>
            <div className="mb-2 flex gap-2">
              <Input value={microDraft} onChange={(e) => setMicroDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addMicroDraft()} placeholder="Ex : préparer le sac" />
              <Button variant="secondary" size="icon" onClick={addMicroDraft}>
                <Plus size={14} />
              </Button>
            </div>
            {microTasks.length > 0 && (
              <ul className="space-y-1">
                {microTasks.map((m) => (
                  <li key={m.id} className="flex items-center justify-between text-xs">
                    <span>{m.text}</span>
                    <button onClick={() => setMicroTasks((arr) => arr.filter((x) => x.id !== m.id))} className="text-[var(--color-text-faint)] hover:text-[var(--color-danger)]">
                      <X size={13} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <Label>Couleur</Label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button key={c} onClick={() => setColor(c)} className="h-7 w-7 rounded-full border-2" style={{ background: c, borderColor: color === c ? '#fff' : 'transparent' }} />
              ))}
            </div>
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={isDaily} onChange={setIsDaily} /> Tâche quotidienne (habitude)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={isHidden} onChange={setIsHidden} /> Cachée par défaut
            </label>
          </div>
          <Button variant="primary" className="w-full" onClick={handleSave}>
            Enregistrer
          </Button>
        </div>
      </Modal>

      <Modal open={!!reportTarget} onClose={() => setReportTarget(null)} title="Reporter la tâche">
        <div className="space-y-3">
          <p className="text-sm text-[var(--color-text-muted)]">Reporter « {reportTarget?.title} » vers une nouvelle date :</p>
          <Input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} />
          <Button variant="primary" className="w-full" onClick={confirmReport}>
            Confirmer le report
          </Button>
        </div>
      </Modal>
      <Modal open={!!personalizeTarget} onClose={() => setPersonalizeTarget(null)} title="Personnaliser pour ce jour">
        <div className="space-y-3">
          <p className="text-sm text-[var(--color-text-muted)]">
            Tâche quotidienne de base : <strong>{personalizeTarget?.title}</strong>. Ces changements ne s'appliquent
            qu'au {date} et ne modifient jamais la tâche de base ni les autres jours.
          </p>
          <div>
            <Label>Titre du jour</Label>
            <Input
              value={personalizeDraft}
              onChange={(e) => setPersonalizeDraft(e.target.value)}
              placeholder="Ex : Ranger la chambre"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Début</Label>
              <Input type="time" value={personalizeStart} onChange={(e) => setPersonalizeStart(e.target.value)} />
            </div>
            <div>
              <Label>Fin</Label>
              <Input type="time" value={personalizeEnd} onChange={(e) => setPersonalizeEnd(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Notes du jour</Label>
            <Textarea rows={2} value={personalizeNotes} onChange={(e) => setPersonalizeNotes(e.target.value)} />
          </div>
          <div>
            <Label>Couleur du jour</Label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setPersonalizeColor(c)}
                  className="h-7 w-7 rounded-full border-2"
                  style={{ background: c, borderColor: personalizeColor === c ? '#fff' : 'transparent' }}
                />
              ))}
            </div>
          </div>
          <Button variant="primary" className="w-full" onClick={savePersonalize}>
            Enregistrer
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function TimelineView({
  tasks,
  onEdit,
  isToday,
  onCreateAt,
  getEffective,
  onReschedule,
}: {
  tasks: PlanningTask[];
  onEdit: (t: PlanningTask) => void;
  isToday: boolean;
  onCreateAt: (start: string, end: string) => void;
  getEffective: (t: PlanningTask) => { start: string; end: string; color: string; notes: string | null };
  onReschedule: (t: PlanningTask, newStart: string, newEnd: string) => void;
}) {
  const pxPerMinute = 1.1;
  const totalMinutes = 24 * 60;
  const [now, setNow] = useState(new Date());
  const containerRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{ task: PlanningTask; grabOffsetMin: number; durationMin: number; previewStartMin: number } | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  function toMinutes(time: string) {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }
  function toOffset(time: string) {
    return toMinutes(time) * pxPerMinute;
  }
  function minutesToTime(mins: number) {
    const clamped = Math.max(0, Math.min(24 * 60 - 5, mins));
    const h = Math.floor(clamped / 60);
    const m = Math.round((clamped % 60) / 15) * 15;
    const finalH = m === 60 ? h + 1 : h;
    const finalM = m === 60 ? 0 : m;
    return `${String(finalH % 24).padStart(2, '0')}:${String(finalM).padStart(2, '0')}`;
  }

  const nowOffset = (now.getHours() * 60 + now.getMinutes()) * pxPerMinute;

  function handleSlotClick(hour: number) {
    const start = `${String(hour).padStart(2, '0')}:00`;
    const end = `${String((hour + 1) % 24).padStart(2, '0')}:00`;
    onCreateAt(start, end);
  }

  function handlePointerDown(e: React.PointerEvent, task: PlanningTask) {
    e.stopPropagation();
    const eff = getEffective(task);
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;
    const pointerMin = (e.clientY - containerRect.top) / pxPerMinute;
    const startMin = toMinutes(eff.start);
    const durationMin = toMinutes(eff.end) - startMin;
    setDrag({ task, grabOffsetMin: pointerMin - startMin, durationMin: durationMin > 0 ? durationMin : 30, previewStartMin: startMin });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!drag) return;
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;
    const pointerMin = (e.clientY - containerRect.top) / pxPerMinute;
    const newStartMin = pointerMin - drag.grabOffsetMin;
    setDrag({ ...drag, previewStartMin: newStartMin });
  }

  function handlePointerUp() {
    if (!drag) return;
    const newStart = minutesToTime(drag.previewStartMin);
    const newStartMin = toMinutes(newStart);
    const newEnd = minutesToTime(newStartMin + drag.durationMin);
    onReschedule(drag.task, newStart, newEnd);
    setDrag(null);
  }

  return (
    <Card className="overflow-x-auto p-0">
      <p className="border-b border-[var(--color-border)] px-3 py-2 text-xs text-[var(--color-text-faint)]">
        Glisse-dépose une tâche pour changer son heure (ne modifie que ce jour).
      </p>
      <div
        ref={containerRef}
        className="relative flex select-none"
        style={{ height: totalMinutes * pxPerMinute }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <div className="relative w-14 shrink-0 border-r border-[var(--color-border)]">
          {Array.from({ length: 25 }).map((_, i) => (
            <div key={i} className="absolute right-2 -translate-y-1/2 text-xs text-[var(--color-text-faint)]" style={{ top: i * 60 * pxPerMinute }}>
              {i}h
            </div>
          ))}
        </div>
        <div className="relative flex-1">
          {Array.from({ length: 24 }).map((_, i) => (
            <button
              key={i}
              onClick={() => handleSlotClick(i)}
              className="absolute left-0 right-0 border-t border-[var(--color-border)] hover:bg-[var(--color-bg-hover)]/40"
              style={{ top: i * 60 * pxPerMinute, height: 60 * pxPerMinute }}
              title="Cliquer pour créer une tâche"
            />
          ))}
          {isToday && (
            <div className="pointer-events-none absolute left-0 right-0 z-10 border-t-2 border-[var(--color-danger)]" style={{ top: nowOffset }}>
              <span className="absolute -left-1 -top-1.5 h-3 w-3 rounded-full bg-[var(--color-danger)]" />
            </div>
          )}
          {tasks.map((task) => {
            const eff = getEffective(task);
            const isDragging = drag?.task.id === task.id;
            const top = isDragging ? Math.max(0, drag.previewStartMin) * pxPerMinute : Math.max(0, toOffset(eff.start));
            const height = isDragging ? drag.durationMin * pxPerMinute : Math.max(24, toOffset(eff.end) - toOffset(eff.start));
            return (
              <div
                key={task.id}
                onPointerDown={(e) => handlePointerDown(e, task)}
                onClick={() => !isDragging && onEdit(task)}
                className="absolute left-2 right-2 z-20 cursor-grab overflow-hidden rounded-lg px-2 py-1 text-left text-xs shadow-sm active:cursor-grabbing"
                style={{
                  top,
                  height,
                  background: `color-mix(in srgb, ${eff.color} ${isDragging ? '40' : '25'}%, var(--color-bg-card))`,
                  borderLeft: `3px solid ${eff.color}`,
                  opacity: isDragging ? 0.9 : 1,
                  boxShadow: isDragging ? '0 8px 20px rgba(0,0,0,0.35)' : undefined,
                }}
              >
                <p className="truncate font-medium">{task.title}</p>
                <p className="text-[10px] text-[var(--color-text-muted)]">
                  {isDragging ? minutesToTime(drag.previewStartMin) : eff.start}–{isDragging ? minutesToTime(drag.previewStartMin + drag.durationMin) : eff.end}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
