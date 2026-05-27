'use client';

import { useEffect, useRef, useCallback } from 'react';
import { subscribeToTable, unsubscribeFromChannel, useOfflineSyncStore } from '@/lib/supabase/sync-client';

interface RealtimeSyncOptions {
  tables: string[];
  enabled?: boolean;
  onEvent?: (event: string, table: string, payload: any) => void;
}

export function useRealtimeSync({ tables, enabled = true, onEvent }: RealtimeSyncOptions) {
  const channelsRef = useRef<any[]>([]);
  const isOnline = useOfflineSyncStore((s) => s.isOnline);

  const setupChannels = useCallback(() => {
    if (!enabled || !isOnline) return;

    tables.forEach((table) => {
      const channel = subscribeToTable(table, (payload) => {
        console.log(`[Realtime] ${payload.eventType} on ${table}:`, payload);
        onEvent?.(payload.eventType, table, payload);
      });

      channelsRef.current.push(channel);
    });

    return () => {
      channelsRef.current.forEach((channel) => {
        unsubscribeFromChannel(channel);
      });
      channelsRef.current = [];
    };
  }, [tables, enabled, isOnline, onEvent]);

  useEffect(() => {
    const cleanup = setupChannels();
    return () => {
      cleanup?.();
    };
  }, [setupChannels]);

  return {
    isSyncing: isOnline && enabled,
    channelCount: channelsRef.current.length,
  };
}
