import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Checkbox, Input } from '@/components/ui/Field';
import { uid } from '@/lib/utils';
import type { MicroTaskEntry } from '@/types';

export function SubTaskList({
  items,
  onChange,
}: {
  items: MicroTaskEntry[];
  onChange: (items: MicroTaskEntry[]) => void;
}) {
  const [draft, setDraft] = useState('');

  function addItem() {
    if (!draft.trim()) return;
    onChange([...items, { id: uid(), text: draft.trim(), done: false }]);
    setDraft('');
  }

  function toggle(id: string) {
    onChange(items.map((i) => (i.id === id ? { ...i, done: !i.done } : i)));
  }

  function removeItem(id: string) {
    onChange(items.filter((i) => i.id !== id));
  }

  const done = items.filter((i) => i.done).length;

  return (
    <div className="space-y-2">
      {items.length > 0 && (
        <p className="text-xs text-[var(--color-text-muted)]">
          {done}/{items.length} petites étapes accomplies
        </p>
      )}
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-2 text-sm">
            <Checkbox checked={item.done} onChange={() => toggle(item.id)} />
            <span className={`flex-1 ${item.done ? 'text-[var(--color-text-faint)] line-through' : ''}`}>{item.text}</span>
            <button onClick={() => removeItem(item.id)} className="text-[var(--color-text-faint)] hover:text-[var(--color-danger)]">
              <Trash2 size={13} />
            </button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addItem()}
          placeholder="Décortiquer en petite étape…"
          className="text-xs"
        />
        <button onClick={addItem} className="rounded-lg bg-[var(--color-bg-elevated)] px-2.5 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)]">
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}
