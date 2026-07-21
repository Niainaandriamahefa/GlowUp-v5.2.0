import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  emptyGlowUpData,
  type DataKey,
  type GlowUpData,
  type SyncMeta,
} from '@/types';
import {
  loadLocalData,
  saveLocalData,
  pushRecord,
  pushDelete,
  pullAllData,
  mergeByRecency,
  subscribeRealtime,
  flushQueue,
} from '@/services/syncEngine';
import { uid, nowIso, todayISO } from '@/lib/utils';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { Profile } from '@/types';
import { verseForDate } from '@/lib/verseBank';
import { quoteForDate } from '@/lib/quoteBank';

interface GlowUpContextValue {
  data: GlowUpData;
  isSyncing: boolean;
  isOnline: boolean;
  lastSyncedAt: string | null;
  add: <K extends DataKey>(
    key: K,
    record: Omit<GlowUpData[K][number], keyof SyncMeta>
  ) => GlowUpData[K][number];
  update: <K extends DataKey>(
    key: K,
    id: string,
    patch: Partial<GlowUpData[K][number]>
  ) => void;
  remove: <K extends DataKey>(key: K, id: string) => void;
  refreshFromCloud: () => Promise<void>;
  logHistory: (module: import('@/types').HistoryModule, action: string, label: string, detail?: string, occurredAt?: string) => void;
  toggleHabit: (taskId: string, date: string, isDone: boolean) => void;
  isHabitDone: (taskId: string, date: string) => boolean;
  getHabitLabel: (taskId: string, date: string) => string | null;
  setHabitLabel: (taskId: string, date: string, label: string | null) => void;
  getDayOverride: (taskId: string, date: string) => import('@/types').HabitCompletion | undefined;
  setDayOverride: (
    taskId: string,
    date: string,
    patch: Partial<Pick<import('@/types').HabitCompletion, 'override_start_time' | 'override_end_time' | 'override_color' | 'override_notes' | 'daily_label' | 'is_hidden_for_day'>>
  ) => void;
  isHiddenForDay: (taskId: string, date: string) => boolean;
  setHiddenForDay: (taskId: string, date: string, hidden: boolean) => void;
  recordTransaction: (
    input: Omit<import('@/types').Transaction, keyof import('@/types').SyncMeta>
  ) => import('@/types').Transaction;
  replaceAll: (next: GlowUpData) => void;
  profile: Profile | null;
  updateProfile: (patch: Partial<Pick<Profile, 'full_name' | 'avatar_url' | 'theme' | 'currency'>>) => Promise<void>;
}

const PROFILE_KEY_PREFIX = 'glowup:profile:';
const defaultProfile = (userId: string): Profile => ({
  id: userId,
  user_id: userId,
  full_name: null,
  avatar_url: null,
  theme: 'dark',
  currency: 'MGA',
  created_at: nowIso(),
  updated_at: nowIso(),
  deleted_at: null,
});

const GlowUpContext = createContext<GlowUpContextValue | undefined>(undefined);

