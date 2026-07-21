import { useMemo, useState } from 'react';
import { Plus, Trash2, Archive, CheckCircle2 } from 'lucide-react';
import { useGlowUpData } from '@/context/GlowUpContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Input, Label, Textarea, Badge } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { SubTaskList } from '@/components/ui/SubTaskList';
import { clampPercent } from '@/lib/utils';

export default function BigGoalsPage() {
  const { data, add, update, remove, logHistory } = useGlowUpData();
  const [showArchived, setShowArchived] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetDate, setTargetDate] = useState('');

  const visible = useMemo(
    () => data.bigGoals.filter((g) => g.is_archived === showArchived),
    [data.bigGoals, showArchived]
  );

  function handleSave() {
    if (!title.trim()) return;
    add('bigGoals', {
      title: title.trim(),
      description: description.trim() || null,
      target_date: targetDate || null,
      progress: 0,
      is_validated: false,
      is_archived: false,
      sub_tasks: [],
    });
    setTitle('');
    setDescription('');
    setModalOpen(false);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Big Goals</h1>
          <p className="text-sm text-[var(--color-text-muted)]">Tes objectifs long terme.</p>
        </div>
        <Button variant="primary" onClick={() => setModalOpen(true)}>
          <Plus size={16} /> Nouveau
        </Button>
      </div>

      <div className="flex gap-2">
        <Button variant={!showArchived ? 'primary' : 'ghost'} size="sm" onClick={() => setShowArchived(false)}>
          Actifs
        </Button>
        <Button variant={showArchived ? 'primary' : 'ghost'} size="sm" onClick={() => setShowArchived(true)}>
          Archivés
        </Button>
      </div>

      {visible.length === 0 ? (
        <Card className="text-center text-sm text-[var(--color-text-faint)]">Aucun Big Goal pour l'instant.</Card>
      ) : (
        <div className="space-y-3">
          {visible.map((g) => (
            <Card key={g.id} className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className={g.is_validated ? 'font-medium line-through text-[var(--color-text-faint)]' : 'font-medium'}>{g.title}</p>
                  {g.description && <p className="mt-1 text-sm text-[var(--color-text-muted)]">{g.description}</p>}
                  {g.target_date && <Badge color="var(--color-text-faint)">Cible : {g.target_date}</Badge>}
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button variant="ghost" size="icon" onClick={() => { update('bigGoals', g.id, { is_validated: !g.is_validated }); if (!g.is_validated) logHistory('big_goals', 'Big Goal atteint', g.title); }}>
                    <CheckCircle2 size={15} className={g.is_validated ? 'text-[var(--color-success)]' : ''} />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => update('bigGoals', g.id, { is_archived: !g.is_archived })}>
                    <Archive size={15} />
                  </Button>
                  <Button variant="danger" size="icon" onClick={() => remove('bigGoals', g.id)}>
                    <Trash2 size={15} />
                  </Button>
                </div>
              </div>
              <ProgressBar value={g.progress} />
              {g.sub_tasks.length === 0 ? (
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={g.progress}
                  onChange={(e) => update('bigGoals', g.id, { progress: Number(e.target.value) })}
                  className="w-full accent-[var(--color-violet)]"
                />
              ) : null}
              <SubTaskList
                items={g.sub_tasks}
                onChange={(items) => {
                  const pct = items.length ? clampPercent((items.filter((i) => i.done).length / items.length) * 100) : g.progress;
                  update('bigGoals', g.id, { sub_tasks: items, progress: pct });
                }}
              />
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nouveau Big Goal">
        <div className="space-y-3">
          <div>
            <Label>Titre</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div>
            <Label>Date cible</Label>
            <Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
          </div>
          <Button variant="primary" className="w-full" onClick={handleSave}>
            Enregistrer
          </Button>
        </div>
      </Modal>
    </div>
  );
}
