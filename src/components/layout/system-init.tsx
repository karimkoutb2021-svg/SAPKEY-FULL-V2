'use client';

import { useEffect } from 'react';
import { startHealthMonitor, stopHealthMonitor } from '@/lib/services/health-monitor';
import { startSubscriptionSync, stopSubscriptionSync } from '@/lib/services/subscription-sync';
import { startDailySync } from '@/lib/services/daily-sync';
import { useBrandingStore, syncBrandingQueue } from '@/lib/store/branding-store';

export function SystemInit() {
  useEffect(() => {
    // Load branding from Supabase and sync queue
    useBrandingStore.getState().loadFromSupabase();

    startHealthMonitor(300000);
    startSubscriptionSync();
    const stopDailSync = startDailySync();

    const handleOnline = () => {
      console.log('[SystemInit] Back online - running all checks...');
      syncBrandingQueue();
    };
    window.addEventListener('online', handleOnline);

    return () => {
      stopHealthMonitor();
      stopSubscriptionSync();
      stopDailSync();
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  return null;
}
