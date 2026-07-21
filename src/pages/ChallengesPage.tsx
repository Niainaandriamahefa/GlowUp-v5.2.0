import { useMemo, useState } from 'react';
import { Plus, Trash2, Archive, Minus } from 'lucide-react';
import { useGlowUpData } from '@/context/GlowUpContext';
import type { ChallengeType } from '@/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Input, Label, Select, Checkbox } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { SubTaskList } from '@/components/ui/SubTaskList';
import { clampPercent } from '@/lib/utils';

export default function ChallengesPage() {
  const { data, add, update, remove, logHistory } = useGlowUpData();
  const [showArchived, setShowArchived] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [type, setType] = useState<ChallengeType>('numeric');
  const [target, setTarget] = useState(10);
  const [unit, setUnit] = useState('');

  const visible = useMemo(
    () => data.challenges.filter((c) => c.is_archived === showArchived),
    [data.challenges, showArchived]
  );

  function handleSave() {
    if (!title.trim()) return;
    add('challenges', {
      title: title.trim(),
      type,
      target_value: type === 'boolean' ? 1 : target,
      current_value: 0,
      unit: unit.trim() || null,
      is_archived: false,
      sub_tasks: [],
    });
    setTitle('');
    setModalOpen(false);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Challenges</h1>
          <p className="text-sm text-[var(--color-text-muted)]">Défie-toi, suis ta progression.</p>
        </div>
        <Button variant="primary" onClick={() => setModalOpen(true)}>
          <Plus size={16} /> Nouveau défi
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
        <Card className="text-center text-sm text-[var(--color-text-faint)]">Aucun challenge pour l'instant.</Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {visible.map((c) => {
            const pct = clampPercent((c.current_value / c.target_value) * 100);
            return (
              <Card key={c.id} className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium">{c.title}</p>
                  <div className="flex shrink-0 gap-1">
                    <Button variant="ghost" size="icon" onClick={() => update('challenges', c.id, { is_archived: !c.is_archived })}>
                      <Archive size={14} />
                    </Button>
                    <Button variant="danger" size="icon" onClick={() => remove('challenges', c.id)}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>

                {c.type === 'boolean' ? (
                  <div className="flex items-center gap-2">
                    <Checkbox checked={c.current_value >= c.target_value} onChange={(v) => { update('challenges', c.id, { current_value: v ? c.target_value : 0 }); if (v) logHistory('challenges', 'Défi accompli', c.title); }} />
                    <span className="text-sm text-[var(--color-text-muted)]">Fait aujourd'hui</span>
                  </div>
                ) : (
                  <>
                    <ProgressBar value={pct} color="var(--color-success)" />
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="secondary"
                          size="icon"
                          onClick={() => update('challenges', c.id, { current_value: Math.max(0, c.current_value - 1) })}
                        >
                          <Minus size={14} />
                        </Button>
                        <span className="font-mono">
                          {c.current_value} / {c.target_value} {c.unit ?? ''}
                        </span>
                        <Button variant="secondary" size="icon" onClick={() => { const next = c.current_value + 1; update('challenges', c.id, { current_value: next }); if (next >= c.target_value) logHistory('challenges', 'Défi accompli', c.title); }}>
                          <Plus size={14} />
                        </Button>
                      </div>
                      <span className="text-[var(--color-text-muted)]">{pct}%</span>
                    </div>
                  </>
                )}
                <SubTaskList items={c.sub_tasks} onChange={(items) => update('challenges', c.id, { sub_tasks: items })} />
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nouveau challenge">
        <div className="space-y-3">
          <div>
            <Label>Titre</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus placeholder="Ex : 30 jours sans sucre" />
          </div>
          <div>
            <Label>Type</Label>
            <Select value={type} onChange={(e) => setType(e.target.value as ChallengeType)}>
              <option value="numeric">Numérique (ex : nb de jours, km, pages)</option>
              <option value="boolean">Oui / Non (fait ou pas)</option>
            </Select>
          </div>
          {type === 'numeric' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Objectif</Label>
                <Input type="number" value={target} onChange={(e) => setTarget(Number(e.target.value))} />
              </div>
              <div>
                <Label>Unité</Label>
                <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="jours, km…" />
              </div>
            </div>
          )}
          <Button variant="primary" className="w-full" onClick={handleSave}>
            Enregistrer
          </Button>
        </div>
      </Modal>
    </div>
  );
}
