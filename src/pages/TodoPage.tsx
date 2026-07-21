import { useMemo, useState } from 'react';
import { Plus, Trash2, Archive, Pencil } from 'lucide-react';
import { useGlowUpData } from '@/context/GlowUpContext';
import type { Priority, TodoItem } from '@/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Checkbox, Badge, Input, Label, Select, Textarea } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';

const PRIORITY_LABEL: Record<Priority, string> = { low: 'Basse', medium: 'Moyenne', high: 'Haute' };
const PRIORITY_COLOR: Record<Priority, string> = {
  low: 'var(--color-text-faint)',
  medium: 'var(--color-warning)',
  high: 'var(--color-danger)',
};

export default function TodoPage() {
  const { data, add, update, remove, logHistory } = useGlowUpData();
  const [showArchived, setShowArchived] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TodoItem | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Général');
  const [priority, setPriority] = useState<Priority>('medium');
  const [dueDate, setDueDate] = useState('');

  const visibleTodos = useMemo(
    () => data.todos.filter((t) => t.is_archived === showArchived).sort((a, b) => Number(a.is_done) - Number(b.is_done)),
    [data.todos, showArchived]
  );

  function openCreate() {
    setEditing(null);
    setTitle('');
    setDescription('');
    setCategory('Général');
    setPriority('medium');
    setDueDate('');
    setModalOpen(true);
  }

  function openEdit(todo: TodoItem) {
    setEditing(todo);
    setTitle(todo.title);
    setDescription(todo.description ?? '');
    setCategory(todo.category);
    setPriority(todo.priority);
    setDueDate(todo.due_date ?? '');
    setModalOpen(true);
  }

  function handleSave() {
    if (!title.trim()) return;
    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      category,
      priority,
      due_date: dueDate || null,
      is_done: editing?.is_done ?? false,
      is_archived: false,
    };
    if (editing) update('todos', editing.id, payload);
    else add('todos', payload);
    setModalOpen(false);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">ToDo Priorité</h1>
          <p className="text-sm text-[var(--color-text-muted)]">Ta todo-list, priorisée.</p>
        </div>
        <Button variant="primary" onClick={openCreate}>
          <Plus size={16} /> Nouvelle tâche
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

      {visibleTodos.length === 0 ? (
        <Card className="text-center text-sm text-[var(--color-text-faint)]">Rien ici pour le moment.</Card>
      ) : (
        <div className="space-y-2">
          {visibleTodos.map((todo) => (
            <Card key={todo.id} className="flex items-start gap-3 p-4">
              <Checkbox checked={todo.is_done} onChange={(v) => { update('todos', todo.id, { is_done: v }); if (v) logHistory('todo', 'Tâche accomplie', todo.title); }} />
              <div className="min-w-0 flex-1">
                <p className={todo.is_done ? 'text-[var(--color-text-faint)] line-through' : ''}>{todo.title}</p>
                {todo.description && <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{todo.description}</p>}
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <Badge>{todo.category}</Badge>
                  <Badge color={PRIORITY_COLOR[todo.priority]}>{PRIORITY_LABEL[todo.priority]}</Badge>
                  {todo.due_date && <Badge color="var(--color-text-faint)">{todo.due_date}</Badge>}
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button variant="ghost" size="icon" onClick={() => openEdit(todo)}>
                  <Pencil size={15} />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => update('todos', todo.id, { is_archived: !todo.is_archived })}>
                  <Archive size={15} />
                </Button>
                <Button variant="danger" size="icon" onClick={() => remove('todos', todo.id)}>
                  <Trash2 size={15} />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Modifier la tâche' : 'Nouvelle tâche'}>
        <div className="space-y-3">
          <div>
            <Label>Titre</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex : Appeler le dentiste" autoFocus />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Catégorie</Label>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} />
            </div>
            <div>
              <Label>Priorité</Label>
              <Select value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
                <option value="low">Basse</option>
                <option value="medium">Moyenne</option>
                <option value="high">Haute</option>
              </Select>
            </div>
          </div>
          <div>
            <Label>Échéance</Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <Button variant="primary" className="w-full" onClick={handleSave}>
            Enregistrer
          </Button>
        </div>
      </Modal>
    </div>
  );
}
