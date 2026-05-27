'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useOfflineSyncStore } from '@/lib/store/offline-sync-store';
import { processSyncQueue } from '@/lib/supabase/sync-client';

const supabase = createClient();

// Tables that need real-time sync
const MANAGER_TABLES = [
  'treasury_accounts',
  'treasury_transactions',
  'internal_loans',
  'stock_items',
  'stock_adjustments',
  'audit_sessions',
  'order_pipeline',
  'time_control',
  'orders',
  'products',
  'inventory_stock',
  'shifts',
  'notifications',
  'branding_settings',
  'employees',
  'leaves',
  'expenses',
  'tasks',
  'stock_transfers',
  'transfer_items',
  'product_history',
  'reconciliation_sessions',
  'coding_drafts',
  'audit_items',
  'order_stage_timers',
  'product_categories',
  'storefront_banners',
  'warehouses',
  'purchase_orders',
  'purchase_order_items',
  'product_suppliers',
  'subscriptions',
  'subscription_plans',
  'reconciliation_logs',
  'discrepancy_entries',
  'deliveries',
  'delivery_drivers',
  'customer_wallets',
  'loyalty_transactions',
  'coupons',
  'invoices',
  'held_orders',
  'users',
  'bank_accounts',
  'bank_transactions',
  'tax_periods',
  'chart_of_accounts',
  'journal_entries',
  'petty_cash_entries',
  'coupon_redemptions',
  'customer_addresses',
  'wallet_transactions',
  'customer_wishlist',
  'customer_notifications',
  'audit_logs',
  'platform_events',
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
export function useTableSync<T = any>(table: string, initialData: T[] = []) {
  const [data, setData] = useState<T[]>(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: result, error } = await supabase.from(table).select('*').order('created_at', { ascending: false });
        if (!cancelled) {
          if (error) throw error;
          setData(result || []);
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

    // Subscribe to real-time changes
    const channel = supabase
      .channel(`sync-${table}-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        fetchData(); // Refetch on any change
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [table]);

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

  // Periodic sync check every 30 seconds when online
  useEffect(() => {
    if (!isOnline) return;

    const interval = setInterval(() => {
      processSyncQueue();
    }, 3000);

    return () => clearInterval(interval);
  }, [isOnline]);
}
