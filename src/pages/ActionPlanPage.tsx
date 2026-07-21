import { useMemo, useState } from 'react';
import { Plus, Trash2, Check, Pencil } from 'lucide-react';
import { useGlowUpData } from '@/context/GlowUpContext';
import type { FrequencyUnit } from '@/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Label, Select, Badge, Textarea } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { todayISO, currentMonth, startOfWeekISO } from '@/lib/utils';

export default function ActionPlanPage() {
  const { data, add, update, remove, logHistory } = useGlowUpData();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [parentTitle, setParentTitle] = useState('');
  const [title, setTitle] = useState('');
  const [freqCount, setFreqCount] = useState(3);
  const [freqUnit, setFreqUnit] = useState<FrequencyUnit>('per_week');
  const [obstacles, setObstacles] = useState('');
  const [motivation, setMotivation] = useState('');
  const [trigger, setTrigger] = useState('');

  const dailyTaskTitles = useMemo(
    () => Array.from(new Set(data.planningTasks.filter((t) => t.is_daily).map((t) => t.title))).sort(),
    [data.planningTasks]
  );

  const active = useMemo(() => data.actionMicroTasks.filter((m) => !m.is_archived), [data.actionMicroTasks]);
  const grouped = useMemo(() => {
    const g: Record<string, typeof active> = {};
    active.forEach((m) => {
      g[m.parent_title] = g[m.parent_title] || [];
      g[m.parent_title].push(m);
    });
    return g;
  }, [active]);

  const weekStart = startOfWeekISO();
  const month = currentMonth();

  function countLogs(microTaskId: string, unit: FrequencyUnit) {
    return data.actionMicroTaskLogs.filter((l) => {
      if (l.micro_task_id !== microTaskId) return false;
      return unit === 'per_week' ? l.date >= weekStart : l.date.slice(0, 7) === month;
    }).length;
  }

  function markDoneToday(microTaskId: string, label: string) {
    add('actionMicroTaskLogs', { micro_task_id: microTaskId, date: todayISO() });
    logHistory('checklist', 'Micro-tâche réalisée', label);
  }

  function openCreate() {
    setEditingId(null);
    setParentTitle('');
    setTitle('');
    setFreqCount(3);
    setFreqUnit('per_week');
    setObstacles('');
    setMotivation('');
    setTrigger('');
    setModalOpen(true);
  }

  function openEdit(m: (typeof active)[number]) {
    setEditingId(m.id);
    setParentTitle(m.parent_title);
    setTitle(m.title);
    setFreqCount(m.frequency_count);
    setFreqUnit(m.frequency_unit);
    setObstacles(m.obstacles ?? '');
    setMotivation(m.motivation ?? '');
    setTrigger(m.trigger ?? '');
    setModalOpen(true);
  }

  function saveMicroTask() {
    if (!parentTitle.trim() || !title.trim()) return;
    const payload = {
      parent_title: parentTitle.trim(),
      title: title.trim(),
      frequency_count: freqCount,
      frequency_unit: freqUnit,
      is_archived: false,
      obstacles: obstacles.trim() || null,
      motivation: motivation.trim() || null,
      trigger: trigger.trim() || null,
    };
    if (editingId) update('actionMicroTasks', editingId, payload);
    else add('actionMicroTasks', payload);
    setTitle('');
    setModalOpen(false);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Plan d'action</h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            Tâches quotidiennes → micro-tâches → fréquences. Les semaines passées ne sont jamais modifiées rétroactivement.
          </p>
        </div>
        <Button variant="primary" onClick={openCreate}>
          <Plus size={16} /> Micro-tâche
        </Button>
      </div>

      {Object.keys(grouped).length === 0 ? (
        <Card className="text-center text-sm text-[var(--color-text-faint)]">
          Aucune micro-tâche définie. Ex : « Organisation Maison » → « Rangement casier » — 3 fois/semaine.
        </Card>
      ) : (
        Object.entries(grouped).map(([parent, tasks]) => (
          <div key={parent}>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">{parent}</h2>
            <div className="space-y-2">
              {tasks.map((m) => {
                const count = countLogs(m.id, m.frequency_unit);
                const done = count >= m.frequency_count;
                return (
                  <Card key={m.id} className="space-y-2 p-4">
                    <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{m.title}</p>
                      <div className="mt-1 flex gap-1.5">
                        <Badge color={done ? 'var(--color-success)' : 'var(--color-warning)'}>
                          {count}/{m.frequency_count} {m.frequency_unit === 'per_week' ? 'cette semaine' : 'ce mois-ci'}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="secondary" size="sm" onClick={() => markDoneToday(m.id, `${parent} — ${m.title}`)}>
                        <Check size={14} /> Fait aujourd'hui
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(m)} title="Modifier">
                        <Pencil size={14} />
                      </Button>
                      <Button variant="danger" size="icon" onClick={() => remove('actionMicroTasks', m.id)}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                    </div>
                    {(m.obstacles || m.motivation || m.trigger) && (
                      <div className="space-y-1 border-t border-[var(--color-border)] pt-2 text-xs text-[var(--color-text-muted)]">
                        {m.obstacles && <p><strong>Empêchements :</strong> {m.obstacles}</p>}
                        {m.motivation && <p><strong>Motivation :</strong> {m.motivation}</p>}
                        {m.trigger && <p><strong>Déclencheur :</strong> {m.trigger}</p>}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        ))
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nouvelle micro-tâche">
        <div className="space-y-3">
          <div>
            <Label>Tâche quotidienne (groupe)</Label>
            <Input value={parentTitle} onChange={(e) => setParentTitle(e.target.value)} placeholder="Choisis ou crée" autoFocus list="daily-task-titles" />
            <datalist id="daily-task-titles">
              {dailyTaskTitles.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </div>
          <div>
            <Label>Micro-tâche</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex : Rangement casier" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Fréquence</Label>
              <Input type="number" min={1} value={freqCount} onChange={(e) => setFreqCount(Number(e.target.value))} />
            </div>
            <div>
              <Label>Par</Label>
              <Select value={freqUnit} onChange={(e) => setFreqUnit(e.target.value as FrequencyUnit)}>
                <option value="per_week">Semaine</option>
                <option value="per_month">Mois</option>
              </Select>
            </div>
          </div>
          <div>
            <Label>Empêchements (ce qui bloque)</Label>
            <Textarea rows={2} value={obstacles} onChange={(e) => setObstacles(e.target.value)} placeholder="Ex : manque de temps le soir" />
          </div>
          <div>
            <Label>Motivation</Label>
            <Textarea rows={2} value={motivation} onChange={(e) => setMotivation(e.target.value)} placeholder="Pourquoi c'est important" />
          </div>
          <div>
            <Label>Élément déclencheur</Label>
            <Textarea rows={2} value={trigger} onChange={(e) => setTrigger(e.target.value)} placeholder="Ex : juste après le petit-déjeuner" />
          </div>
          <Button variant="primary" className="w-full" onClick={saveMicroTask}>
            Enregistrer
          </Button>
        </div>
      </Modal>
    </div>
  );
}
