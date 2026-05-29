'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useOfflineSyncStore } from '@/lib/store/offline-sync-store';
import { processSyncQueue } from '@/lib/supabase/sync-client';

const supabase = createClient();

// Tables that need real-time sync
const MANAGER_TABLES = [
  'orders',
  'stock_items',
  'audit_sessions',
  'coding_drafts',
  'notifications',
  'branding_settings',
];

export function useRealtimeSync() {
  const [isOnline, setIsOnline] = useState(typeof window !== 'undefined' ? navigator.onLine : true);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncCount, setSyncCount] = useState(0);
  const channelsRef = useRef<any[]>([]);

  // Online/Offline detection
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      setIsOnline(true);
      useOfflineSyncStore.getState().setOnline(true);
      // Auto-sync when back online
      processSyncQueue().then((result) => {
        if (result) {
          setSyncCount((c) => c + result.synced);
          setLastSync(new Date());
        }
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      useOfflineSyncStore.getState().setOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Subscribe to all manager tables
  const subscribeToAll = useCallback(() => {
    // Unsubscribe from existing channels
    channelsRef.current.forEach((ch) => supabase.removeChannel(ch));
    channelsRef.current = [];

    MANAGER_TABLES.forEach((table) => {
      const channel = supabase
        .channel(`realtime-${table}-${Date.now()}`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
          console.log(`[Realtime] ${table}: ${payload.eventType}`, payload);
          // Invalidate localStorage cache
          localStorage.removeItem(`cache_${table}`);
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log(`[Realtime] Subscribed to ${table}`);
          }
        });

      channelsRef.current.push(channel);
    });
  }, []);

  // Unsubscribe on cleanup
  const unsubscribeAll = useCallback(() => {
    channelsRef.current.forEach((ch) => supabase.removeChannel(ch));
    channelsRef.current = [];
  }, []);

  // Manual sync trigger
  const triggerSync = useCallback(async () => {
    setSyncing(true);
    const result = await processSyncQueue();
    setSyncing(false);
    setLastSync(new Date());
    if (result) setSyncCount((c) => c + result.synced);
    return result;
  }, []);

  return {
    isOnline,
    syncing,
    lastSync,
    syncCount,
    subscribeToAll,
    unsubscribeAll,
    triggerSync,
  };
}

// Hook for specific table real-time updates
export function useTableSync<T = any>(table: string, initialData: T[] = [], columns: string = '*') {
  const [data, setData] = useState<T[]>(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: result, error } = await supabase.from(table).select(columns).order('created_at', { ascending: false }).limit(100);
        if (!cancelled) {
          if (error) throw error;
          setData((result as T[]) || []);
          // Cache for offline
          localStorage.setItem(`cache_${table}`, JSON.stringify({ data: result, timestamp: Date.now() }));
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message);
          // Try cached data
          try {
            const cached = localStorage.getItem(`cache_${table}`);
            if (cached) {
              const parsed = JSON.parse(cached);
              if (Date.now() - parsed.timestamp < 300000) {
                setData(parsed.data);
              }
            }
          } catch {}
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();

    // Subscribe to real-time changes without full refetch
    const channel = supabase
      .channel(`sync-${table}-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          setData(prev => {
            const idx = prev.findIndex((item: any) => item.id === (payload.new as any).id);
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = { ...next[idx], ...(payload.new as any) } as T;
              return next;
            }
            return [payload.new as T, ...prev].slice(0, 100);
          });
        } else if (payload.eventType === 'DELETE') {
          setData(prev => prev.filter((item: any) => item.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [table, columns]);

  return { data, loading, error, setData };
}

// Hook for auto-sync on connectivity
export function useAutoSync() {
  const { isOnline } = useOfflineSyncStore();

  useEffect(() => {
    if (isOnline) {
      processSyncQueue();
    }
  }, [isOnline]);

  // Periodic sync check every 30 seconds when online (fixed from 3 seconds)
  useEffect(() => {
    if (!isOnline) return;

    const interval = setInterval(() => {
      processSyncQueue();
    }, 30000);

    return () => clearInterval(interval);
  }, [isOnline]);
}
