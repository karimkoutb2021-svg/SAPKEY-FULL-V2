'use client';

import { useEffect, ReactNode } from 'react';
import { useOfflineSync } from '@/lib/hooks/use-offline-sync';
import { useRealtimeSync } from '@/lib/hooks/use-realtime-sync';

const SYNC_TABLES = [
  'products',
  'product_categories',
  'orders',
  'customers',
  'inventory',
  'product_suppliers',
  'invoices',
  'users',
  'order_items',
  'payments',
  'notifications',
  'branding_settings',
  'storefront_banners',
  'coupons',
  'customer_reviews',
  'customer_addresses',
  'stock_items',
  'stock_adjustments',
  'order_pipeline',
  'audit_ocr_results',
  'coding_labels',
  'tracking_sessions',
  'internal_loans',
  'bank_transactions',
  'tax_periods',
  'held_orders',
  'coupon_redemptions',
  'customer_notifications',
];

export function OfflineSyncProvider({ children }: { children: ReactNode }) {
  const { isOnline, queueLength, syncing } = useOfflineSync();

  useRealtimeSync({
    tables: SYNC_TABLES,
    enabled: isOnline,
    onEvent: (event, table, payload) => {
      console.log(`[Sync] ${event} on ${table}`, payload);
    },
  });

  useEffect(() => {
    if (syncing) {
      console.log(`[Sync] Syncing ${queueLength} items...`);
    }
  }, [syncing, queueLength]);

  return <>{children}</>;
}
