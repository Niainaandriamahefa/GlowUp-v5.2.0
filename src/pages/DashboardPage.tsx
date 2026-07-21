import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, TrendingUp, Wallet, Target, Trophy, Quote as QuoteIcon, BookOpen, Flame, Star, ChevronRight } from 'lucide-react';
import { useGlowUpData } from '@/context/GlowUpContext';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { todayISO, currentMonth, clampPercent } from '@/lib/utils';
import { useCurrencyFormatter } from '@/hooks/useCurrency';
import { computeScore, weekRangeFor } from '@/lib/bilan';

export default function DashboardPage() {
  const { data, add, update, isHabitDone, profile } = useGlowUpData();
  const { format } = useCurrencyFormatter();
  const today = todayISO();
  const month = currentMonth();

  const todaysTasks = useMemo(
    () => data.planningTasks.filter((t) => t.date === today || t.is_daily),
    [data.planningTasks, today]
  );
  const isDone = (t: (typeof todaysTasks)[number]) => (t.is_daily ? isHabitDone(t.id, today) : t.is_done);
  const doneCount = todaysTasks.filter(isDone).length;
  const taskProgress = todaysTasks.length ? clampPercent((doneCount / todaysTasks.length) * 100) : 0;

  const activeTodos = data.todos.filter((t) => !t.is_archived && !t.is_done);
  const budgetThisMonth = data.budgetCategories.filter((b) => b.month === month);
  const totalPlanned = budgetThisMonth.reduce((s, b) => s + b.planned_amount, 0);
  const legacyIncome = data.incomeEntries.filter((i) => i.month === month).reduce((s, i) => s + i.amount, 0);
  const txIncome = data.transactions.filter((t) => t.type === 'income' && t.date.slice(0, 7) === month).reduce((s, t) => s + t.amount, 0);
  const txExpenseOnly = data.transactions.filter((t) => t.type === 'expense' && t.date.slice(0, 7) === month).reduce((s, t) => s + t.amount, 0);
  const totalSpent = budgetThisMonth.reduce((s, b) => s + b.spent_amount, 0) + txExpenseOnly;
  const incomeThisMonth = legacyIncome + txIncome;
  const debtRemaining = data.debts.filter((d) => !d.is_settled).reduce((s, d) => s + (d.amount - d.paid_amount), 0);
  const realBalance = useMemo(() => {
    const initial = data.financeAccounts.filter((a) => !a.is_archived).reduce((s, a) => s + a.initial_amount, 0);
    const delta = data.transactions.reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0);
    return initial + delta;
  }, [data.financeAccounts, data.transactions]);

  const { from: weekFrom, to: weekTo } = weekRangeFor(today);
  const score = useMemo(() => computeScore(data, weekFrom, weekTo), [data, weekFrom, weekTo]);

  const activeObjectives = data.monthlyObjectives.filter((o) => !o.is_archived && !o.is_validated);
  const activeChallenges = data.challenges.filter((c) => !c.is_archived);

  const todayQuote = useMemo(() => data.quotes.find((q) => q.date === today && q.is_generated), [data.quotes, today]);
  const todayVerse = useMemo(() => data.verses.find((v) => v.date === today && v.is_generated), [data.verses, today]);

  // Mélange défilant : verset/citation du jour + favoris + ajouts personnels, sans doublons (dédupliqué par id).
  const quotePool = useMemo(() => {
    const map = new Map<string, (typeof data.quotes)[number]>();
    data.quotes
      .filter((q) => !q.is_archived && ((q.date === today && q.is_generated) || q.is_favorite || !q.is_generated))
      .forEach((q) => map.set(q.id, q));
    return Array.from(map.values());
  }, [data.quotes, today]);

  const versePool = useMemo(() => {
    const map = new Map<string, (typeof data.verses)[number]>();
    data.verses
      .filter((v) => !v.is_archived && ((v.date === today && v.is_generated) || v.is_favorite || !v.is_generated))
      .forEach((v) => map.set(v.id, v));
    return Array.from(map.values());
  }, [data.verses, today]);

  const [quoteIndex, setQuoteIndex] = useState(0);
  const [verseIndex, setVerseIndex] = useState(0);

  useEffect(() => {
    if (quotePool.length <= 1) return;
    const id = setInterval(() => setQuoteIndex((i) => (i + 1) % quotePool.length), 12000);
    return () => clearInterval(id);
  }, [quotePool.length]);

  useEffect(() => {
    if (versePool.length <= 1) return;
    const id = setInterval(() => setVerseIndex((i) => (i + 1) % versePool.length), 14000);
    return () => clearInterval(id);
  }, [versePool.length]);

  const shownQuote = quotePool[quoteIndex % quotePool.length] ?? todayQuote;
  const shownVerse = versePool[verseIndex % versePool.length] ?? todayVerse;

  // Enregistre le jour d'utilisation pour le streak
  useEffect(() => {
    const exists = data.trackingDays.some((t) => t.date === today);
    if (!exists) {
      add('trackingDays', { date: today, tasks_completed: doneCount, tasks_total: todaysTasks.length, mood: null, note: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today]);

  const streak = useMemo(() => {
    const dates = new Set(data.trackingDays.map((t) => t.date));
    let count = 0;
    let cursor = new Date();
    // si aujourd'hui n'est pas encore marqué on le compte quand même car on vient de créer la ligne
    while (true) {
      const iso = cursor.toISOString().slice(0, 10);
      if (dates.has(iso) || iso === today) {
        count++;
        cursor.setDate(cursor.getDate() - 1);
      } else break;
    }
    return count;
  }, [data.trackingDays, today]);

  const firstName = profile?.full_name?.split(' ')[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src={profile?.avatar_url || '/avatar-default.png'}
            alt="Profil"
            className="h-12 w-12 rounded-full border border-[var(--color-border)] object-cover"
          />
          <div>
            <h1 className="text-2xl font-semibold">
              {firstName ? (
                <>
                  Bonjour, <span className="text-[var(--color-violet-soft)]">{firstName}</span> 👋
                </>
              ) : (
                'Bonjour 👋'
              )}
            </h1>
            <p className="text-sm text-[var(--color-text-muted)]">
              {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/bilan" className="flex items-center gap-1.5 rounded-full border border-[var(--color-violet)]/40 bg-[var(--color-violet)]/10 px-3 py-1.5 text-sm">
            <span className="font-mono font-semibold text-[var(--color-violet-soft)]">{score.global}</span>
            <span className="text-xs text-[var(--color-text-muted)]">Score GlowUp</span>
          </Link>
          <div className="flex items-center gap-1.5 rounded-full border border-[var(--color-border)] px-3 py-1.5 text-sm">
            <Flame size={15} className="text-[var(--color-warning)]" />
            <span className="font-mono">{streak}</span>
            <span className="text-xs text-[var(--color-text-muted)]">jour{streak > 1 ? 's' : ''} de suite</span>
          </div>
        </div>
      </div>

      <Card className="flex flex-col items-center gap-1 border-[var(--color-violet)]/20 bg-gradient-to-b from-[var(--color-violet)]/10 to-transparent py-6 text-center">
        <p className="font-display text-5xl font-bold text-[var(--color-violet-soft)]">{taskProgress}%</p>
        <p className="text-sm text-[var(--color-text-muted)]">
          {doneCount} / {todaysTasks.length} tâches réalisées aujourd'hui
        </p>
        <div className="mt-3 w-full max-w-xs">
          <ProgressBar value={taskProgress} />
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        {shownVerse && (
          <Card className="border-[var(--color-violet)]/30 bg-gradient-to-br from-[var(--color-violet)]/10 to-transparent">
            <div className="flex items-start gap-3">
              <BookOpen size={18} className="mt-0.5 shrink-0 text-[var(--color-violet-soft)]" />
              <div className="min-w-0 flex-1">
                <p className="text-sm italic">« {shownVerse.text} »</p>
                {shownVerse.reference && <p className="mt-1 text-xs text-[var(--color-text-muted)]">— {shownVerse.reference}</p>}
                <p className="mt-1 text-[10px] uppercase tracking-wide text-[var(--color-text-faint)]">
                  {shownVerse.date === today && shownVerse.is_generated ? 'Verset du jour' : shownVerse.is_favorite ? 'Favori' : 'Personnel'}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-center gap-1">
                <button onClick={() => update('verses', shownVerse.id, { is_favorite: !shownVerse.is_favorite })}>
                  <Star size={16} className={shownVerse.is_favorite ? 'fill-[var(--color-warning)] text-[var(--color-warning)]' : 'text-[var(--color-text-faint)]'} />
                </button>
                {versePool.length > 1 && (
                  <button onClick={() => setVerseIndex((i) => (i + 1) % versePool.length)} className="text-[var(--color-text-faint)] hover:text-[var(--color-text)]">
                    <ChevronRight size={14} />
                  </button>
                )}
              </div>
            </div>
          </Card>
        )}
        {shownQuote && (
          <Card className="border-[var(--color-violet)]/30 bg-gradient-to-br from-[var(--color-violet)]/10 to-transparent">
            <div className="flex items-start gap-3">
              <QuoteIcon size={18} className="mt-0.5 shrink-0 text-[var(--color-violet-soft)]" />
              <div className="min-w-0 flex-1">
                <p className="text-sm italic">« {shownQuote.text} »</p>
                {shownQuote.author && <p className="mt-1 text-xs text-[var(--color-text-muted)]">— {shownQuote.author}</p>}
                <p className="mt-1 text-[10px] uppercase tracking-wide text-[var(--color-text-faint)]">
                  {shownQuote.date === today && shownQuote.is_generated ? 'Citation du jour' : shownQuote.is_favorite ? 'Favorite' : 'Personnelle'}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-center gap-1">
                <button onClick={() => update('quotes', shownQuote.id, { is_favorite: !shownQuote.is_favorite })}>
                  <Star size={16} className={shownQuote.is_favorite ? 'fill-[var(--color-warning)] text-[var(--color-warning)]' : 'text-[var(--color-text-faint)]'} />
                </button>
                {quotePool.length > 1 && (
                  <button onClick={() => setQuoteIndex((i) => (i + 1) % quotePool.length)} className="text-[var(--color-text-faint)] hover:text-[var(--color-text)]">
                    <ChevronRight size={14} />
                  </button>
                )}
              </div>
            </div>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Link to="/planning">
          <StatCard icon={<CheckCircle2 size={16} />} label="Tâches du jour" value={`${doneCount}/${todaysTasks.length}`} progress={taskProgress} />
        </Link>
        <Link to="/objectifs">
          <StatCard icon={<TrendingUp size={16} />} label="Objectifs actifs" value={String(activeObjectives.length)} />
        </Link>
        <Link to="/challenges">
          <StatCard icon={<Trophy size={16} />} label="Challenges" value={String(activeChallenges.length)} />
        </Link>
        <Link to="/budget">
          <StatCard icon={<Wallet size={16} />} label="Budget du mois" value={format(totalPlanned - totalSpent)} hint="restant" />
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Link to="/todo">
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-medium">Tâches à faire</h2>
              <span className="text-xs text-[var(--color-text-muted)]">{activeTodos.length}</span>
            </div>
            {activeTodos.length === 0 ? (
              <EmptyLine text="Aucune tâche en attente. Bien joué !" />
            ) : (
              <ul className="space-y-2">
                {activeTodos.slice(0, 5).map((t) => (
                  <li key={t.id} className="flex items-center gap-2 text-sm">
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ background: t.priority === 'high' ? 'var(--color-danger)' : t.priority === 'medium' ? 'var(--color-warning)' : 'var(--color-text-faint)' }}
                    />
                    <span className="truncate">{t.title}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </Link>

        <Link to="/objectifs">
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-medium">Objectifs du mois</h2>
              <Target size={16} className="text-[var(--color-text-muted)]" />
            </div>
            {activeObjectives.length === 0 ? (
              <EmptyLine text="Ajoute ton premier objectif du mois." />
            ) : (
              <div className="space-y-3">
                {activeObjectives.slice(0, 4).map((o) => (
                  <div key={o.id}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="truncate">{o.title}</span>
                      <span className="text-[var(--color-text-muted)]">{o.progress}%</span>
                    </div>
                    <ProgressBar value={o.progress} />
                  </div>
                ))}
              </div>
            )}
          </Card>
        </Link>

        <Link to="/budget">
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-medium">Résumé financier — {month}</h2>
              <Wallet size={16} className="text-[var(--color-text-muted)]" />
            </div>
            <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
              <div>
                <p className="text-lg font-semibold text-[var(--color-success)]">{format(incomeThisMonth)}</p>
                <p className="text-xs text-[var(--color-text-muted)]">Revenus</p>
              </div>
              <div>
                <p className="text-lg font-semibold text-[var(--color-danger)]">{format(totalSpent)}</p>
                <p className="text-xs text-[var(--color-text-muted)]">Dépensé</p>
              </div>
              <div>
                <p className="text-lg font-semibold text-[var(--color-warning)]">{format(debtRemaining)}</p>
                <p className="text-xs text-[var(--color-text-muted)]">Dettes</p>
              </div>
              <div>
                <p className="text-lg font-semibold text-[var(--color-violet-soft)]">{format(realBalance)}</p>
                <p className="text-xs text-[var(--color-text-muted)]">Solde réel</p>
              </div>
            </div>
          </Card>
        </Link>

        <Link to="/challenges">
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-medium">Challenges en cours</h2>
              <Trophy size={16} className="text-[var(--color-text-muted)]" />
            </div>
            {activeChallenges.length === 0 ? (
              <EmptyLine text="Lance-toi un défi !" />
            ) : (
              <div className="space-y-3">
                {activeChallenges.slice(0, 4).map((c) => (
                  <div key={c.id}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="truncate">{c.title}</span>
                      <span className="text-[var(--color-text-muted)]">
                        {c.current_value}/{c.target_value} {c.unit ?? ''}
                      </span>
                    </div>
                    <ProgressBar value={(c.current_value / c.target_value) * 100} color="var(--color-success)" />
                  </div>
                ))}
              </div>
            )}
          </Card>
        </Link>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, progress, hint }: { icon: React.ReactNode; label: string; value: string; progress?: number; hint?: string }) {
  return (
    <Card className="p-4 transition-transform hover:-translate-y-0.5">
      <div className="mb-2 flex items-center gap-2 text-[var(--color-text-muted)]">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="font-display text-xl font-semibold">
        {value} {hint && <span className="text-xs font-normal text-[var(--color-text-muted)]">{hint}</span>}
      </p>
      {progress !== undefined && (
        <div className="mt-2">
          <ProgressBar value={progress} />
        </div>
      )}
    </Card>
  );
}

function EmptyLine({ text }: { text: string }) {
  return <p className="text-sm text-[var(--color-text-faint)]">{text}</p>;
}
