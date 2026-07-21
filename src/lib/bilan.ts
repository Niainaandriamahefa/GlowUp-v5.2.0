import type { GlowUpData, PlanningTask } from '@/types';
import { addDaysISO, startOfWeekISO, clampPercent } from '@/lib/utils';

// ============================================================================
// Moteur d'analyse GlowUp — calcule des statistiques réelles à partir des
// données déjà présentes dans l'app. Aucune valeur n'est inventée : si une
// métrique demandée n'est pas mesurable avec le modèle de données actuel
// (ex : dépenses datées jour par jour, sport, lecture, santé — non suivis
// pour l'instant), elle est simplement omise plutôt que simulée.
// ============================================================================

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

/** Durée réelle d'une tâche de planning en heures (basée sur ses horaires). */
function taskDurationHours(task: PlanningTask): number {
  const start = timeToMinutes(task.start_time);
  let end = timeToMinutes(task.end_time);
  if (end < start) end += 24 * 60; // tâche à cheval sur minuit
  return (end - start) / 60;
}

export interface DayStats {
  date: string;
  tasksDone: number;
  tasksTotal: number;
  pct: number;
  hoursWorked: number;
}

/** Statistiques réelles d'une journée donnée (tâches ponctuelles + habitudes). */
export function computeDayStats(data: GlowUpData, date: string): DayStats {
  const dailyTasks = data.planningTasks.filter((t) => t.is_daily);
  const punctualTasks = data.planningTasks.filter((t) => t.date === date && !t.is_daily);

  const dailyDone = dailyTasks.filter((t) => data.habitCompletions.some((c) => c.task_id === t.id && c.date === date && c.is_done));
  const punctualDone = punctualTasks.filter((t) => t.is_done);

  const tasksTotal = dailyTasks.length + punctualTasks.length;
  const tasksDone = dailyDone.length + punctualDone.length;

  const hoursWorked = [...dailyDone, ...punctualDone].reduce((sum, t) => sum + taskDurationHours(t), 0);

  return {
    date,
    tasksDone,
    tasksTotal,
    pct: tasksTotal > 0 ? clampPercent((tasksDone / tasksTotal) * 100) : 0,
    hoursWorked: Math.round(hoursWorked * 10) / 10,
  };
}

export interface RangeStats {
  from: string;
  to: string;
  days: DayStats[];
  tasksDone: number;
  tasksTotal: number;
  pctSuccess: number;
  hoursWorked: number;
  hoursPlanned: number;
  habitsDone: number;
  habitsTotal: number;
  habitsMissed: number;
  income: number;
  expense: number;
  objectivesCompleted: number;
  bigGoalsCompleted: number;
  challengesCompleted: number;
  perHabitCompletion: { title: string; done: number; total: number; pct: number }[];
}

function eachDate(from: string, to: string): string[] {
  const out: string[] = [];
  let cursor = from;
  let guard = 0;
  while (cursor <= to && guard < 400) {
    out.push(cursor);
    cursor = addDaysISO(cursor, 1);
    guard++;
  }
  return out;
}

