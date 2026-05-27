'use client';

import { createClient } from '@/lib/supabase/client';
import { useOfflineSyncStore } from '@/lib/store/offline-sync-store';

const client = createClient();

// ===== SYNC-AWARE CRUD OPERATIONS =====
// These functions check online status and queue operations when offline

export async function syncInsert(table: string, data: any) {
  const state = useOfflineSyncStore.getState();
  
  if (!state.isOnline) {
    useOfflineSyncStore.getState().addToQueue({
      type: 'create',
      table,
      data,
    });
    return { data: null, error: null, offline: true };
  }

  return client.from(table).insert(data);
}

export async function syncInsertMany(table: string, data: any[]) {
  const state = useOfflineSyncStore.getState();
  
  if (!state.isOnline) {
    data.forEach((item) => {
      useOfflineSyncStore.getState().addToQueue({
        type: 'create',
        table,
        data: item,
      });
    });
    return { data: null, error: null, offline: true };
  }

  return client.from(table).insert(data);
}

export async function syncUpdate(table: string, data: any, idColumn: string = 'id') {
  const state = useOfflineSyncStore.getState();
  
  if (!state.isOnline) {
    useOfflineSyncStore.getState().addToQueue({
      type: 'update',
      table,
      data,
    });
    return { data: null, error: null, offline: true };
  }

  return client.from(table).update(data).eq(idColumn, data[idColumn]);
}

export async function syncDelete(table: string, id: string, idColumn: string = 'id') {
  const state = useOfflineSyncStore.getState();
  
  if (!state.isOnline) {
    useOfflineSyncStore.getState().addToQueue({
      type: 'delete',
      table,
      data: { [idColumn]: id },
    });
    return { data: null, error: null, offline: true };
  }

  return client.from(table).delete().eq(idColumn, id);
}

// ===== QUERY OPERATIONS (always online, fallback to cache) =====

export async function syncQuery(table: string, queryFn: (builder: any) => any) {
  const state = useOfflineSyncStore.getState();
  
  if (!state.isOnline) {
    // Try to get from cache first
    try {
      const cached = localStorage.getItem(`cache_${table}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.timestamp < 300000) { // 5 min cache
          return { data: parsed.data, error: null, fromCache: true };
        }
      }
    } catch {}
    return { data: null, error: { message: 'Offline - no cached data' }, fromCache: false };
  }

  const result = await queryFn(client.from(table));
  
  // Cache the result for offline access
  if (result.data) {
    try {
      localStorage.setItem(`cache_${table}`, JSON.stringify({
        data: result.data,
        timestamp: Date.now(),
      }));
    } catch {}
  }
  
  return { ...result, fromCache: false };
}

// ===== SYNC QUEUE PROCESSOR =====

export async function processSyncQueue() {
  const state = useOfflineSyncStore.getState();
  
  if (state.queue.length === 0 || !state.isOnline || state.syncing) {
    return;
  }

  useOfflineSyncStore.getState().setSyncing(true);
  
  const queue = [...state.queue];
  let synced = 0;
  let failed = 0;

  for (const item of queue) {
    if (item.resolved || item.retries >= 5) {
      useOfflineSyncStore.getState().removeFromQueue(item.id);
      continue;
    }

    try {
      let result;
      
      switch (item.type) {
        case 'create':
          result = await client.from(item.table).insert(item.data);
          break;
        case 'update':
          result = await client.from(item.table).update(item.data).eq('id', item.data.id);
          break;
        case 'delete':
          result = await client.from(item.table).delete().eq('id', item.data.id);
          break;
        default:
          break;
      }

      if (result?.error) {
        throw new Error(result.error.message);
      }

      useOfflineSyncStore.getState().removeFromQueue(item.id);
      useOfflineSyncStore.getState().incrementSynced();
      synced++;
    } catch (error) {
      console.error(`[Sync] Failed to sync ${item.id}:`, error);
      useOfflineSyncStore.getState().removeFromQueue(item.id);
      // Re-queue with incremented retries
      if (item.retries < 5) {
        useOfflineSyncStore.getState().addToQueue({
          type: item.type,
          table: item.table,
          data: item.data,
        });
      }
      failed++;
    }
  }

  useOfflineSyncStore.getState().setSyncing(false);
  useOfflineSyncStore.getState().setLastSync();

  if (synced > 0) {
    console.log(`[Sync] Synced ${synced} items, ${failed} failed`);
  }

  return { synced, failed };
}

// ===== REALTIME SUBSCRIPTIONS =====

export function subscribeToTable(
  table: string,
  callback: (payload: any) => void,
  events: ('INSERT' | 'UPDATE' | 'DELETE' | '*')[] = ['*']
) {
  const channel = client
    .channel(`realtime-${table}-${Date.now()}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table },
      (payload) => {
        callback(payload);
        // Invalidate cache on change
        localStorage.removeItem(`cache_${table}`);
      }
    )
    .subscribe();

  return channel;
}

export function unsubscribeFromChannel(channel: any) {
  client.removeChannel(channel);
}

// ===== EXPORT FOR CONVENIENCE =====

export { client as supabase };
export { useOfflineSyncStore } from '@/lib/store/offline-sync-store';
