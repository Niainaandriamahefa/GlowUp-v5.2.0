import { useMemo, useState } from 'react';
import { Plus, Star, Trash2, BookOpen, Languages } from 'lucide-react';
import { useGlowUpData } from '@/context/GlowUpContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Label, Textarea } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { todayISO } from '@/lib/utils';

export default function VersesPage() {
  const { data, add, update, remove } = useGlowUpData();
  const today = todayISO();
  const [modalOpen, setModalOpen] = useState(false);
  const [text, setText] = useState('');
  const [reference, setReference] = useState('');
  const [translationFr, setTranslationFr] = useState('');
  const [tab, setTab] = useState<'generated' | 'favorites' | 'perso'>('generated');
  const [shownTranslations, setShownTranslations] = useState<Set<string>>(new Set());

  function toggleTranslation(id: string) {
    setShownTranslations((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Le verset du jour est généré une seule fois de façon centralisée dans
  // GlowUpContext (protégé par un marqueur par jour) — cette page ne fait que
  // l'afficher, elle ne le régénère jamais elle-même.

  const generated = useMemo(
    () => data.verses.filter((v) => v.is_generated && !v.is_archived).sort((a, b) => b.date.localeCompare(a.date)),
    [data.verses]
  );
  const favorites = useMemo(() => data.verses.filter((v) => v.is_favorite && !v.is_archived), [data.verses]);
  const perso = useMemo(() => data.verses.filter((v) => !v.is_generated && !v.is_archived), [data.verses]);

  const list = tab === 'generated' ? generated : tab === 'favorites' ? favorites : perso;

  function saveManual() {
    if (!text.trim()) return;
    add('verses', {
      text: text.trim(),
      reference: reference.trim() || null,
      translation_fr: translationFr.trim() || null,
      is_generated: false,
      is_favorite: false,
      is_archived: false,
      date: today,
    });
    setText('');
    setReference('');
    setTranslationFr('');
    setModalOpen(false);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Versets</h1>
          <p className="text-sm text-[var(--color-text-muted)]">Un verset chaque jour, tes favoris, tes ajouts personnels.</p>
        </div>
        <Button variant="primary" onClick={() => setModalOpen(true)}>
          <Plus size={16} /> Ajouter
        </Button>
      </div>

      <div className="flex gap-2">
        <Button variant={tab === 'generated' ? 'primary' : 'ghost'} size="sm" onClick={() => setTab('generated')}>
          <BookOpen size={13} /> Générés
        </Button>
        <Button variant={tab === 'favorites' ? 'primary' : 'ghost'} size="sm" onClick={() => setTab('favorites')}>
          <Star size={13} /> Favoris
        </Button>
        <Button variant={tab === 'perso' ? 'primary' : 'ghost'} size="sm" onClick={() => setTab('perso')}>
          Personnels
        </Button>
      </div>

      {list.length === 0 ? (
        <Card className="text-center text-sm text-[var(--color-text-faint)]">Rien ici pour l'instant.</Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {list.map((v) => (
            <Card key={v.id} className="flex flex-col gap-2">
              <p className="italic">« {v.text} »</p>
              {shownTranslations.has(v.id) && v.translation_fr && (
                <p className="rounded-lg bg-[var(--color-bg-elevated)] p-2 text-sm italic text-[var(--color-text-muted)]">« {v.translation_fr} »</p>
              )}
              {v.reference && <p className="text-xs text-[var(--color-text-muted)]">— {v.reference}</p>}
              <div className="mt-1 flex items-center justify-between">
                <span className="text-xs text-[var(--color-text-faint)]">{v.date}</span>
                <div className="flex gap-1">
                  {v.translation_fr && (
                    <Button variant="ghost" size="icon" title="Afficher/Masquer la traduction" onClick={() => toggleTranslation(v.id)}>
                      <Languages size={14} className={shownTranslations.has(v.id) ? 'text-[var(--color-violet-soft)]' : ''} />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => update('verses', v.id, { is_favorite: !v.is_favorite })}>
                    <Star size={14} className={v.is_favorite ? 'fill-[var(--color-warning)] text-[var(--color-warning)]' : ''} />
                  </Button>
                  <Button variant="danger" size="icon" onClick={() => remove('verses', v.id)}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Ajouter un verset">
        <div className="space-y-3">
          <div>
            <Label>Texte</Label>
            <Textarea rows={6} value={text} onChange={(e) => setText(e.target.value)} autoFocus className="text-base leading-relaxed" />
          </div>
          <div>
            <Label>Référence</Label>
            <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Ex : Jean 3:16" />
          </div>
          <div>
            <Label>Traduction française (facultatif)</Label>
            <Textarea rows={4} value={translationFr} onChange={(e) => setTranslationFr(e.target.value)} className="text-base leading-relaxed" />
          </div>
          <Button variant="primary" className="w-full" onClick={saveManual}>
            Enregistrer
          </Button>
        </div>
      </Modal>
    </div>
  );
}