/** Statistiques réelles agrégées sur une période [from, to] inclusive (ISO). */
export function computeRangeStats(data: GlowUpData, from: string, to: string): RangeStats {
  const dates = eachDate(from, to);
  const days = dates.map((d) => computeDayStats(data, d));

  const tasksDone = days.reduce((s, d) => s + d.tasksDone, 0);
  const tasksTotal = days.reduce((s, d) => s + d.tasksTotal, 0);
  const hoursWorked = days.reduce((s, d) => s + d.hoursWorked, 0);

  const dailyTasks = data.planningTasks.filter((t) => t.is_daily);
  const hoursPlanned = dailyTasks.reduce((s, t) => s + taskDurationHours(t), 0) * dates.length;

  const habitsTotal = dailyTasks.length * dates.length;
  const habitsDone = dates.reduce(
    (sum, d) => sum + dailyTasks.filter((t) => data.habitCompletions.some((c) => c.task_id === t.id && c.date === d && c.is_done)).length,
    0
  );

  const perHabitCompletion = dailyTasks.map((t) => {
    const done = dates.filter((d) => data.habitCompletions.some((c) => c.task_id === t.id && c.date === d && c.is_done)).length;
    return { title: t.title, done, total: dates.length, pct: dates.length ? clampPercent((done / dates.length) * 100) : 0 };
  });

  const income =
    data.incomeEntries.filter((i) => i.received_at >= from && i.received_at <= to).reduce((s, i) => s + i.amount, 0) +
    data.transactions.filter((t) => t.type === 'income' && t.date >= from && t.date <= to).reduce((s, t) => s + t.amount, 0);
  const expense = data.transactions.filter((t) => t.type === 'expense' && t.date >= from && t.date <= to).reduce((s, t) => s + t.amount, 0);

  const objectivesCompleted = data.monthlyObjectives.filter(
    (o) => o.is_validated && o.updated_at.slice(0, 10) >= from && o.updated_at.slice(0, 10) <= to
  ).length;
  const bigGoalsCompleted = data.bigGoals.filter(
    (g) => g.is_validated && g.updated_at.slice(0, 10) >= from && g.updated_at.slice(0, 10) <= to
  ).length;
  const challengesCompleted = data.challenges.filter(
    (c) => c.current_value >= c.target_value && c.updated_at.slice(0, 10) >= from && c.updated_at.slice(0, 10) <= to
  ).length;

  return {
    from,
    to,
    days,
    tasksDone,
    tasksTotal,
    pctSuccess: tasksTotal > 0 ? clampPercent((tasksDone / tasksTotal) * 100) : 0,
    hoursWorked: Math.round(hoursWorked * 10) / 10,
    hoursPlanned: Math.round(hoursPlanned * 10) / 10,
    habitsDone,
    habitsTotal,
    habitsMissed: habitsTotal - habitsDone,
    income,
    expense,
    objectivesCompleted,
    bigGoalsCompleted,
    challengesCompleted,
    perHabitCompletion,
  };
}

export interface GlowUpScore {
  productivity: number;
  habits: number;
  finances: number;
  objectives: number;
  challenges: number;
  global: number;
}

/** Score GlowUp — moyenne pondérée de catégories calculées à partir de données réelles. */
export function computeScore(data: GlowUpData, from: string, to: string): GlowUpScore {
  const range = computeRangeStats(data, from, to);

  const productivity = range.tasksTotal > 0 ? range.pctSuccess : 0;
  const habits = range.habitsTotal > 0 ? clampPercent((range.habitsDone / range.habitsTotal) * 100) : 0;

  const month = from.slice(0, 7);
  const monthCategories = data.budgetCategories.filter((b) => b.month === month);
  const planned = monthCategories.reduce((s, b) => s + b.planned_amount, 0);
  const txExpense = data.transactions.filter((t) => t.type === 'expense' && t.date.slice(0, 7) === month).reduce((s, t) => s + t.amount, 0);
  const spent = monthCategories.reduce((s, b) => s + b.spent_amount, 0) + txExpense;
  const financeAdherence = planned > 0 ? clampPercent(100 - Math.max(0, ((spent - planned) / planned) * 100)) : spent > 0 ? 50 : 100;
  const savingsGoals = data.savingsGoals.filter((s) => !s.is_archived);
  const savingsProgress = savingsGoals.length
    ? clampPercent((savingsGoals.reduce((s, g) => s + (g.target_amount > 0 ? g.current_amount / g.target_amount : 0), 0) / savingsGoals.length) * 100)
    : financeAdherence;
  const finances = savingsGoals.length ? Math.round((financeAdherence + savingsProgress) / 2) : financeAdherence;

  const activeObjectives = data.monthlyObjectives.filter((o) => !o.is_archived);
  const objectives = activeObjectives.length
    ? Math.round(activeObjectives.reduce((s, o) => s + (o.is_validated ? 100 : o.progress), 0) / activeObjectives.length)
    : 100;

  const activeChallenges = data.challenges.filter((c) => !c.is_archived);
  const challenges = activeChallenges.length
    ? Math.round(activeChallenges.reduce((s, c) => s + clampPercent((c.current_value / c.target_value) * 100), 0) / activeChallenges.length)
    : 100;

  const parts = [productivity, habits, finances, objectives, challenges];
  const global = Math.round(parts.reduce((s, p) => s + p, 0) / parts.length);

  return { productivity, habits, finances, objectives, challenges, global };
}

export interface Insight {
  type: 'positive' | 'warning' | 'neutral';
  text: string;
}

