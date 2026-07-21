import { useMemo, useState } from 'react';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { useGlowUpData } from '@/context/GlowUpContext';
import type { QualityKind, QualityNote } from '@/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Label, Textarea } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';

const COLUMNS: { kind: QualityKind; title: string; color: string; placeholder: string }[] = [
  { kind: 'good_have', title: 'Bonnes qualités que j\u2019ai', color: 'var(--color-success)', placeholder: 'Ex : Persévérant(e)' },
  { kind: 'bad_have', title: 'Mauvaises qualités que j\u2019ai', color: 'var(--color-danger)', placeholder: 'Ex : Procrastination' },
  { kind: 'good_want', title: 'Bonnes qualités à avoir', color: 'var(--color-violet-soft)', placeholder: 'Ex : Plus discipliné(e)' },
  { kind: 'good_lost', title: 'Bonnes qualités perdues', color: 'var(--color-warning)', placeholder: 'Ex : Motivation du début' },
];

export default function QualitiesPage() {
  const { data, add, update, remove } = useGlowUpData();
  const [drafts, setDrafts] = useState<Record<QualityKind, string>>({
    good_have: '',
    bad_have: '',
    good_want: '',
    good_lost: '',
  });

  const [detailTarget, setDetailTarget] = useState<QualityNote | null>(null);
  const [cause, setCause] = useState('');
  const [consequences, setConsequences] = useState('');
  const [solutions, setSolutions] = useState('');
  const [improvementPlan, setImprovementPlan] = useState('');

  const grouped = useMemo(() => {
    const g: Record<QualityKind, typeof data.qualityNotes> = { good_have: [], bad_have: [], good_want: [], good_lost: [] };
    data.qualityNotes.forEach((q) => g[q.kind].push(q));
    return g;
  }, [data.qualityNotes]);

  function addItem(kind: QualityKind) {
    const text = drafts[kind].trim();
    if (!text) return;
    add('qualityNotes', { kind, text, cause: null, consequences: null, solutions: null, improvement_plan: null });
    setDrafts((d) => ({ ...d, [kind]: '' }));
  }

  function openDetails(q: QualityNote) {
    setDetailTarget(q);
    setCause(q.cause ?? '');
    setConsequences(q.consequences ?? '');
    setSolutions(q.solutions ?? '');
    setImprovementPlan(q.improvement_plan ?? '');
  }

  function saveDetails() {
    if (!detailTarget) return;
    update('qualityNotes', detailTarget.id, {
      cause: cause.trim() || null,
      consequences: consequences.trim() || null,
      solutions: solutions.trim() || null,
      improvement_plan: improvementPlan.trim() || null,
    });
    setDetailTarget(null);
  }

  const hasDetails = (q: QualityNote) => q.cause || q.consequences || q.solutions || q.improvement_plan;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Qualités</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          Un miroir honnête sur toi-même — clique sur le crayon pour approfondir (cause, conséquences, solutions, plan
          d'amélioration).
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {COLUMNS.map((col) => (
          <Card key={col.kind}>
            <h2 className="mb-3 text-sm font-semibold" style={{ color: col.color }}>
              {col.title}
            </h2>
            <div className="mb-3 flex gap-2">
              <Input
                value={drafts[col.kind]}
                onChange={(e) => setDrafts((d) => ({ ...d, [col.kind]: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && addItem(col.kind)}
                placeholder={col.placeholder}
              />
              <Button variant="secondary" size="icon" onClick={() => addItem(col.kind)}>
                <Plus size={15} />
              </Button>
            </div>
            {grouped[col.kind].length === 0 ? (
              <p className="text-sm text-[var(--color-text-faint)]">Rien pour l'instant.</p>
            ) : (
              <ul className="space-y-1.5">
                {grouped[col.kind].map((q) => (
                  <li key={q.id} className="rounded-lg bg-[var(--color-bg-elevated)] px-3 py-2 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span>{q.text}</span>
                      <div className="flex shrink-0 gap-1">
                        <button onClick={() => openDetails(q)} className="text-[var(--color-text-faint)] hover:text-[var(--color-violet-soft)]">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => remove('qualityNotes', q.id)} className="text-[var(--color-text-faint)] hover:text-[var(--color-danger)]">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                    {hasDetails(q) && (
                      <div className="mt-1.5 space-y-0.5 border-t border-[var(--color-border)] pt-1.5 text-xs text-[var(--color-text-muted)]">
                        {q.cause && <p><strong>Cause :</strong> {q.cause}</p>}
                        {q.consequences && <p><strong>Conséquences :</strong> {q.consequences}</p>}
                        {q.solutions && <p><strong>Solutions :</strong> {q.solutions}</p>}
                        {q.improvement_plan && <p><strong>Plan :</strong> {q.improvement_plan}</p>}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        ))}
      </div>

      <Modal open={!!detailTarget} onClose={() => setDetailTarget(null)} title={`Détails — ${detailTarget?.text ?? ''}`}>
        <div className="space-y-3">
          <div>
            <Label>Cause</Label>
            <Textarea rows={2} value={cause} onChange={(e) => setCause(e.target.value)} />
          </div>
          <div>
            <Label>Conséquences</Label>
            <Textarea rows={2} value={consequences} onChange={(e) => setConsequences(e.target.value)} />
          </div>
          <div>
            <Label>Solutions</Label>
            <Textarea rows={2} value={solutions} onChange={(e) => setSolutions(e.target.value)} />
          </div>
          <div>
            <Label>Plan d'amélioration</Label>
            <Textarea rows={2} value={improvementPlan} onChange={(e) => setImprovementPlan(e.target.value)} />
          </div>
          <Button variant="primary" className="w-full" onClick={saveDetails}>
            Enregistrer
          </Button>
        </div>
      </Modal>
    </div>
  );
}
