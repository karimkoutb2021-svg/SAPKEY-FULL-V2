'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface OfflineQueueItem {
  id: string;
  type: 'create' | 'update' | 'delete';
  table: string;
  data: any;
  timestamp: number;
  retries: number;
  resolved: boolean;
}

interface OfflineSyncState {
  isOnline: boolean;
  queue: OfflineQueueItem[];
  lastSync: number | null;
  syncing: boolean;
  syncError: string | null;
  totalSynced: number;
  
  setOnline: (online: boolean) => void;
  addToQueue: (item: Omit<OfflineQueueItem, 'id' | 'timestamp' | 'retries' | 'resolved'>) => void;
  removeFromQueue: (id: string) => void;
  clearQueue: () => void;
  setSyncing: (syncing: boolean) => void;
  setLastSync: () => void;
  setSyncError: (error: string | null) => void;
  incrementSynced: () => void;
  resetSynced: () => void;
}

export const useOfflineSyncStore = create<OfflineSyncState>()(
  persist(
    (set, get) => ({
      isOnline: typeof window !== 'undefined' ? navigator.onLine : true,
      queue: [],
      lastSync: null,
      syncing: false,
      syncError: null,
      totalSynced: 0,

      setOnline: (online) => set({ isOnline: online }),

      addToQueue: (item) => set((state) => ({
        queue: [...state.queue, {
          ...item,
          id: `${item.table}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
          timestamp: Date.now(),
          retries: 0,
          resolved: false,
        }],
      })),

      removeFromQueue: (id) => set((state) => ({
        queue: state.queue.filter((item) => item.id !== id),
      })),

      clearQueue: () => set({ queue: [] }),

      setSyncing: (syncing) => set({ syncing }),

      setLastSync: () => set({ lastSync: Date.now(), syncError: null }),

      setSyncError: (error) => set({ syncError: error }),

      incrementSynced: () => set((state) => ({ totalSynced: state.totalSynced + 1 })),

      resetSynced: () => set({ totalSynced: 0 }),
    }),
    { 
      name: 'offline-sync-store',
      partialize: (state) => ({ queue: state.queue, lastSync: state.lastSync, totalSynced: state.totalSynced }),
    }
  )
);
