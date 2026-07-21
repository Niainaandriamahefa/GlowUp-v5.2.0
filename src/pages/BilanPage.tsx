import { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Info } from 'lucide-react';
import { useGlowUpData } from '@/context/GlowUpContext';
import { useCurrencyFormatter } from '@/hooks/useCurrency';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { todayISO, addWeeksISO, addDaysISO } from '@/lib/utils';
import { computeRangeStats, computeScore, generateInsights, weekRangeFor, monthRangeFor } from '@/lib/bilan';

const CHART_COLORS = ['#8B5CF6', '#34D399', '#FBBF24', '#F87171', '#60A5FA', '#F472B6', '#A78BFA', '#FB923C'];

type ViewMode = 'week' | 'month' | 'year';

export default function BilanPage() {
  const { data } = useGlowUpData();
  const { format } = useCurrencyFormatter();
  const [view, setView] = useState<ViewMode>('week');
  const [weekAnchor, setWeekAnchor] = useState(todayISO());
  const [monthKey, setMonthKey] = useState(todayISO().slice(0, 7));
  const [year, setYear] = useState(new Date().getFullYear());

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Bilan</h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            Le centre d'analyse de GlowUp — entièrement calculé à partir de tes données réelles.
          </p>
        </div>
        <div className="flex rounded-lg border border-[var(--color-border)] p-0.5">
          {(['week', 'month', 'year'] as ViewMode[]).map((v) => (
            <Button key={v} variant={view === v ? 'primary' : 'ghost'} size="sm" onClick={() => setView(v)}>
              {v === 'week' ? 'Semaine' : v === 'month' ? 'Mois' : 'Année'}
            </Button>
          ))}
        </div>
      </div>

      {view === 'week' && <WeekView data={data} anchor={weekAnchor} setAnchor={setWeekAnchor} format={format} />}
      {view === 'month' && <MonthView data={data} monthKey={monthKey} setMonthKey={setMonthKey} format={format} />}
      {view === 'year' && <YearView data={data} year={year} setYear={setYear} format={format} />}
    </div>
  );
}

// ============================================================================
// VUE SEMAINE
// ============================================================================
function WeekView({ data, anchor, setAnchor, format }: any) {
  const { from, to } = weekRangeFor(anchor);
  const stats = useMemo(() => computeRangeStats(data, from, to), [data, from, to]);
  const score = useMemo(() => computeScore(data, from, to), [data, from, to]);
  const insights = useMemo(() => generateInsights(data, from, to), [data, from, to]);

  const chartData = stats.days.map((d) => ({
    day: new Date(d.date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'short' }),
    pct: d.pct,
  }));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setAnchor(addWeeksISO(anchor, -1))}>
          <ChevronLeft size={18} />
        </Button>
        <span className="text-sm font-medium">
          {from.split('-').reverse().slice(0, 2).join('/')} – {to.split('-').reverse().slice(0, 2).join('/')}
        </span>
        <Button variant="ghost" size="icon" onClick={() => setAnchor(addWeeksISO(anchor, 1))}>
          <ChevronRight size={18} />
        </Button>
      </div>

      <ScoreCard score={score} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard label="Tâches" value={`${stats.tasksDone}/${stats.tasksTotal}`} sub={`${stats.pctSuccess}% réussite`} />
        <MetricCard label="Temps travaillé" value={`${stats.hoursWorked}h`} sub={`prévu : ${stats.hoursPlanned}h`} />
        <MetricCard label="Habitudes" value={`${stats.habitsDone}/${stats.habitsTotal}`} sub={`${stats.habitsMissed} manquées`} />
        <MetricCard label="Revenus" value={format(stats.income)} sub="cette semaine" />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard label="Dépenses" value={format(stats.expense)} sub="cette semaine (transactions datées)" />
        <MetricCard label="Objectifs atteints" value={String(stats.objectivesCompleted)} />
        <MetricCard label="Challenges terminés" value={String(stats.challengesCompleted)} />
        <MetricCard label="Big Goals atteints" value={String(stats.bigGoalsCompleted)} />
      </div>

      <Card>
        <h2 className="mb-3 font-medium">Courbe de progression quotidienne</h2>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="day" stroke="var(--color-text-faint)" fontSize={12} />
            <YAxis stroke="var(--color-text-faint)" fontSize={12} domain={[0, 100]} />
            <Tooltip contentStyle={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 8 }} />
            <Line type="monotone" dataKey="pct" stroke="#8B5CF6" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <InsightsCard insights={insights} />
    </div>
  );
}

