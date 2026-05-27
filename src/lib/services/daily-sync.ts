'use client';

import { useSubscriptionStore } from '@/lib/store/subscription-store';
import { useBrandingStore } from '@/lib/store/branding-store';
import { triggerSubscriptionSync } from './subscription-sync';

const DAILY_SYNC_KEY = 'last_daily_sync';

interface SyncReport {
  timestamp: number;
  synced: boolean;
  expiryChecked: boolean;
  expiredCount: number;
  notificationsSent: number;
  errors: string[];
}

async function checkExpirations(): Promise<{ expiredCount: number; justExpired: string[] }> {
  const { checkExpiry, tenantPlans, cancelTenantPlan } = useSubscriptionStore.getState();
  const result = checkExpiry();
  return { expiredCount: result.expired.length, justExpired: result.justExpired };
}

async function sendExpiryNotifications(): Promise<number> {
  const { tenantPlans, getDaysRemaining, plans } = useSubscriptionStore.getState();
  const { branding } = useBrandingStore.getState();
  let sent = 0;

  // رقم المطور — المستقبل
  const developerWhatsApp = branding.developerWhatsApp || '201061935361';
  // رقم المدير — المرسل (صاحب السوبر ماركت)
  const managerWhatsApp = branding.whatsapp || '';
  const managerName = branding.managerName || 'مدير السوبر ماركت';

  for (const tp of tenantPlans) {
    const daysLeft = getDaysRemaining(tp.tenantId);
    const plan = plans.find((p) => p.id === tp.planId);

    // Notify at 7, 3, and 1 days before expiry
    const notifyDays = [7, 3, 1];
    const shouldNotify = notifyDays.includes(daysLeft) && tp.status === 'active';

    if (shouldNotify && (!tp.lastExpiryNotified || tp.lastExpiryNotified < Date.now() - 86400000)) {
      try {
        await fetch('/api/report-error', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subject: `⚠️ تنبيه: باقي ${daysLeft} أيام على انتهاء باقة ${tp.tenantId}`,
            report: `المستأجر: ${tp.tenantId}\nالباقة: ${plan?.nameAr || tp.planId}\nالأيام المتبقية: ${daysLeft}\nتاريخ الانتهاء: ${new Date(tp.endDate).toLocaleDateString('ar-EG')}\n\nيرجى التواصل مع المستأجر للتجديد.`,
            source: 'daily-sync',
            managerName,
            managerPhone: managerWhatsApp,
          }),
        });
        sent++;
      } catch {}
    }

    // رسالة إيقاف النظام — من رقم المدير → إلى رقم المطور
    if (tp.status === 'expired' && tp.endDate > Date.now() - 86400000 * 2) {
      try {
        const msg = `🚫 إيقاف نظام — انتهت باقة ${tp.tenantId}\n\n` +
          `📤 من: ${managerName}\n` +
          `📱 رقم المدير: ${managerWhatsApp}\n` +
          `🏪 المستأجر: ${tp.tenantId}\n` +
          `📋 الباقة: ${plan?.nameAr || tp.planId}\n` +
          `📅 تاريخ الانتهاء: ${new Date(tp.endDate).toLocaleDateString('ar-EG')}\n\n` +
          `تم إيقاف الخدمة بسبب انتهاء الباقة.\n` +
          `يرجى التواصل مع المدير للتجديد.\n\n` +
          `📥 إلى: رقم المطور (${developerWhatsApp})\n` +
          `— نظام SAPKEY SOLUTIONS`;

        await fetch('/api/whatsapp/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: developerWhatsApp,
            type: 'text',
            text: msg,
          }),
        });
        sent++;
      } catch {}
    }
  }

  return sent;
}

export async function runDailySync(): Promise<SyncReport> {
  const report: SyncReport = {
    timestamp: Date.now(),
    synced: false,
    expiryChecked: false,
    expiredCount: 0,
    notificationsSent: 0,
    errors: [],
  };

  if (typeof window === 'undefined' || !navigator.onLine) {
    report.errors.push('لا يوجد اتصال بالإنترنت');
    return report;
  }

  try {
    // 1. Check expirations and auto-lock expired tenants
    const { justExpired } = await checkExpirations();
    report.expiryChecked = true;
    report.expiredCount = justExpired.length;

    // 2. Send expiry notifications
    report.notificationsSent = await sendExpiryNotifications();

    // 3. Sync subscription data to Supabase
    const synced = await triggerSubscriptionSync();
    report.synced = synced;

    if (justExpired.length > 0) {
      console.log(`[DailySync] Locked ${justExpired.length} expired subscriptions`);
    }
  } catch (err: any) {
    report.errors.push(err?.message || 'Sync failed');
  }

  // Save last sync timestamp
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(DAILY_SYNC_KEY, JSON.stringify(report));
    } catch {}
  }

  return report;
}

export function getLastSyncReport(): SyncReport | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(DAILY_SYNC_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

// Start daily sync: runs immediately if online, then every 24h
// Also runs whenever the app comes back online
export function startDailySync() {
  const run = () => {
    if (navigator.onLine) {
      runDailySync().then((r) => {
        console.log(`[DailySync] Completed: synced=${r.synced}, expired=${r.expiredCount}, notified=${r.notificationsSent}`);
      });
    }
  };

  // Check once on startup
  setTimeout(run, 3000);

  // Check every 24 hours
  const interval = setInterval(run, 86400000);

  // Check when coming back online
  const handleOnline = () => {
    console.log('[DailySync] Internet restored - running sync');
    run();
  };
  window.addEventListener('online', handleOnline);

  return () => {
    clearInterval(interval);
    window.removeEventListener('online', handleOnline);
  };
}
