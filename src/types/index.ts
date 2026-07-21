// ============================================================================
// GlowUp — Core data types
// Every type mirrors a Supabase table (see supabase/schema.sql).
// All records carry the sync fields below so the app can work offline
// and reconcile with Supabase once connectivity returns.
// ============================================================================

export type SyncStatus = 'synced' | 'pending' | 'conflict';

export interface SyncMeta {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  sync_status?: SyncStatus;
}

export type Period = 'matin' | 'apres_midi' | 'soir' | 'nuit';

export interface PlanningTask extends SyncMeta {
  title: string;
  notes: string | null;
  period: Period;
  start_time: string; // "HH:mm"
  end_time: string; // "HH:mm"
  color: string;
  is_done: boolean;
  is_hidden_by_default: boolean;
  is_daily: boolean;
  order_index: number;
  date: string; // ISO date the task belongs to
  micro_tasks: MicroTaskEntry[] | null; // check-list du jour pour une tâche quotidienne
}

export interface MicroTaskEntry {
  id: string;
  text: string;
  done: boolean;
}

export type Priority = 'low' | 'medium' | 'high';

export interface TodoItem extends SyncMeta {
  title: string;
  description: string | null;
  category: string;
  priority: Priority;
  is_done: boolean;
  is_archived: boolean;
  due_date: string | null;
}

export interface MemoItem extends SyncMeta {
  title: string;
  content: string;
  is_archived: boolean;
  color: string;
}

export interface MonthlyObjective extends SyncMeta {
  title: string;
  category: string;
  progress: number; // 0-100
  deadline: string;
  is_validated: boolean;
  is_archived: boolean;
}

export interface BigGoal extends SyncMeta {
  title: string;
  description: string | null;
  target_date: string | null;
  progress: number;
  is_validated: boolean;
  is_archived: boolean;
  sub_tasks: MicroTaskEntry[];
}

export type ChallengeType = 'numeric' | 'boolean';

export interface Challenge extends SyncMeta {
  title: string;
  type: ChallengeType;
  target_value: number; // for numeric: target number, for boolean: 1
  current_value: number;
  unit: string | null;
  is_archived: boolean;
  sub_tasks: MicroTaskEntry[];
}

export interface Quote extends SyncMeta {
  text: string;
  author: string | null;
  is_favorite: boolean;
  is_archived: boolean;
  is_generated: boolean;
  date: string;
}

export interface BudgetCategory extends SyncMeta {
  name: string;
  planned_amount: number;
  spent_amount: number;
  month: string; // "YYYY-MM"
  color: string;
}

export type IncomeType = 'salary' | 'extra';

export interface IncomeEntry extends SyncMeta {
  label: string;
  amount: number;
  type: IncomeType;
  month: string; // "YYYY-MM"
  received_at: string;
}

export interface PurchaseItem extends SyncMeta {
  name: string;
  category: string;
  price: number | null;
  is_bought: boolean;
  is_archived: boolean;
  paid_price: number | null;
  paid_at: string | null; // date réelle d'achat
  payment_method: PaymentMethod | null;
  purchase_note: string | null;
}

export interface SavingsGoal extends SyncMeta {
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  is_archived: boolean;
}

export interface TrackingDay extends SyncMeta {
  date: string;
  tasks_completed: number;
  tasks_total: number;
  mood: number | null; // 1-5
  note: string | null;
}

// ----------------------------------------------------------------------------
// Gestionnaire financier — comptes réels et journal de transactions datées
// ----------------------------------------------------------------------------
export type AccountType = 'cash' | 'bank' | 'mobile_money' | 'other';

export interface FinanceAccount extends SyncMeta {
  name: string;
  type: AccountType;
  initial_amount: number;
  is_archived: boolean;
}

export type TransactionType = 'income' | 'expense';
export type PaymentMethod = 'cash' | 'card' | 'mobile_money' | 'transfer' | 'other';

