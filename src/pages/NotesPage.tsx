import { useMemo, useState } from 'react';
import { Plus, Trash2, Archive, Pencil } from 'lucide-react';
import { useGlowUpData } from '@/context/GlowUpContext';
import type { MemoItem } from '@/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Label, Textarea } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';

const COLORS = ['#8B5CF6', '#34D399', '#FBBF24', '#F87171', '#60A5FA'];

export default function NotesPage() {
  const { data, add, update, remove } = useGlowUpData();
  const [showArchived, setShowArchived] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MemoItem | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [color, setColor] = useState(COLORS[0]);

  const visible = useMemo(
    () => data.memos.filter((m) => m.is_archived === showArchived),
    [data.memos, showArchived]
  );

  function openCreate() {
    setEditing(null);
    setTitle('');
    setContent('');
    setColor(COLORS[0]);
    setModalOpen(true);
  }

  function openEdit(memo: MemoItem) {
    setEditing(memo);
    setTitle(memo.title);
    setContent(memo.content);
    setColor(memo.color);
    setModalOpen(true);
  }

  function handleSave() {
    if (!title.trim()) return;
    const payload = { title: title.trim(), content, color, is_archived: false };
    if (editing) update('memos', editing.id, payload);
    else add('memos', payload);
    setModalOpen(false);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Notes</h1>
          <p className="text-sm text-[var(--color-text-muted)]">Tes idées, en un clic.</p>
        </div>
        <Button variant="primary" onClick={openCreate}>
          <Plus size={16} /> Nouvelle note
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
        <Card className="text-center text-sm text-[var(--color-text-faint)]">Aucune note pour l'instant.</Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((memo) => (
            <Card key={memo.id} className="flex flex-col" style={{ borderTopColor: memo.color, borderTopWidth: 3 }}>
              <h3 className="mb-1 font-medium">{memo.title}</h3>
              <p className="mb-3 flex-1 whitespace-pre-wrap text-sm text-[var(--color-text-muted)]">{memo.content}</p>
              <div className="flex gap-1 self-end">
                <Button variant="ghost" size="icon" onClick={() => openEdit(memo)}>
                  <Pencil size={14} />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => update('memos', memo.id, { is_archived: !memo.is_archived })}>
                  <Archive size={14} />
                </Button>
                <Button variant="danger" size="icon" onClick={() => remove('memos', memo.id)}>
                  <Trash2 size={14} />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Modifier la note' : 'Nouvelle note'}>
        <div className="space-y-3">
          <div>
            <Label>Titre</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
          </div>
          <div>
            <Label>Contenu</Label>
            <Textarea rows={5} value={content} onChange={(e) => setContent(e.target.value)} />
          </div>
          <div>
            <Label>Couleur</Label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className="h-7 w-7 rounded-full border-2"
                  style={{ background: c, borderColor: color === c ? '#fff' : 'transparent' }}
                />
              ))}
            </div>
          </div>
          <Button variant="primary" className="w-full" onClick={handleSave}>
            Enregistrer
          </Button>
        </div>
      </Modal>
    </div>
  );
}
