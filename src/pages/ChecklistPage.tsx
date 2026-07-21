import { useMemo, useState } from 'react';
import { Plus, Trash2, CheckCircle2, Pencil, X } from 'lucide-react';
import { useGlowUpData } from '@/context/GlowUpContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Checkbox, Input, Badge, Label, Select, Textarea } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { todayISO } from '@/lib/utils';

const CHECKLIST_CATEGORY = 'Divers (Checklist)';

export default function ChecklistPage() {
  const { data, add, update, remove, toggleHabit, isHabitDone, getHabitLabel, logHistory } = useGlowUpData();
  const [title, setTitle] = useState('');
  const today = todayISO();

  // --- Modal "Ajouter un accomplissement" ---
  const [accModalOpen, setAccModalOpen] = useState(false);
  const [accTaskId, setAccTaskId] = useState<string>('__autre__');
  const [accDescription, setAccDescription] = useState('');
  const [accDate, setAccDate] = useState(today);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  const diversItems = useMemo(
    () => data.todos.filter((t) => t.category === CHECKLIST_CATEGORY && !t.is_archived),
    [data.todos]
  );

  const habitTasksToday = useMemo(() => data.planningTasks.filter((t) => t.is_daily), [data.planningTasks]);
  const planningToday = useMemo(() => data.planningTasks.filter((t) => t.date === today && !t.is_daily), [data.planningTasks, today]);

  const todaysAccomplishmentEvents = useMemo(
    () => data.historyEvents.filter((e) => e.action === 'Accomplissement' && e.occurred_at.slice(0, 10) === today),
    [data.historyEvents, today]
  );

  function addDivers() {
    if (!title.trim()) return;
    add('todos', {
      title: title.trim(),
      description: null,
      category: CHECKLIST_CATEGORY,
      priority: 'medium',
      is_done: false,
      is_archived: false,
      due_date: today,
    });
    setTitle('');
  }

  function toggleDivers(id: string, done: boolean, label: string) {
    update('todos', id, { is_done: done });
    if (done) logHistory('checklist', 'Tâche diverse accomplie', label);
  }

  function toggleHabitToday(taskId: string, done: boolean, label: string) {
    toggleHabit(taskId, today, done);
    if (done) logHistory('checklist', 'Habitude accomplie', label);
  }

  function togglePlanning(id: string, done: boolean, label: string) {
    update('planningTasks', id, { is_done: done });
    if (done) logHistory('checklist', 'Tâche planning accomplie', label);
  }

  function openAccomplishmentModal() {
    setEditingEventId(null);
    setAccTaskId('__autre__');
    setAccDescription('');
    setAccDate(today);
    setAccModalOpen(true);
  }

  function openEditAccomplishment(eventId: string) {
    const ev = data.historyEvents.find((e) => e.id === eventId);
    if (!ev) return;
    setEditingEventId(eventId);
    setAccTaskId('__autre__');
    setAccDescription(ev.detail ?? '');
    setAccDate(ev.occurred_at.slice(0, 10));
    setAccModalOpen(true);
  }

  function saveAccomplishment() {
    if (editingEventId) {
      update('historyEvents', editingEventId, { detail: accDescription.trim() || null });
      setAccModalOpen(false);
      return;
    }
    const task = habitTasksToday.find((t) => t.id === accTaskId);
    const label = task ? getHabitLabel(task.id, accDate) || task.title : 'Accomplissement libre';

    if (task) toggleHabit(task.id, accDate, true);
    logHistory('checklist', 'Accomplissement', label, accDescription.trim() || undefined, new Date(accDate + 'T12:00:00').toISOString());
    setAccModalOpen(false);
  }

  const accomplishmentsToday = [
    ...habitTasksToday.filter((t) => isHabitDone(t.id, today)).map((t) => ({ id: t.id, label: getHabitLabel(t.id, today) || t.title, source: 'Habitude' })),
    ...planningToday.filter((t) => t.is_done).map((t) => ({ id: t.id, label: t.title, source: 'Planning' })),
    ...diversItems.filter((t) => t.is_done).map((t) => ({ id: t.id, label: t.title, source: 'Divers' })),
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Checklist</h1>
          <p className="text-sm text-[var(--color-text-muted)]">Ce qu'il reste à faire aujourd'hui, tous modules confondus.</p>
        </div>
        <Button variant="primary" onClick={openAccomplishmentModal}>
          <Plus size={16} /> Ajouter un accomplissement
        </Button>
      </div>

      <Card>
        <h2 className="mb-3 font-medium">Habitudes du jour</h2>
        {habitTasksToday.length === 0 ? (
          <p className="text-sm text-[var(--color-text-faint)]">Aucune habitude définie.</p>
        ) : (
          <div className="space-y-2">
            {habitTasksToday.map((t) => (
              <div key={t.id} className="flex items-center gap-3 text-sm">
                <Checkbox checked={isHabitDone(t.id, today)} onChange={(v) => toggleHabitToday(t.id, v, t.title)} />
                <span className={isHabitDone(t.id, today) ? 'text-[var(--color-text-faint)] line-through' : ''}>
                  {getHabitLabel(t.id, today) || t.title}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 font-medium">Planning du jour</h2>
        {planningToday.length === 0 ? (
          <p className="text-sm text-[var(--color-text-faint)]">Rien de prévu aujourd'hui.</p>
        ) : (
          <div className="space-y-2">
            {planningToday.map((t) => (
              <div key={t.id} className="flex items-center gap-3 text-sm">
                <Checkbox checked={t.is_done} onChange={(v) => togglePlanning(t.id, v, t.title)} />
                <span className={t.is_done ? 'text-[var(--color-text-faint)] line-through' : ''}>{t.title}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 font-medium">Divers — tâches non prévues</h2>
        <div className="mb-3 flex gap-2">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ajouter une tâche imprévue…" onKeyDown={(e) => e.key === 'Enter' && addDivers()} />
          <Button variant="primary" onClick={addDivers}>
            <Plus size={15} />
          </Button>
        </div>
        {diversItems.length === 0 ? (
          <p className="text-sm text-[var(--color-text-faint)]">Rien pour l'instant.</p>
        ) : (
          <div className="space-y-2">
            {diversItems.map((t) => (
              <div key={t.id} className="flex items-center gap-3 text-sm">
                <Checkbox checked={t.is_done} onChange={(v) => toggleDivers(t.id, v, t.title)} />
                <span className={`flex-1 ${t.is_done ? 'text-[var(--color-text-faint)] line-through' : ''}`}>{t.title}</span>
                <Button variant="danger" size="icon" onClick={() => remove('todos', t.id)}>
                  <Trash2 size={13} />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <div className="mb-3 flex items-center gap-2">
          <CheckCircle2 size={16} className="text-[var(--color-success)]" />
          <h2 className="font-medium">Accomplissements du jour</h2>
          <Badge color="var(--color-success)">{accomplishmentsToday.length}</Badge>
        </div>
        {accomplishmentsToday.length === 0 ? (
          <p className="text-sm text-[var(--color-text-faint)]">Rien d'accompli pour le moment aujourd'hui.</p>
        ) : (
          <ul className="mb-4 space-y-1.5">
            {accomplishmentsToday.map((a) => (
              <li key={`${a.source}-${a.id}`} className="flex items-center gap-2 text-sm">
                <Badge>{a.source}</Badge>
                <span>{a.label}</span>
              </li>
            ))}
          </ul>
        )}

        {todaysAccomplishmentEvents.length > 0 && (
          <>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--color-text-faint)]">Détails ajoutés</p>
            <ul className="space-y-2">
              {todaysAccomplishmentEvents.map((e) => (
                <li key={e.id} className="flex items-start justify-between gap-2 rounded-lg bg-[var(--color-bg-elevated)] px-3 py-2 text-sm">
                  <div>
                    <p className="font-medium">{e.label}</p>
                    {e.detail && <p className="text-xs text-[var(--color-text-muted)]">{e.detail}</p>}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button onClick={() => openEditAccomplishment(e.id)} className="text-[var(--color-text-faint)] hover:text-[var(--color-text)]">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => remove('historyEvents', e.id)} className="text-[var(--color-text-faint)] hover:text-[var(--color-danger)]">
                      <X size={13} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      <Modal open={accModalOpen} onClose={() => setAccModalOpen(false)} title={editingEventId ? "Modifier l'accomplissement" : 'Nouvel accomplissement'}>
        <div className="space-y-3">
          {!editingEventId && (
            <div>
              <Label>Tâche quotidienne concernée</Label>
              <Select value={accTaskId} onChange={(e) => setAccTaskId(e.target.value)}>
                <option value="__autre__">Autre (accomplissement libre)</option>
                {habitTasksToday.map((t) => (
                  <option key={t.id} value={t.id}>
                    {getHabitLabel(t.id, accDate) || t.title}
                  </option>
                ))}
              </Select>
            </div>
          )}
          {!editingEventId && (
            <div>
              <Label>Date (tu peux corriger un oubli sur une date passée)</Label>
              <Input type="date" max={today} value={accDate} onChange={(e) => setAccDate(e.target.value)} />
            </div>
          )}
          <div>
            <Label>Description de l'action réalisée</Label>
            <Textarea rows={4} value={accDescription} onChange={(e) => setAccDescription(e.target.value)} placeholder="Ajoute des détails…" />
          </div>
          <Button variant="primary" className="w-full" onClick={saveAccomplishment}>
            Enregistrer
          </Button>
        </div>
      </Modal>
    </div>
  );
}
