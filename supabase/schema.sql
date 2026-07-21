-- ============================================================================
-- GlowUp — Supabase schema
-- Colle ce fichier dans Supabase Studio > SQL Editor > Run
-- Chaque table est protégée par Row Level Security : un utilisateur ne voit
-- et ne modifie jamais que ses propres données (auth.uid() = user_id).
-- ============================================================================

-- Extension pour les UUID
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- Fonction utilitaire : met à jour updated_at automatiquement
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ----------------------------------------------------------------------------
-- Profiles (1 ligne par utilisateur, créée automatiquement à l'inscription)
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  theme text not null default 'dark' check (theme in ('dark','light')),
  currency text not null default 'MGA' check (currency in ('MGA','EUR','USD')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles for select using (auth.uid() = user_id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = user_id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = user_id);

create trigger set_profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

-- Création automatique du profil à l'inscription
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, user_id, full_name)
  values (new.id, new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- Macro : génère table + RLS + trigger pour chaque module de l'app
-- (Postgres n'a pas de vraies macros SQL, donc chaque table est déclarée
-- explicitement ci-dessous, mais toutes suivent exactement le même patron.)
-- ----------------------------------------------------------------------------

create table if not exists public.planning_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  notes text,
  period text not null check (period in ('matin','apres_midi','soir','nuit')),
  start_time text not null,
  end_time text not null,
  color text not null default '#8B5CF6',
  is_done boolean not null default false,
  is_hidden_by_default boolean not null default false,
  is_daily boolean not null default false,
  order_index integer not null default 0,
  date date not null default current_date,
  micro_tasks jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  category text not null default 'Général',
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  is_done boolean not null default false,
  is_archived boolean not null default false,
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.memos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  content text not null default '',
  is_archived boolean not null default false,
  color text not null default '#8B5CF6',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.monthly_objectives (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  category text not null default 'Général',
  progress integer not null default 0 check (progress between 0 and 100),
  deadline date not null,
  is_validated boolean not null default false,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.big_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  target_date date,
  progress integer not null default 0 check (progress between 0 and 100),
  is_validated boolean not null default false,
  is_archived boolean not null default false,
  sub_tasks jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  type text not null check (type in ('numeric','boolean')),
  target_value numeric not null default 1,
  current_value numeric not null default 0,
  unit text,
  is_archived boolean not null default false,
  sub_tasks jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  text text not null,
  author text,
  is_favorite boolean not null default false,
  is_archived boolean not null default false,
  is_generated boolean not null default false,
  date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.budget_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  planned_amount numeric not null default 0,
  spent_amount numeric not null default 0,
  month text not null,
  color text not null default '#8B5CF6',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.income_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  amount numeric not null default 0,
  type text not null check (type in ('salary','extra')),
  month text not null,
  received_at date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.purchase_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text not null default 'Général',
  price numeric,
  is_bought boolean not null default false,
  is_archived boolean not null default false,
  paid_price numeric,
  paid_at date,
  payment_method text check (payment_method in ('cash','card','mobile_money','transfer','other')),
  purchase_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  target_amount numeric not null default 0,
  current_amount numeric not null default 0,
  deadline date,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.tracking_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  tasks_completed integer not null default 0,
  tasks_total integer not null default 0,
  mood integer check (mood between 1 and 5),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id, date)
);

create table if not exists public.history_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  module text not null,
  action text not null,
  label text not null,
  detail text,
  occurred_at timestamptz not null default now(),
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.habit_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null,
  date date not null,
  is_done boolean not null default true,
  daily_label text,
  override_start_time text,
  override_end_time text,
  override_color text,
  override_notes text,
  is_hidden_for_day boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id, task_id, date)
);

create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  mood integer check (mood between 1 and 5),
  content text not null default '',
  gratitude text,
  bad_moment_cause text,
  bad_moment_solution text,
  motivation text,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.verses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  text text not null,
  reference text,
  translation_fr text,
  is_generated boolean not null default false,
  is_favorite boolean not null default false,
  is_archived boolean not null default false,
  date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  person text not null,
  reason text,
  amount numeric not null default 0,
  paid_amount numeric not null default 0,
  loan_date date not null default current_date,
  due_date date,
  is_settled boolean not null default false,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.fixed_flows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  amount numeric not null default 0,
  flow_type text not null check (flow_type in ('income','expense')),
  day_of_month integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.quality_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('good_have','bad_have','good_want','good_lost')),
  text text not null,
  cause text,
  consequences text,
  solutions text,
  improvement_plan text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.action_microtasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  parent_title text not null,
  title text not null,
  frequency_count integer not null default 1,
  frequency_unit text not null default 'per_week' check (frequency_unit in ('per_week','per_month')),
  is_archived boolean not null default false,
  obstacles text,
  motivation text,
  trigger text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.action_microtask_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  micro_task_id uuid not null references public.action_microtasks(id) on delete cascade,
  date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.finance_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('cash','bank','mobile_money','other')),
  initial_amount numeric not null default 0,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('income','expense')),
  amount numeric not null default 0,
  date date not null default current_date,
  time text not null default '12:00',
  category text not null default 'Général',
  note text,
  payment_method text not null default 'cash' check (payment_method in ('cash','card','mobile_money','transfer','other')),
  account_id uuid references public.finance_accounts(id) on delete set null,
  origin text,
  linked_purchase_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.savings_monthly_targets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month text not null,
  target_amount numeric not null default 0,
  saved_amount numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id, month)
);

-- ----------------------------------------------------------------------------
-- RLS + triggers appliqués à toutes les tables ci-dessus
-- ----------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'planning_tasks','todos','memos','monthly_objectives','big_goals',
    'challenges','quotes','budget_categories','income_entries',
    'purchase_items','savings_goals','tracking_days',
    'history_events','habit_completions','journal_entries','verses',
    'debts','fixed_flows','quality_notes','action_microtasks','action_microtask_logs',
    'finance_accounts','transactions','savings_monthly_targets'
  ]
  loop
    execute format('alter table public.%I enable row level security;', t);

    execute format(
      'create policy "%1$s_select_own" on public.%1$s for select using (auth.uid() = user_id);', t
    );
    execute format(
      'create policy "%1$s_insert_own" on public.%1$s for insert with check (auth.uid() = user_id);', t
    );
    execute format(
      'create policy "%1$s_update_own" on public.%1$s for update using (auth.uid() = user_id);', t
    );
    execute format(
      'create policy "%1$s_delete_own" on public.%1$s for delete using (auth.uid() = user_id);', t
    );

    execute format(
      'create trigger set_%1$s_updated_at before update on public.%1$s for each row execute function public.set_updated_at();', t
    );

    execute format('create index on public.%I (user_id);', t);
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- Realtime : permet à l'app de recevoir les changements en direct (multi-appareil)
-- ----------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'planning_tasks','todos','memos','monthly_objectives','big_goals',
    'challenges','quotes','budget_categories','income_entries',
    'purchase_items','savings_goals','tracking_days',
    'history_events','habit_completions','journal_entries','verses',
    'debts','fixed_flows','quality_notes','action_microtasks','action_microtask_logs',
    'finance_accounts','transactions','savings_monthly_targets'
  ]
  loop
    execute format('alter publication supabase_realtime add table public.%I;', t);
  end loop;
exception when others then
  -- La publication supabase_realtime existe par défaut sur les nouveaux projets ;
  -- si elle contient déjà la table ou n'existe pas encore, on ignore l'erreur.
  null;
end $$;
