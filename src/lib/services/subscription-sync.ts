'use client';

import { useSubscriptionStore, type TenantPlan } from '@/lib/store/subscription-store';

// Syncs subscription data between Zustand (local) and Supabase (server)
// Tries to sync on every mutation; falls back to localStorage if offline

const SYNC_INTERVAL = 60000; // 1 minute

let syncInterval: ReturnType<typeof setInterval> | null = null;

async function syncTenantsToSupabase(tenantPlans: TenantPlan[]): Promise<boolean> {
  if (!navigator.onLine) return false;

  try {
    for (const tp of tenantPlans) {
      await fetch('/api/admin/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'set',
          tenantId: tp.tenantId,
          planId: tp.planId,
          durationDays: Math.ceil((tp.endDate - tp.startDate) / 86400000),
          features: tp.customFeatures,
          disabled: tp.disabledFeatures,
        }),
      });
    }
    return true;
  } catch {
    return false;
  }
}

export function startSubscriptionSync() {
  if (syncInterval) return;

  // Sync immediately if online
  const { tenantPlans } = useSubscriptionStore.getState();
  if (tenantPlans.length > 0) {
    syncTenantsToSupabase(tenantPlans);
  }

  // Periodic sync
  syncInterval = setInterval(() => {
    if (!navigator.onLine) return;
    const { tenantPlans } = useSubscriptionStore.getState();
    syncTenantsToSupabase(tenantPlans);
  }, SYNC_INTERVAL);
}

export function stopSubscriptionSync() {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
}

// Call this after any subscription mutation
export function triggerSubscriptionSync() {
  if (!navigator.onLine) return Promise.resolve(false);
  const { tenantPlans } = useSubscriptionStore.getState();
  return syncTenantsToSupabase(tenantPlans);
}

// For admin: suspend a tenant in Supabase
export async function suspendTenantOnServer(tenantId: string): Promise<boolean> {
  if (!navigator.onLine) return false;
  try {
    const res = await fetch('/api/admin/tenants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'suspend', tenantId }),
    });
    return res.ok;
  } catch { return false; }
}

// For admin: renew a tenant in Supabase
export async function renewTenantOnServer(tenantId: string, planId: string, durationDays: number): Promise<boolean> {
  if (!navigator.onLine) return false;
  try {
    const res = await fetch('/api/admin/tenants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'renew', tenantId, planId, durationDays }),
    });
    return res.ok;
  } catch { return false; }
}
