import { useMemo, useState } from 'react';
import { Plus, Trash2, Archive, CheckCircle2 } from 'lucide-react';
import { useGlowUpData } from '@/context/GlowUpContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Input, Label, Badge } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { todayISO } from '@/lib/utils';

export default function MonthlyObjectivesPage() {
  const { data, add, update, remove, logHistory } = useGlowUpData();
  const [showArchived, setShowArchived] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Général');
  const [deadline, setDeadline] = useState(todayISO());

  const visible = useMemo(
    () => data.monthlyObjectives.filter((o) => o.is_archived === showArchived),
    [data.monthlyObjectives, showArchived]
  );

  function handleSave() {
    if (!title.trim()) return;
    add('monthlyObjectives', {
      title: title.trim(),
      category,
      deadline,
      progress: 0,
      is_validated: false,
      is_archived: false,
    });
    setTitle('');
    setModalOpen(false);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Objectifs mensuels</h1>
          <p className="text-sm text-[var(--color-text-muted)]">Ce que tu veux accomplir ce mois-ci.</p>
        </div>
        <Button variant="primary" onClick={() => setModalOpen(true)}>
          <Plus size={16} /> Nouvel objectif
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
        <Card className="text-center text-sm text-[var(--color-text-faint)]">Aucun objectif pour l'instant.</Card>
      ) : (
        <div className="space-y-3">
          {visible.map((o) => (
            <Card key={o.id} className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className={o.is_validated ? 'font-medium line-through text-[var(--color-text-faint)]' : 'font-medium'}>{o.title}</p>
                  <div className="mt-1 flex gap-1.5">
                    <Badge>{o.category}</Badge>
                    <Badge color="var(--color-text-faint)">Échéance : {o.deadline}</Badge>
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button variant="ghost" size="icon" onClick={() => { update('monthlyObjectives', o.id, { is_validated: !o.is_validated }); if (!o.is_validated) logHistory('objectifs', 'Objectif atteint', o.title); }}>
                    <CheckCircle2 size={15} className={o.is_validated ? 'text-[var(--color-success)]' : ''} />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => update('monthlyObjectives', o.id, { is_archived: !o.is_archived })}>
                    <Archive size={15} />
                  </Button>
                  <Button variant="danger" size="icon" onClick={() => remove('monthlyObjectives', o.id)}>
                    <Trash2 size={15} />
                  </Button>
                </div>
              </div>
              <div>
                <div className="mb-1 flex justify-between text-xs text-[var(--color-text-muted)]">
                  <span>Progression</span>
                  <span>{o.progress}%</span>
                </div>
                <ProgressBar value={o.progress} />
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={o.progress}
                  onChange={(e) => update('monthlyObjectives', o.id, { progress: Number(e.target.value) })}
                  className="mt-2 w-full accent-[var(--color-violet)]"
                />
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nouvel objectif">
        <div className="space-y-3">
          <div>
            <Label>Titre</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
          </div>
          <div>
            <Label>Catégorie</Label>
            <Input value={category} onChange={(e) => setCategory(e.target.value)} />
          </div>
          <div>
            <Label>Date limite</Label>
            <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>
          <Button variant="primary" className="w-full" onClick={handleSave}>
            Enregistrer
          </Button>
        </div>
      </Modal>
    </div>
  );
}
