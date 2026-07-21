import { useMemo, useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Plus, Trash2, Archive, ChevronLeft, ChevronRight, TrendingUp } from 'lucide-react';
import { useGlowUpData } from '@/context/GlowUpContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Input, Label } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { clampPercent } from '@/lib/utils';
import { useCurrencyFormatter } from '@/hooks/useCurrency';

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function SavingsPage() {
  const { data, add, update, remove } = useGlowUpData();
  const { format } = useCurrencyFormatter();
  const [showArchived, setShowArchived] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [target, setTarget] = useState(1000);
  const [deadline, setDeadline] = useState('');

  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [year, setYear] = useState(new Date().getFullYear());

  const visible = useMemo(
    () => data.savingsGoals.filter((s) => s.is_archived === showArchived),
    [data.savingsGoals, showArchived]
  );

  const monthlyTarget = useMemo(() => data.savingsMonthlyTargets.find((t) => t.month === month), [data.savingsMonthlyTargets, month]);
  const [targetDraft, setTargetDraft] = useState(monthlyTarget?.target_amount ?? 0);
  const [savedDraft, setSavedDraft] = useState(monthlyTarget?.saved_amount ?? 0);

  function openMonth(m: string) {
    setMonth(m);
    const t = data.savingsMonthlyTargets.find((x) => x.month === m);
    setTargetDraft(t?.target_amount ?? 0);
    setSavedDraft(t?.saved_amount ?? 0);
  }

  function saveMonthlyTarget() {
    if (monthlyTarget) {
      update('savingsMonthlyTargets', monthlyTarget.id, { target_amount: targetDraft, saved_amount: savedDraft });
    } else {
      add('savingsMonthlyTargets', { month, target_amount: targetDraft, saved_amount: savedDraft });
    }
  }

  const yearData = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => {
        const key = `${year}-${String(i + 1).padStart(2, '0')}`;
        const t = data.savingsMonthlyTargets.find((x) => x.month === key);
        return {
          label: new Date(key + '-01').toLocaleDateString('fr-FR', { month: 'short' }),
          objectif: t?.target_amount ?? 0,
          epargne: t?.saved_amount ?? 0,
          reached: t ? t.saved_amount >= t.target_amount && t.target_amount > 0 : false,
        };
      }),
    [data.savingsMonthlyTargets, year]
  );
  const monthsReached = yearData.filter((m) => m.reached).length;
  const yearTotal = yearData.reduce((s, m) => s + m.epargne, 0);

  function handleSave() {
    if (!name.trim()) return;
    add('savingsGoals', {
      name: name.trim(),
      target_amount: target,
      current_amount: 0,
      deadline: deadline || null,
      is_archived: false,
    });
    setName('');
    setModalOpen(false);
  }

  const monthPct = monthlyTarget && monthlyTarget.target_amount > 0 ? clampPercent((monthlyTarget.saved_amount / monthlyTarget.target_amount) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Épargne</h1>
        <p className="text-sm text-[var(--color-text-muted)]">Objectifs mensuels et objectifs nommés.</p>
      </div>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-medium">Objectif d'épargne du mois</h2>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => openMonth(shiftMonth(month, -1))}>
              <ChevronLeft size={16} />
            </Button>
            <span className="text-sm">{new Date(month + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</span>
            <Button variant="ghost" size="icon" onClick={() => openMonth(shiftMonth(month, 1))}>
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Objectif ({month})</Label>
            <Input type="number" value={targetDraft} onChange={(e) => setTargetDraft(Number(e.target.value))} />
          </div>
          <div>
            <Label>Épargné ce mois-ci</Label>
            <Input type="number" value={savedDraft} onChange={(e) => setSavedDraft(Number(e.target.value))} />
          </div>
        </div>
        <ProgressBar value={monthPct} color="var(--color-success)" />
        <div className="mt-2 flex items-center justify-between text-sm">
          <span className="font-mono">
            {format(savedDraft)} / {format(targetDraft)}
          </span>
          <span className="text-[var(--color-text-muted)]">{monthPct}%</span>
        </div>
        <Button variant="primary" size="sm" className="mt-3" onClick={saveMonthlyTarget}>
          Enregistrer
        </Button>
      </Card>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-medium">Progression annuelle</h2>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setYear((y) => y - 1)}>
              <ChevronLeft size={16} />
            </Button>
            <span className="text-sm">{year}</span>
            <Button variant="ghost" size="icon" onClick={() => setYear((y) => y + 1)}>
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
        <div className="mb-3 flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
          <TrendingUp size={14} />
          <span>
            {monthsReached} mois atteints sur 12 · total épargné : <strong className="text-[var(--color-text)]">{format(yearTotal)}</strong>
          </span>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={yearData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="label" stroke="var(--color-text-faint)" fontSize={12} />
            <YAxis stroke="var(--color-text-faint)" fontSize={12} />
            <Tooltip contentStyle={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 8 }} formatter={(v: any) => format(Number(v))} />
            <Bar dataKey="objectif" fill="var(--color-border)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="epargne" fill="#34D399" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <div className="flex items-center justify-between">
        <h2 className="font-medium">Objectifs nommés</h2>
        <Button variant="primary" size="sm" onClick={() => setModalOpen(true)}>
          <Plus size={14} /> Objectif
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
        <Card className="text-center text-sm text-[var(--color-text-faint)]">Aucun objectif d'épargne.</Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {visible.map((s) => {
            const pct = clampPercent((s.current_amount / s.target_amount) * 100);
            return (
              <Card key={s.id} className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{s.name}</p>
                    {s.deadline && <p className="text-xs text-[var(--color-text-muted)]">Échéance : {s.deadline}</p>}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => update('savingsGoals', s.id, { is_archived: !s.is_archived })}>
                      <Archive size={14} />
                    </Button>
                    <Button variant="danger" size="icon" onClick={() => remove('savingsGoals', s.id)}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
                <ProgressBar value={pct} color="var(--color-success)" />
                <div className="flex items-center justify-between text-sm">
                  <span className="font-mono">
                    {format(s.current_amount)} / {format(s.target_amount)}
                  </span>
                  <span className="text-[var(--color-text-muted)]">{pct}%</span>
                </div>
                <Input
                  type="number"
                  value={s.current_amount}
                  onChange={(e) => update('savingsGoals', s.id, { current_amount: Number(e.target.value) })}
                  placeholder="Montant actuel"
                />
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nouvel objectif d'épargne">
        <div className="space-y-3">
          <div>
            <Label>Nom</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="Vacances, fonds d'urgence…" />
          </div>
          <div>
            <Label>Montant cible</Label>
            <Input type="number" value={target} onChange={(e) => setTarget(Number(e.target.value))} />
          </div>
          <div>
            <Label>Échéance (optionnel)</Label>
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
