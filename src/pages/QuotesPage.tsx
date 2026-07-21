import { useMemo, useState } from 'react';
import { Plus, Star, Trash2, Quote as QuoteIcon } from 'lucide-react';
import { useGlowUpData } from '@/context/GlowUpContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Label, Textarea } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { todayISO } from '@/lib/utils';

export default function QuotesPage() {
  const { data, add, update, remove } = useGlowUpData();
  const today = todayISO();
  const [modalOpen, setModalOpen] = useState(false);
  const [text, setText] = useState('');
  const [author, setAuthor] = useState('');
  const [tab, setTab] = useState<'generated' | 'favorites' | 'perso'>('generated');

  // La citation du jour est générée une seule fois de façon centralisée dans
  // GlowUpContext (protégée par un marqueur par jour) — cette page l'affiche
  // uniquement, elle ne la régénère jamais elle-même.

  const generated = useMemo(
    () => data.quotes.filter((q) => q.is_generated && !q.is_archived).sort((a, b) => b.date.localeCompare(a.date)),
    [data.quotes]
  );
  const favorites = useMemo(() => data.quotes.filter((q) => q.is_favorite && !q.is_archived), [data.quotes]);
  const perso = useMemo(() => data.quotes.filter((q) => !q.is_generated && !q.is_archived), [data.quotes]);
  const list = tab === 'generated' ? generated : tab === 'favorites' ? favorites : perso;

  function saveManual() {
    if (!text.trim()) return;
    add('quotes', { text: text.trim(), author: author.trim() || null, is_favorite: false, is_archived: false, is_generated: false, date: today });
    setText('');
    setAuthor('');
    setModalOpen(false);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Citations</h1>
          <p className="text-sm text-[var(--color-text-muted)]">Ta banque de motivation, renouvelée chaque jour.</p>
        </div>
        <Button variant="primary" onClick={() => setModalOpen(true)}>
          <Plus size={16} /> Ajouter
        </Button>
      </div>

      <div className="flex gap-2">
        <Button variant={tab === 'generated' ? 'primary' : 'ghost'} size="sm" onClick={() => setTab('generated')}>
          <QuoteIcon size={13} /> Générées
        </Button>
        <Button variant={tab === 'favorites' ? 'primary' : 'ghost'} size="sm" onClick={() => setTab('favorites')}>
          <Star size={13} /> Favoris
        </Button>
        <Button variant={tab === 'perso' ? 'primary' : 'ghost'} size="sm" onClick={() => setTab('perso')}>
          Personnelles
        </Button>
      </div>

      {list.length === 0 ? (
        <Card className="text-center text-sm text-[var(--color-text-faint)]">Rien ici pour l'instant.</Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {list.map((q) => (
            <Card key={q.id} className="flex flex-col gap-2">
              <p className="italic">« {q.text} »</p>
              {q.author && <p className="text-xs text-[var(--color-text-muted)]">— {q.author}</p>}
              <div className="mt-1 flex justify-between">
                <span className="text-xs text-[var(--color-text-faint)]">{q.date}</span>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => update('quotes', q.id, { is_favorite: !q.is_favorite })}>
                    <Star size={14} className={q.is_favorite ? 'fill-[var(--color-warning)] text-[var(--color-warning)]' : ''} />
                  </Button>
                  <Button variant="danger" size="icon" onClick={() => remove('quotes', q.id)}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nouvelle citation">
        <div className="space-y-3">
          <div>
            <Label>Citation</Label>
            <Textarea rows={5} value={text} onChange={(e) => setText(e.target.value)} autoFocus className="text-base leading-relaxed" />
          </div>
          <div>
            <Label>Auteur</Label>
            <Input value={author} onChange={(e) => setAuthor(e.target.value)} />
          </div>
          <Button variant="primary" className="w-full" onClick={saveManual}>
            Enregistrer
          </Button>
        </div>
      </Modal>
    </div>
  );
}
