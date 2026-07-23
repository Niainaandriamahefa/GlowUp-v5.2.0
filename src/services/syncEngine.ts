import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { DataKey, GlowUpData, SyncMeta } from '@/types';
import { TABLE_NAMES } from '@/types';
import { nowIso } from '@/lib/utils';

// ============================================================================
// Moteur de synchronisation "local-first".
//
// Principe :
// 1. Chaque écriture (create/update/delete) est appliquée immédiatement au
//    cache LocalStorage -> l'UI est instantanée, même hors ligne.
// 2. La même écriture est poussée vers Supabase en arrière-plan (upsert).
//    Si ça échoue (pas de réseau), l'enregistrement reste marqué "pending"
//    dans une file d'attente et sera repoussé à la reconnexion.
// 3. Au démarrage et lors des changements réseau, on tire (pull) les
//    dernières données de Supabase et on fusionne par updated_at le plus
//    récent (dernier écrit gagne).
// 4. Supabase Realtime tient les autres appareils à jour en direct.
// ============================================================================

const STORAGE_PREFIX = 'glowup:data:';
const QUEUE_KEY = 'glowup:sync-queue';

type QueueOp = { table: string; op: 'upsert' | 'delete'; row: any };

function localKey(userId: string) {
  return `${STORAGE_PREFIX}${userId}`;
}

export function loadLocalData(userId: string): GlowUpData | null {
  try {
    const raw = localStorage.getItem(localKey(userId));
    return raw ? (JSON.parse(raw) as GlowUpData) : null;
  } catch {
    return null;
  }
}

export function saveLocalData(userId: string, data: GlowUpData) {
  try {
    localStorage.setItem(localKey(userId), JSON.stringify(data));
  } catch (err) {
    console.error('[GlowUp] Échec de sauvegarde locale', err);
  }
}

function readQueue(): QueueOp[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as QueueOp[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: QueueOp[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

function enqueue(op: QueueOp) {
  const queue = readQueue();
  queue.push(op);
  writeQueue(queue);
}

/** Pousse un enregistrement vers Supabase (upsert). Met en file d'attente en cas d'échec réseau. */
export async function pushRecord<K extends DataKey>(
  key: K,
  record: SyncMeta & Record<string, unknown>
) {
  const table = TABLE_NAMES[key];
  if (!isSupabaseConfigured) return;

  const { error } = await supabase.from(table).upsert(record, { onConflict: 'id' });
  if (error) {
    console.warn(`[GlowUp] Sync différée pour ${table} (hors ligne ?)`, error.message);
    enqueue({ table, op: 'upsert', row: record });
  }
}

/** Supprime (soft delete) un enregistrement côté Supabase. */
export async function pushDelete<K extends DataKey>(key: K, id: string, userId: string) {
  const table = TABLE_NAMES[key];
  if (!isSupabaseConfigured) return;

  const { error } = await supabase
    .from(table)
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    enqueue({ table, op: 'delete', row: { id, user_id: userId } });
  }
}

/** Rejoue la file d'attente (appelé quand le navigateur repasse en ligne). */
export async function flushQueue() {
  if (!isSupabaseConfigured) return;
  const queue = readQueue();
  if (queue.length === 0) return;

  const remaining: QueueOp[] = [];
  for (const op of queue) {
    try {
      if (op.op === 'upsert') {
        const { error } = await supabase.from(op.table).upsert(op.row, { onConflict: 'id' });
        if (error) remaining.push(op);
      } else {
        const { error } = await supabase
          .from(op.table)
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', op.row.id)
          .eq('user_id', op.row.user_id);
        if (error) remaining.push(op);
      }
    } catch {
      remaining.push(op);
    }
  }
  writeQueue(remaining);
}

/** Récupère toutes les tables de l'utilisateur depuis Supabase. */
export async function pullAllData(userId: string): Promise<GlowUpData | null> {
  if (!isSupabaseConfigured) return null;

  const entries = Object.entries(TABLE_NAMES) as [DataKey, string][];
  const results = await Promise.all(
    entries.map(([, table]) =>
      supabase.from(table).select('*').eq('user_id', userId).is('deleted_at', null)
    )
  );

  const data: Partial<GlowUpData> = {};
  entries.forEach(([key], idx) => {
    const { data: rows, error } = results[idx];
    if (!error && rows) {
      (data as any)[key] = rows;
    }
  });

  return data as GlowUpData;
}

function normalizeRowsForImport<K extends DataKey>(key: K, rows: GlowUpData[K], userId: string) {
  return (rows as unknown as Array<Record<string, unknown>>).map((row) => ({
    ...row,
    user_id: typeof row.user_id === 'string' && row.user_id ? row.user_id : userId,
    created_at: row.created_at ?? nowIso(),
    updated_at: row.updated_at ?? nowIso(),
    deleted_at: row.deleted_at ?? null,
  }));
}

export async function importDataToCloud(userId: string, next: GlowUpData) {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Supabase n\'est pas configuré.' };
  }

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user?.id) {
    return { success: false, error: 'Tu n\'es pas connecté à Supabase. Reconnecte-toi puis réessaie.' };
  }

  const effectiveUserId = authData.user.id;
  const entries = Object.entries(TABLE_NAMES) as [DataKey, string][];
  let importedCount = 0;
  const failures: string[] = [];

  try {
    for (const [key, table] of entries) {
      const rows = normalizeRowsForImport(key, next[key], effectiveUserId);

      for (const row of rows) {
        const { error } = await supabase.from(table).upsert(
          { ...row, user_id: effectiveUserId },
          { onConflict: 'id' }
        );

        if (error) {
          failures.push(`${table}: ${error.message}`);
          console.error(`[GlowUp] Import cloud impossible pour ${table}`, error);
        } else {
          importedCount += 1;
        }
      }
    }

    if (importedCount === 0) {
      return {
        success: false,
        error: failures[0] ?? 'Aucune donnée n\'a pu être enregistrée en ligne.',
      };
    }

    return { success: true, importedCount };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Échec de l\'import en ligne.';
    return { success: false, error: message };
  }
}

/** Fusionne deux jeux de données par updated_at le plus récent, ligne par ligne. */
export function mergeByRecency(local: GlowUpData, remote: GlowUpData): GlowUpData {
  const merged: any = {};
  for (const key of Object.keys(TABLE_NAMES) as DataKey[]) {
    const localRows = (local[key] as unknown as SyncMeta[]) || [];
    const remoteRows = (remote[key] as unknown as SyncMeta[]) || [];
    const byId = new Map<string, SyncMeta>();

    for (const row of localRows) byId.set(row.id, row);
    for (const row of remoteRows) {
      const existing = byId.get(row.id);
      if (!existing || new Date(row.updated_at) >= new Date(existing.updated_at)) {
        byId.set(row.id, row);
      }
    }
    merged[key] = Array.from(byId.values()).filter((r) => !r.deleted_at);
  }
  return merged as GlowUpData;
}

export function subscribeRealtime(userId: string, onChange: () => void) {
  if (!isSupabaseConfigured) return () => {};

  const tables = Object.values(TABLE_NAMES);
  const channel = supabase.channel(`glowup-realtime-${userId}`);

  tables.forEach((table) => {
    channel.on(
      'postgres_changes' as any,
      { event: '*', schema: 'public', table, filter: `user_id=eq.${userId}` },
      onChange
    );
  });

  channel.subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}