// ============================================================================
// VUE MOIS
// ============================================================================
function MonthView({ data, monthKey, setMonthKey, format }: any) {
  const { from, to } = monthRangeFor(monthKey);
  const stats = useMemo(() => computeRangeStats(data, from, to), [data, from, to]);
  const score = useMemo(() => computeScore(data, from, to), [data, from, to]);

  const prevMonthKey = useMemo(() => {
    const [y, m] = monthKey.split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, [monthKey]);
  const prevRange = monthRangeFor(prevMonthKey);
  const prevScore = useMemo(() => computeScore(data, prevRange.from, prevRange.to), [data, prevRange.from, prevRange.to]);
  const scoreDelta = score.global - prevScore.global;

  // Évolution par semaine du mois
  const weeklyBreakdown = useMemo(() => {
    const weeks: { label: string; pct: number }[] = [];
    let cursor = from;
    let weekNum = 1;
    while (cursor <= to) {
      const weekEnd = addDaysISO(cursor, 6) > to ? to : addDaysISO(cursor, 6);
      const s = computeRangeStats(data, cursor, weekEnd);
      weeks.push({ label: `S${weekNum}`, pct: s.pctSuccess });
      cursor = addDaysISO(weekEnd, 1);
      weekNum++;
    }
    return weeks;
  }, [data, from, to]);

  const month = monthKey;
  const budgetCategories = data.budgetCategories.filter((b: any) => b.month === month);
  const totalSpent = budgetCategories.reduce((s: number, b: any) => s + b.spent_amount, 0);
  const totalPlanned = budgetCategories.reduce((s: number, b: any) => s + b.planned_amount, 0);
  const income = data.incomeEntries.filter((i: any) => i.month === month).reduce((s: number, i: any) => s + i.amount, 0);
  const savingsTotal = data.savingsGoals.filter((s: any) => !s.is_archived).reduce((s: number, g: any) => s + g.current_amount, 0);

  const expensePie = budgetCategories.filter((b: any) => b.spent_amount > 0).map((b: any) => ({ name: b.name, value: b.spent_amount }));

  const dailyChart = stats.days.map((d) => ({ day: d.date.slice(8), pct: d.pct }));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setMonthKey(prevMonthKey)}>
          <ChevronLeft size={18} />
        </Button>
        <span className="text-sm font-medium">
          {new Date(monthKey + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            const [y, m] = monthKey.split('-').map(Number);
            const d = new Date(y, m, 1);
            setMonthKey(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
          }}
        >
          <ChevronRight size={18} />
        </Button>
      </div>

      <ScoreCard score={score} />

      <Card className="flex items-center gap-2">
        {scoreDelta >= 0 ? <TrendingUp size={16} className="text-[var(--color-success)]" /> : <TrendingDown size={16} className="text-[var(--color-danger)]" />}
        <p className="text-sm">
          {scoreDelta === 0
            ? 'Score stable par rapport au mois précédent.'
            : `Score ${scoreDelta > 0 ? 'en hausse' : 'en baisse'} de ${Math.abs(scoreDelta)} points par rapport au mois précédent (${prevScore.global}).`}
        </p>
      </Card>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard label="Tâches" value={`${stats.tasksDone}/${stats.tasksTotal}`} sub={`${stats.pctSuccess}% réussite`} />
        <MetricCard label="Temps travaillé" value={`${stats.hoursWorked}h`} />
        <MetricCard label="Habitudes" value={`${stats.habitsDone}/${stats.habitsTotal}`} />
        <MetricCard label="Défis / Objectifs" value={`${stats.challengesCompleted} / ${stats.objectivesCompleted}`} />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard label="Revenus" value={format(income)} />
        <MetricCard label="Dépenses" value={format(totalSpent)} sub={totalPlanned ? `prévu : ${format(totalPlanned)}` : undefined} />
        <MetricCard label="Épargne totale" value={format(savingsTotal)} />
        <MetricCard label="Solde" value={format(income - totalSpent)} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-medium">Évolution par semaine</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weeklyBreakdown}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="label" stroke="var(--color-text-faint)" fontSize={12} />
              <YAxis stroke="var(--color-text-faint)" fontSize={12} domain={[0, 100]} />
              <Tooltip contentStyle={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 8 }} />
              <Bar dataKey="pct" fill="#8B5CF6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h2 className="mb-3 font-medium">Répartition des dépenses</h2>
          {expensePie.length === 0 ? (
            <p className="py-10 text-center text-sm text-[var(--color-text-faint)]">Aucune dépense ce mois-ci.</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={expensePie} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={2}>
                  {expensePie.map((_: any, i: number) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 8 }} formatter={(v: any) => format(Number(v))} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card>
          <h2 className="mb-3 font-medium">Répartition des habitudes</h2>
          {stats.perHabitCompletion.length === 0 ? (
            <p className="py-10 text-center text-sm text-[var(--color-text-faint)]">Aucune habitude définie.</p>
          ) : (
            <div className="space-y-2">
              {stats.perHabitCompletion.map((h) => (
                <div key={h.title}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span>{h.title}</span>
                    <span className="text-[var(--color-text-muted)]">{h.pct}%</span>
                  </div>
                  <ProgressBar value={h.pct} color="var(--color-success)" />
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h2 className="mb-3 font-medium">Évolution journalière</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={dailyChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="day" stroke="var(--color-text-faint)" fontSize={11} />
              <YAxis stroke="var(--color-text-faint)" fontSize={12} domain={[0, 100]} />
              <Tooltip contentStyle={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 8 }} />
              <Line type="monotone" dataKey="pct" stroke="#34D399" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card className="flex items-start gap-2 text-xs text-[var(--color-text-muted)]">
        <Info size={14} className="mt-0.5 shrink-0" />
        <p>
          Investissements, lecture, sport et santé ne sont pas encore suivis dans GlowUp — ces indicateurs
          apparaîtront ici dès qu'un module dédié existera pour les enregistrer.
        </p>
      </Card>
    </div>
  );
}

// ============================================================================
// VUE ANNÉE
// ============================================================================
function YearView({ data, year, setYear, format }: any) {
  const months = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => {
        const key = `${year}-${String(i + 1).padStart(2, '0')}`;
        const { from, to } = monthRangeFor(key);
        const stats = computeRangeStats(data, from, to);
        const score = computeScore(data, from, to);
        const income = data.incomeEntries.filter((inc: any) => inc.month === key).reduce((s: number, inc: any) => s + inc.amount, 0);
        const spent = data.budgetCategories.filter((b: any) => b.month === key).reduce((s: number, b: any) => s + b.spent_amount, 0);
        return { key, label: new Date(key + '-01').toLocaleDateString('fr-FR', { month: 'short' }), stats, score, income, spent };
      }),
    [data, year]
  );

  const totalTasks = months.reduce((s, m) => s + m.stats.tasksDone, 0);
  const totalHabits = months.reduce((s, m) => s + m.stats.habitsDone, 0);
  const totalHours = Math.round(months.reduce((s, m) => s + m.stats.hoursWorked, 0) * 10) / 10;
  const totalObjectives = months.reduce((s, m) => s + m.stats.objectivesCompleted, 0);
  const totalChallenges = months.reduce((s, m) => s + m.stats.challengesCompleted, 0);
  const perfectDays = months.reduce((s, m) => s + m.stats.days.filter((d) => d.tasksTotal > 0 && d.pct === 100).length, 0);
  const productiveDays = months.reduce((s, m) => s + m.stats.days.filter((d) => d.pct >= 70).length, 0);
  const bestMonth = [...months].sort((a, b) => b.score.global - a.score.global)[0];
  const totalIncome = months.reduce((s, m) => s + m.income, 0);
  const totalSpent = months.reduce((s, m) => s + m.spent, 0);

  const scoreChart = months.map((m) => ({ label: m.label, score: m.score.global }));
  const financeChart = months.map((m) => ({ label: m.label, revenus: m.income, depenses: m.spent }));

  const savingsChart = months.map((m) => {
    const t = data.savingsMonthlyTargets.find((x: any) => x.month === m.key);
    return { label: m.label, epargne: t?.saved_amount ?? 0, objectif: t?.target_amount ?? 0 };
  });
  const accountsInitial = data.financeAccounts.filter((a: any) => !a.is_archived).reduce((s: number, a: any) => s + a.initial_amount, 0);
  let runningBalance = accountsInitial;
  const balanceChart = months.map((m) => {
    const monthDelta = data.transactions
      .filter((t: any) => t.date.slice(0, 7) === m.key)
      .reduce((s: number, t: any) => s + (t.type === 'income' ? t.amount : -t.amount), 0);
    runningBalance += monthDelta;
    return { label: m.label, solde: runningBalance };
  });
  const productivityChart = months.map((m) => ({ label: m.label, pct: m.stats.pctSuccess }));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setYear((y: number) => y - 1)}>
          <ChevronLeft size={18} />
        </Button>
        <span className="text-sm font-medium">{year}</span>
        <Button variant="ghost" size="icon" onClick={() => setYear((y: number) => y + 1)}>
          <ChevronRight size={18} />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard label="Tâches accomplies" value={String(totalTasks)} />
        <MetricCard label="Habitudes réalisées" value={String(totalHabits)} />
        <MetricCard label="Temps total travaillé" value={`${totalHours}h`} />
        <MetricCard label="Meilleur mois" value={bestMonth ? bestMonth.label : '—'} sub={bestMonth ? `score ${bestMonth.score.global}` : undefined} />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard label="Objectifs atteints" value={String(totalObjectives)} />
        <MetricCard label="Challenges terminés" value={String(totalChallenges)} />
        <MetricCard label="Jours parfaits" value={String(perfectDays)} sub="100% des tâches" />
        <MetricCard label="Jours productifs" value={String(productiveDays)} sub="≥ 70% des tâches" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <MetricCard label="Revenus de l'année" value={format(totalIncome)} />
        <MetricCard label="Dépenses de l'année" value={format(totalSpent)} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-medium">Score GlowUp par mois</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={scoreChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="label" stroke="var(--color-text-faint)" fontSize={12} />
              <YAxis stroke="var(--color-text-faint)" fontSize={12} domain={[0, 100]} />
              <Tooltip contentStyle={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 8 }} />
              <Line type="monotone" dataKey="score" stroke="#8B5CF6" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h2 className="mb-3 font-medium">Productivité par mois</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={productivityChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="label" stroke="var(--color-text-faint)" fontSize={12} />
              <YAxis stroke="var(--color-text-faint)" fontSize={12} domain={[0, 100]} />
              <Tooltip contentStyle={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 8 }} />
              <Bar dataKey="pct" fill="#34D399" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="md:col-span-2">
          <h2 className="mb-3 font-medium">Évolution financière</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={financeChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="label" stroke="var(--color-text-faint)" fontSize={12} />
              <YAxis stroke="var(--color-text-faint)" fontSize={12} />
              <Tooltip contentStyle={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 8 }} formatter={(v: any) => format(Number(v))} />
              <Line type="monotone" dataKey="revenus" stroke="#34D399" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="depenses" stroke="#F87171" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="md:col-span-2">
          <h2 className="mb-3 font-medium">Évolution du solde réel</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={balanceChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="label" stroke="var(--color-text-faint)" fontSize={12} />
              <YAxis stroke="var(--color-text-faint)" fontSize={12} />
              <Tooltip contentStyle={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 8 }} formatter={(v: any) => format(Number(v))} />
              <Line type="monotone" dataKey="solde" stroke="#8B5CF6" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="md:col-span-2">
          <h2 className="mb-3 font-medium">Évolution de l'épargne</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={savingsChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="label" stroke="var(--color-text-faint)" fontSize={12} />
              <YAxis stroke="var(--color-text-faint)" fontSize={12} />
              <Tooltip contentStyle={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 8 }} formatter={(v: any) => format(Number(v))} />
              <Bar dataKey="objectif" fill="var(--color-border)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="epargne" fill="#34D399" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}

// ============================================================================
// COMPOSANTS PARTAGÉS
// ============================================================================
function ScoreCard({ score }: { score: ReturnType<typeof computeScore> }) {
  const categories: { key: keyof typeof score; label: string }[] = [
    { key: 'productivity', label: 'Productivité' },
    { key: 'habits', label: 'Habitudes' },
    { key: 'finances', label: 'Finances' },
    { key: 'objectives', label: 'Objectifs' },
    { key: 'challenges', label: 'Défis' },
  ];

  return (
    <Card className="border-[var(--color-violet)]/30 bg-gradient-to-br from-[var(--color-violet)]/10 to-transparent">
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col items-center">
          <p className="font-display text-5xl font-bold text-[var(--color-violet-soft)]">{score.global}</p>
          <p className="text-xs text-[var(--color-text-muted)]">Score GlowUp</p>
        </div>
        <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-5 sm:pl-6">
          {categories.map((c) => (
            <div key={String(c.key)}>
              <div className="mb-1 flex justify-between text-xs">
                <span className="text-[var(--color-text-muted)]">{c.label}</span>
                <span>{score[c.key]}</span>
              </div>
              <ProgressBar value={score[c.key]} height={5} />
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function MetricCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card className="p-4">
      <p className="mb-1 text-xs text-[var(--color-text-muted)]">{label}</p>
      <p className="font-display text-lg font-semibold">{value}</p>
      {sub && <p className="text-xs text-[var(--color-text-faint)]">{sub}</p>}
    </Card>
  );
}

function InsightsCard({ insights }: { insights: { type: string; text: string }[] }) {
  return (
    <Card>
      <h2 className="mb-3 font-medium">Analyses & recommandations</h2>
      <ul className="space-y-2">
        {insights.map((i, idx) => (
          <li
            key={idx}
            className="flex items-start gap-2 rounded-lg px-3 py-2 text-sm"
            style={{
              background:
                i.type === 'positive' ? 'color-mix(in srgb, var(--color-success) 10%, transparent)' : i.type === 'warning' ? 'color-mix(in srgb, var(--color-warning) 10%, transparent)' : 'var(--color-bg-elevated)',
            }}
          >
            <span>{i.type === 'positive' ? '✅' : i.type === 'warning' ? '⚠️' : '💡'}</span>
            <span>{i.text}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-[var(--color-text-faint)]">
        Analyses calculées automatiquement à partir de tes données réelles (pas d'IA externe).
      </p>
    </Card>
  );
}
