import { useMemo, useState } from 'react';
import { Plus, Trash2, Archive, Smile } from 'lucide-react';
import { useGlowUpData } from '@/context/GlowUpContext';
import type { JournalEntry } from '@/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Label, Textarea } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { todayISO } from '@/lib/utils';

const MOODS = ['😞', '😕', '😐', '🙂', '😄'];

export default function JournalPage() {
  const { data, add, update, remove, logHistory } = useGlowUpData();
  const [showArchived, setShowArchived] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<JournalEntry | null>(null);

  const [date, setDate] = useState(todayISO());
  const [mood, setMood] = useState<number | null>(null);
  const [content, setContent] = useState('');
  const [gratitude, setGratitude] = useState('');
  const [badCause, setBadCause] = useState('');
  const [badSolution, setBadSolution] = useState('');
  const [motivation, setMotivation] = useState('');

  const visible = useMemo(
    () =>
      data.journalEntries
        .filter((j) => j.is_archived === showArchived)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [data.journalEntries, showArchived]
  );

  function openCreate() {
    setEditing(null);
    setDate(todayISO());
    setMood(null);
    setContent('');
    setGratitude('');
    setBadCause('');
    setBadSolution('');
    setMotivation('');
    setModalOpen(true);
  }

  function openEdit(entry: JournalEntry) {
    setEditing(entry);
    setDate(entry.date);
    setMood(entry.mood);
    setContent(entry.content);
    setGratitude(entry.gratitude ?? '');
    setBadCause(entry.bad_moment_cause ?? '');
    setBadSolution(entry.bad_moment_solution ?? '');
    setMotivation(entry.motivation ?? '');
    setModalOpen(true);
  }

  function handleSave() {
    const payload = {
      date,
      mood,
      content,
      gratitude: gratitude.trim() || null,
      bad_moment_cause: badCause.trim() || null,
      bad_moment_solution: badSolution.trim() || null,
      motivation: motivation.trim() || null,
      is_archived: false,
    };
    if (editing) update('journalEntries', editing.id, payload);
    else {
      add('journalEntries', payload);
      logHistory('journal', 'Entrée de journal ajoutée', date);
    }
    setModalOpen(false);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Journal</h1>
          <p className="text-sm text-[var(--color-text-muted)]">Raconte ta journée, ton humeur, ta motivation.</p>
        </div>
        <Button variant="primary" onClick={openCreate}>
          <Plus size={16} /> Nouvelle entrée
        </Button>
      </div>

      <div className="flex gap-2">
        <Button variant={!showArchived ? 'primary' : 'ghost'} size="sm" onClick={() => setShowArchived(false)}>
          Actives
        </Button>
        <Button variant={showArchived ? 'primary' : 'ghost'} size="sm" onClick={() => setShowArchived(true)}>
          Archivées
        </Button>
      </div>

      {visible.length === 0 ? (
        <Card className="text-center text-sm text-[var(--color-text-faint)]">Aucune entrée de journal.</Card>
      ) : (
        <div className="space-y-3">
          {visible.map((j) => (
            <Card key={j.id} className="cursor-pointer" onClick={() => openEdit(j)}>
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {j.mood !== null && <span className="text-xl">{MOODS[j.mood - 1]}</span>}
                  <span className="font-medium">{j.date}</span>
                </div>
                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" onClick={() => update('journalEntries', j.id, { is_archived: !j.is_archived })}>
                    <Archive size={14} />
                  </Button>
                  <Button variant="danger" size="icon" onClick={() => remove('journalEntries', j.id)}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
              {j.content && <p className="whitespace-pre-wrap text-sm text-[var(--color-text-muted)]">{j.content}</p>}
              {j.motivation && <p className="mt-2 text-xs italic text-[var(--color-violet-soft)]">« {j.motivation} »</p>}
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Modifier l'entrée" : 'Nouvelle entrée de journal'}>
        <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <Label>Humeur</Label>
              <div className="flex gap-1">
                {MOODS.map((m, i) => (
                  <button
                    key={i}
                    onClick={() => setMood(i + 1)}
                    className={`flex h-9 w-9 items-center justify-center rounded-lg text-lg ${mood === i + 1 ? 'bg-[var(--color-violet)]/20 ring-2 ring-[var(--color-violet)]' : 'hover:bg-[var(--color-bg-hover)]'}`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <Label>Comment s'est passée ta journée ?</Label>
            <Textarea rows={4} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Raconte..." />
          </div>
          <div>
            <Label>Gratitude — ce que j'ai bien fait</Label>
            <Textarea rows={2} value={gratitude} onChange={(e) => setGratitude(e.target.value)} />
          </div>
          <div>
            <Label>Bad mood — cause</Label>
            <Textarea rows={2} value={badCause} onChange={(e) => setBadCause(e.target.value)} />
          </div>
          <div>
            <Label>Bad mood — solution</Label>
            <Textarea rows={2} value={badSolution} onChange={(e) => setBadSolution(e.target.value)} />
          </div>
          <div>
            <Label>Motivation / citation du jour (facultatif)</Label>
            <Input value={motivation} onChange={(e) => setMotivation(e.target.value)} />
          </div>
          <Button variant="primary" className="w-full" onClick={handleSave}>
            <Smile size={15} /> Enregistrer
          </Button>
        </div>
      </Modal>
    </div>
  );
}
