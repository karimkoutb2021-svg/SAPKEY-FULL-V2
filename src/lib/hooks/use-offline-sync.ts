'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useOfflineSyncStore, processSyncQueue } from '@/lib/supabase/sync-client';
import toast from 'react-hot-toast';

const SYNC_INTERVAL = 3000;

export function useOfflineSync() {
  const isOnline = useOfflineSyncStore((s) => s.isOnline);
  const queueLength = useOfflineSyncStore((s) => s.queue.length);
  const syncing = useOfflineSyncStore((s) => s.syncing);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasNotifiedOnline = useRef(false);
  const hasNotifiedOffline = useRef(false);

  const sync = useCallback(async () => {
    if (!isOnline || syncing || queueLength === 0) return;
    
    const result = await processSyncQueue();
    if (result && result.synced > 0) {
      toast.success(`تمت مزامنة ${result.synced} عنصر مع الخادم`);
    }
    if (result && result.failed > 0) {
      toast.error(`فشل مزامنة ${result.failed} عنصر`);
    }
  }, [isOnline, syncing, queueLength]);

  useEffect(() => {
    const handleOnline = () => {
      useOfflineSyncStore.getState().setOnline(true);
      if (!hasNotifiedOnline.current) {
        toast.success('تم الاتصال بالإنترنت - جاري المزامنة...');
        hasNotifiedOnline.current = true;
        hasNotifiedOffline.current = false;
      }
      sync();
    };

    const handleOffline = () => {
      useOfflineSyncStore.getState().setOnline(false);
      if (!hasNotifiedOffline.current) {
        toast.error('انقطع الاتصال - سيتم الحفظ محلياً');
        hasNotifiedOffline.current = true;
        hasNotifiedOnline.current = false;
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    useOfflineSyncStore.getState().setOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [sync]);

  useEffect(() => {
    if (isOnline && !syncing) {
      intervalRef.current = setInterval(sync, SYNC_INTERVAL);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isOnline, syncing, sync]);

  return {
    isOnline,
    syncing,
    queueLength,
    sync,
  };
}