export interface Transaction extends SyncMeta {
  type: TransactionType;
  amount: number;
  date: string; // "YYYY-MM-DD"
  time: string; // "HH:mm"
  category: string;
  note: string | null;
  payment_method: PaymentMethod;
  account_id: string | null; // référence FinanceAccount.id
  origin: string | null; // ex: "Achat", "Salaire", "Prime"
  linked_purchase_id: string | null; // référence PurchaseItem.id si créée depuis un achat
}

export interface SavingsMonthlyTarget extends SyncMeta {
  month: string; // "YYYY-MM"
  target_amount: number;
  saved_amount: number;
}

export type Currency = 'MGA' | 'EUR' | 'USD';
export type ThemeMode = 'dark' | 'light';

export interface Profile extends SyncMeta {
  full_name: string | null;
  avatar_url: string | null;
  theme: ThemeMode;
  currency: Currency;
}

// ----------------------------------------------------------------------------
// Historique global — une ligne par action importante dans l'app
// ----------------------------------------------------------------------------
export type HistoryModule =
  | 'planning'
  | 'todo'
  | 'habits'
  | 'checklist'
  | 'objectifs'
  | 'big_goals'
  | 'challenges'
  | 'budget'
  | 'dettes'
  | 'achats'
  | 'epargne'
  | 'notes'
  | 'journal'
  | 'versets'
  | 'citations'
  | 'archive';

export interface HistoryEvent extends SyncMeta {
  module: HistoryModule;
  action: string; // ex: "Tâche accomplie", "Nouvelle dépense"
  label: string; // description courte de l'élément concerné
  detail: string | null;
  occurred_at: string; // ISO — la date "métier" de l'événement (peut différer de created_at)
  is_archived: boolean;
}

// ----------------------------------------------------------------------------
// Habitudes — tâches quotidiennes cochées jour par jour (indépendant des
// tâches ponctuelles de Planning, jamais rétroactif : chaque date a sa propre
// ligne de complétion).
// ----------------------------------------------------------------------------
export interface HabitCompletion extends SyncMeta {
  task_id: string; // référence PlanningTask.id (is_daily = true)
  date: string; // "YYYY-MM-DD"
  is_done: boolean;
  daily_label: string | null; // personnalisation du titre du jour
  override_start_time: string | null;
  override_end_time: string | null;
  override_color: string | null;
  override_notes: string | null;
  is_hidden_for_day: boolean; // "supprimer" la tâche uniquement pour ce jour
}

// ----------------------------------------------------------------------------
// Journal — humeur, gratitude, motivation du jour
// ----------------------------------------------------------------------------
export interface JournalEntry extends SyncMeta {
  date: string;
  mood: number | null; // 1-5
  content: string;
  gratitude: string | null;
  bad_moment_cause: string | null;
  bad_moment_solution: string | null;
  motivation: string | null;
  is_archived: boolean;
}

// ----------------------------------------------------------------------------
// Versets bibliques
// ----------------------------------------------------------------------------
export interface Verse extends SyncMeta {
  text: string;
  reference: string | null;
  translation_fr: string | null;
  is_generated: boolean;
  is_favorite: boolean;
  is_archived: boolean;
  date: string;
}

// ----------------------------------------------------------------------------
// Budget étendu — dettes, revenus/dépenses fixes
// ----------------------------------------------------------------------------
export interface Debt extends SyncMeta {
  person: string;
  reason: string | null;
  amount: number;
  paid_amount: number;
  loan_date: string;
  due_date: string | null;
  is_settled: boolean;
  is_archived: boolean;
}

export type FixedFlowType = 'income' | 'expense';

export interface FixedFlow extends SyncMeta {
  label: string;
  amount: number;
  flow_type: FixedFlowType;
  day_of_month: number | null;
}

// ----------------------------------------------------------------------------
// Qualités — bonnes/mauvaises qualités actuelles et à acquérir/perdues
// ----------------------------------------------------------------------------
export type QualityKind = 'good_have' | 'bad_have' | 'good_want' | 'good_lost';