/** Analyses et recommandations — 100% déduites des données réelles (pas d'appel IA externe). */
export function generateInsights(data: GlowUpData, weekFrom: string, weekTo: string): Insight[] {
  const insights: Insight[] = [];

  const thisWeek = computeRangeStats(data, weekFrom, weekTo);
  const prevFrom = addDaysISO(weekFrom, -7);
  const prevTo = addDaysISO(weekTo, -7);
  const lastWeek = computeRangeStats(data, prevFrom, prevTo);

  if (thisWeek.tasksTotal > 0 && lastWeek.tasksTotal > 0) {
    if (thisWeek.pctSuccess > lastWeek.pctSuccess) {
      insights.push({ type: 'positive', text: `Tu es plus productif cette semaine que la précédente (${thisWeek.pctSuccess}% contre ${lastWeek.pctSuccess}%).` });
    } else if (thisWeek.pctSuccess < lastWeek.pctSuccess) {
      insights.push({ type: 'warning', text: `Ta productivité a baissé par rapport à la semaine dernière (${thisWeek.pctSuccess}% contre ${lastWeek.pctSuccess}%).` });
    }
  }

  // Meilleur jour / jour le moins productif de la semaine
  const validDays = thisWeek.days.filter((d) => d.tasksTotal > 0);
  if (validDays.length >= 2) {
    const best = [...validDays].sort((a, b) => b.pct - a.pct)[0];
    const worst = [...validDays].sort((a, b) => a.pct - b.pct)[0];
    if (best.pct !== worst.pct) {
      const fmt = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long' });
      insights.push({ type: 'neutral', text: `Ton meilleur jour cette semaine : ${fmt(best.date)} (${best.pct}%). Le moins productif : ${fmt(worst.date)} (${worst.pct}%).` });
    }
  }

  // Habitudes en baisse (comparaison sur 3 semaines)
  const dailyTasks = data.planningTasks.filter((t) => t.is_daily);
  dailyTasks.forEach((t) => {
    const w1From = weekFrom, w1To = weekTo;
    const w2From = addDaysISO(weekFrom, -7), w2To = addDaysISO(weekTo, -7);
    const w3From = addDaysISO(weekFrom, -14), w3To = addDaysISO(weekTo, -14);
    const pctFor = (from: string, to: string) => {
      const dates = eachDate(from, to);
      const done = dates.filter((d) => data.habitCompletions.some((c) => c.task_id === t.id && c.date === d && c.is_done)).length;
      return dates.length ? done / dates.length : 0;
    };
    const p1 = pctFor(w1From, w1To);
    const p2 = pctFor(w2From, w2To);
    const p3 = pctFor(w3From, w3To);
    if (p1 < p2 && p2 < p3 && p3 > 0) {
      insights.push({ type: 'warning', text: `Ton habitude « ${t.title} » diminue depuis trois semaines.` });
    }
  });

  // Budget — catégorie où l'utilisateur dépense le plus (par rapport à son budget prévu)
  const month = weekTo.slice(0, 7);
  const monthCategories = data.budgetCategories.filter((b) => b.month === month && b.planned_amount > 0);
  const overspent = monthCategories.filter((b) => b.spent_amount > b.planned_amount).sort((a, b) => b.spent_amount - b.planned_amount - (a.spent_amount - a.planned_amount));
  if (overspent.length > 0) {
    insights.push({ type: 'warning', text: `Tu dépasses ton budget dans la catégorie « ${overspent[0].name} ».` });
  }

  // Épargne proche de l'objectif
  data.savingsGoals.filter((s) => !s.is_archived).forEach((s) => {
    const pct = s.target_amount > 0 ? (s.current_amount / s.target_amount) * 100 : 0;
    if (pct >= 90 && pct < 100) {
      insights.push({ type: 'positive', text: `Tu as atteint ${Math.round(pct)}% de ton objectif d'épargne « ${s.name} ».` });
    }
  });

  if (insights.length === 0) {
    insights.push({ type: 'neutral', text: "Pas encore assez de données cette semaine pour une analyse — continue à utiliser l'app pour affiner tes statistiques." });
  }

  return insights;
}

export function weekRangeFor(anchorISO: string): { from: string; to: string } {
  const from = startOfWeekISO(anchorISO);
  const to = addDaysISO(from, 6);
  return { from, to };
}

export function monthRangeFor(monthKey: string): { from: string; to: string } {
  const [y, m] = monthKey.split('-').map(Number);
  const from = `${monthKey}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const to = `${monthKey}-${String(lastDay).padStart(2, '0')}`;
  return { from, to };
}