export function GlowUpProvider({ children }: { children: ReactNode }) {
  const { user, isConfigured } = useAuth();
  const [data, setData] = useState<GlowUpData>(emptyGlowUpData);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const dataRef = useRef(data);
  dataRef.current = data;

  const [profile, setProfile] = useState<Profile | null>(null);

  // Charge le cache local dès qu'on connaît l'utilisateur
  useEffect(() => {
    if (!user) {
      setData(emptyGlowUpData);
      setProfile(null);
      return;
    }
    const cached = loadLocalData(user.id);
    setData(cached ?? emptyGlowUpData);

    const cachedProfile = localStorage.getItem(PROFILE_KEY_PREFIX + user.id);
    setProfile(cachedProfile ? (JSON.parse(cachedProfile) as Profile) : defaultProfile(user.id));

    if (isSupabaseConfigured) {
      supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()
        .then(({ data: row }) => {
          if (row) {
            setProfile(row as Profile);
            localStorage.setItem(PROFILE_KEY_PREFIX + user.id, JSON.stringify(row));
          }
        });
    }
  }, [user]);

  // Applique le thème choisi au document
  useEffect(() => {
    document.documentElement.classList.toggle('light', profile?.theme === 'light');
  }, [profile?.theme]);

  const updateProfile: GlowUpContextValue['updateProfile'] = async (patch) => {
    if (!user) return;
    const next: Profile = { ...(profile ?? defaultProfile(user.id)), ...patch, updated_at: nowIso() };
    setProfile(next);
    localStorage.setItem(PROFILE_KEY_PREFIX + user.id, JSON.stringify(next));
    if (isSupabaseConfigured) {
      await supabase.from('profiles').upsert({ ...next, id: user.id }, { onConflict: 'id' });
    }
  };

  // Tire les données depuis Supabase et fusionne avec le cache local
  const refreshFromCloud = async () => {
    if (!user || !isConfigured) return;
    setIsSyncing(true);
    try {
      const remote = await pullAllData(user.id);
      if (remote) {
        const merged = mergeByRecency(dataRef.current, remote);
        setData(merged);
        saveLocalData(user.id, merged);
        setLastSyncedAt(nowIso());
      }
    } finally {
      setIsSyncing(false);
    }
  };

  // Génère le verset et la citation du jour — UNE SEULE FOIS par jour et par
  // utilisateur. Le marqueur localStorage protège contre toute double
  // exécution (rechargements multiples de la page le même jour, StrictMode,
  // remounts de composants) : on ne relance jamais la génération si le
  // marqueur du jour existe déjà, quelle que soit la vitesse du réseau.
  const ensureDailyContent = () => {
    if (!user) return;
    const today = todayISO();
    const markerKey = `glowup:daily-gen:${user.id}:${today}`;
    if (localStorage.getItem(markerKey)) return;
    localStorage.setItem(markerKey, '1');

    if (!dataRef.current.verses.some((v) => v.date === today && v.is_generated)) {
      const v = verseForDate(today);
      add('verses', { text: v.text, reference: v.reference, translation_fr: v.translation_fr, is_generated: true, is_favorite: false, is_archived: false, date: today });
      logHistory('versets', 'Verset généré', v.reference ?? '');
    }
    if (!dataRef.current.quotes.some((q) => q.date === today && q.is_generated)) {
      const q = quoteForDate(today);
      add('quotes', { text: q.text, author: q.author, is_favorite: false, is_archived: false, is_generated: true, date: today });
      logHistory('citations', 'Citation générée', q.author ?? undefined);
    }
  };

  useEffect(() => {
    if (!user) return;
    refreshFromCloud().then(() => ensureDailyContent());
    const unsubscribe = subscribeRealtime(user.id, () => refreshFromCloud());
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isConfigured]);

  // Gère l'état en ligne / hors ligne + rejoue la file d'attente à la reconnexion
  useEffect(() => {
    const goOnline = () => {
      setIsOnline(true);
      flushQueue().then(() => refreshFromCloud());
    };
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  function persist(next: GlowUpData) {
    setData(next);
    if (user) saveLocalData(user.id, next);
  }

  const add: GlowUpContextValue['add'] = (key, record) => {
    if (!user) throw new Error('Utilisateur non connecté');
    const full = {
      ...record,
      id: uid(),
      user_id: user.id,
      created_at: nowIso(),
      updated_at: nowIso(),
      deleted_at: null,
    } as GlowUpData[typeof key][number];

    const next = { ...dataRef.current, [key]: [...dataRef.current[key], full] };
    persist(next);
    pushRecord(key, full as any);
    return full;
  };

  const update: GlowUpContextValue['update'] = (key, id, patch) => {
    if (!user) return;
    let updatedRow: any = null;
    const next = {
      ...dataRef.current,
      [key]: dataRef.current[key].map((row: any) => {
        if (row.id !== id) return row;
        updatedRow = { ...row, ...patch, updated_at: nowIso() };
        return updatedRow;
      }),
    };
    persist(next);
    if (updatedRow) pushRecord(key, updatedRow);
  };

  const remove: GlowUpContextValue['remove'] = (key, id) => {
    if (!user) return;
    const next = {
      ...dataRef.current,
      [key]: dataRef.current[key].filter((row: any) => row.id !== id),
    };
    persist(next);
    pushDelete(key, id, user.id);
  };

  const logHistory: GlowUpContextValue['logHistory'] = (module, action, label, detail, occurredAt) => {
    if (!user) return;
    add('historyEvents', {
      module,
      action,
      label,
      detail: detail ?? null,
      occurred_at: occurredAt ?? nowIso(),
      is_archived: false,
    } as any);
  };

  const isHabitDone: GlowUpContextValue['isHabitDone'] = (taskId, date) => {
    return dataRef.current.habitCompletions.some((c) => c.task_id === taskId && c.date === date && c.is_done);
  };

  const emptyOverrideFields = {
    daily_label: null,
    override_start_time: null,
    override_end_time: null,
    override_color: null,
    override_notes: null,
    is_hidden_for_day: false,
  };

  const toggleHabit: GlowUpContextValue['toggleHabit'] = (taskId, date, isDone) => {
    const existing = dataRef.current.habitCompletions.find((c) => c.task_id === taskId && c.date === date);
    if (existing) {
      update('habitCompletions', existing.id, { is_done: isDone });
    } else {
      add('habitCompletions', { task_id: taskId, date, is_done: isDone, ...emptyOverrideFields } as any);
    }
  };

  const getDayOverride: GlowUpContextValue['getDayOverride'] = (taskId, date) => {
    return dataRef.current.habitCompletions.find((c) => c.task_id === taskId && c.date === date);
  };

  const setDayOverride: GlowUpContextValue['setDayOverride'] = (taskId, date, patch) => {
    const existing = getDayOverride(taskId, date);
    if (existing) {
      update('habitCompletions', existing.id, patch);
    } else {
      add('habitCompletions', { task_id: taskId, date, is_done: false, ...emptyOverrideFields, ...patch } as any);
    }
  };

  const getHabitLabel: GlowUpContextValue['getHabitLabel'] = (taskId, date) => {
    return getDayOverride(taskId, date)?.daily_label ?? null;
  };

  const setHabitLabel: GlowUpContextValue['setHabitLabel'] = (taskId, date, label) => {
    setDayOverride(taskId, date, { daily_label: label });
  };

  const isHiddenForDay: GlowUpContextValue['isHiddenForDay'] = (taskId, date) => {
    return getDayOverride(taskId, date)?.is_hidden_for_day ?? false;
  };

  const setHiddenForDay: GlowUpContextValue['setHiddenForDay'] = (taskId, date, hidden) => {
    setDayOverride(taskId, date, { is_hidden_for_day: hidden });
  };

  // Crée une transaction datée (revenu ou dépense). Les catégories de budget
  // "Aperçu" restent un suivi manuel indépendant (comme avant, aucune
  // régression) ; le journal de transactions est la source précise et datée,
  // consultable séparément dans l'onglet "Revenus & Dépenses" et dans le
  // Bilan — les deux sont additifs, jamais fusionnés, pour éviter tout double
  // comptage.
  const recordTransaction: GlowUpContextValue['recordTransaction'] = (input) => {
    const tx = add('transactions', input as any);

    logHistory(
      'budget',
      input.type === 'expense' ? 'Nouvelle dépense' : 'Nouveau revenu',
      input.category,
      `${input.amount} — ${input.origin ?? input.note ?? ''}`.trim()
    );

    return tx as any;
  };

  const replaceAll: GlowUpContextValue['replaceAll'] = (next) => {
    persist(next);
  };

  return (
    <GlowUpContext.Provider
      value={{
        data,
        isSyncing,
        isOnline,
        lastSyncedAt,
        add,
        update,
        remove,
        refreshFromCloud,
        logHistory,
        toggleHabit,
        isHabitDone,
        getHabitLabel,
        setHabitLabel,
        getDayOverride,
        setDayOverride,
        isHiddenForDay,
        setHiddenForDay,
        recordTransaction,
        replaceAll,
        profile,
        updateProfile,
      }}
    >
      {children}
    </GlowUpContext.Provider>
  );
}

export function useGlowUpData() {
  const ctx = useContext(GlowUpContext);
  if (!ctx) throw new Error('useGlowUpData doit être utilisé dans GlowUpProvider');
  return ctx;
}