export interface QualityNote extends SyncMeta {
  kind: QualityKind;
  text: string;
  cause: string | null;
  consequences: string | null;
  solutions: string | null;
  improvement_plan: string | null;
}

// ----------------------------------------------------------------------------
// Plan d'action — micro-tâches avec fréquence, pour suggestions automatiques
// ----------------------------------------------------------------------------
export type FrequencyUnit = 'per_week' | 'per_month';

export interface ActionMicroTask extends SyncMeta {
  parent_title: string; // ex: "Organisation Maison"
  title: string; // ex: "Rangement casier"
  frequency_count: number; // ex: 3
  frequency_unit: FrequencyUnit;
  is_archived: boolean;
  obstacles: string | null; // empêchements
  motivation: string | null;
  trigger: string | null; // élément déclencheur
}

export interface ActionMicroTaskLog extends SyncMeta {
  micro_task_id: string;
  date: string;
}

// Aggregated shape used across the app's context
export interface GlowUpData {
  planningTasks: PlanningTask[];
  todos: TodoItem[];
  memos: MemoItem[];
  monthlyObjectives: MonthlyObjective[];
  bigGoals: BigGoal[];
  challenges: Challenge[];
  quotes: Quote[];
  budgetCategories: BudgetCategory[];
  incomeEntries: IncomeEntry[];
  purchaseItems: PurchaseItem[];
  savingsGoals: SavingsGoal[];
  trackingDays: TrackingDay[];
  historyEvents: HistoryEvent[];
  habitCompletions: HabitCompletion[];
  journalEntries: JournalEntry[];
  verses: Verse[];
  debts: Debt[];
  fixedFlows: FixedFlow[];
  qualityNotes: QualityNote[];
  actionMicroTasks: ActionMicroTask[];
  actionMicroTaskLogs: ActionMicroTaskLog[];
  financeAccounts: FinanceAccount[];
  transactions: Transaction[];
  savingsMonthlyTargets: SavingsMonthlyTarget[];
}

export const emptyGlowUpData: GlowUpData = {
  planningTasks: [],
  todos: [],
  memos: [],
  monthlyObjectives: [],
  bigGoals: [],
  challenges: [],
  quotes: [],
  budgetCategories: [],
  incomeEntries: [],
  purchaseItems: [],
  savingsGoals: [],
  trackingDays: [],
  historyEvents: [],
  habitCompletions: [],
  journalEntries: [],
  verses: [],
  debts: [],
  fixedFlows: [],
  qualityNotes: [],
  actionMicroTasks: [],
  actionMicroTaskLogs: [],
  financeAccounts: [],
  transactions: [],
  savingsMonthlyTargets: [],
};

// Table name map — single source of truth used by the generic sync engine
export const TABLE_NAMES = {
  planningTasks: 'planning_tasks',
  todos: 'todos',
  memos: 'memos',
  monthlyObjectives: 'monthly_objectives',
  bigGoals: 'big_goals',
  challenges: 'challenges',
  quotes: 'quotes',
  budgetCategories: 'budget_categories',
  incomeEntries: 'income_entries',
  purchaseItems: 'purchase_items',
  savingsGoals: 'savings_goals',
  trackingDays: 'tracking_days',
  historyEvents: 'history_events',
  habitCompletions: 'habit_completions',
  journalEntries: 'journal_entries',
  verses: 'verses',
  debts: 'debts',
  fixedFlows: 'fixed_flows',
  qualityNotes: 'quality_notes',
  actionMicroTasks: 'action_microtasks',
  actionMicroTaskLogs: 'action_microtask_logs',
  financeAccounts: 'finance_accounts',
  transactions: 'transactions',
  savingsMonthlyTargets: 'savings_monthly_targets',
} as const;

export type DataKey = keyof GlowUpData;
