'use client';

/**
 * ═══════════════════════════════════════════════════════════
 *  لوحة مزامنة المدير - Manager Sync Panel
 * ═══════════════════════════════════════════════════════════
 * 
 * يسمح للمدير بمزامنة المبيعات المؤقتة مع Supabase
 * عند الاتصال بالواي فاي في نهاية اليوم
 */

import { useState, useCallback } from 'react';
import { RefreshCw, Wifi, WifiOff, CheckCircle, AlertCircle, Database } from 'lucide-react';
import { getUnsyncedSalesCount, syncOfflineSalesToSupabase, OfflineSale } from '@/lib/offline/db';
import { createClient } from '@/lib/supabase/client';

interface SyncManagerProps {
  userRole?: string;
  onSyncComplete?: (result: { success: number; failed: number; errors: string[] }) => void;
}

export function SyncManager({ userRole, onSyncComplete }: SyncManagerProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [currentSale, setCurrentSale] = useState<OfflineSale | null>(null);
  const [result, setResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const [unsyncedCount, setUnsyncedCount] = useState<number>(0);
  const [isOnline, setIsOnline] = useState(typeof window !== 'undefined' ? navigator.onLine : true);

  // تحديث حالة الاتصال
  useState(() => {
    if (typeof window !== 'undefined') {
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  });

  // تحديث عدد المبيعات غير المزامنة
  const refreshCount = useCallback(async () => {
    try {
      const count = await getUnsyncedSalesCount();
      setUnsyncedCount(count);
    } catch {}
  }, []);

  // بدء المزامنة
  const handleSync = useCallback(async () => {
    if (!isOnline) return;

    setIsSyncing(true);
    setResult(null);
    setProgress(0);

    try {
      const supabase = createClient();
      const syncResult = await syncOfflineSalesToSupabase(supabase, (current, total, sale) => {
        setProgress(current);
        setTotal(total);
        setCurrentSale(sale);
      });

      setResult(syncResult);
      await refreshCount();

      if (onSyncComplete) {
        onSyncComplete(syncResult);
      }
    } catch (err: any) {
      setResult({ success: 0, failed: 0, errors: [`خطأ في المزامنة: ${err.message}`] });
    } finally {
      setIsSyncing(false);
      setCurrentSale(null);
    }
  }, [isOnline, refreshCount, onSyncComplete]);

  // المدير فقط يمكنه المزامنة
  if (userRole !== 'admin' && userRole !== 'manager') {
    return null;
  }

  return (
    <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
      {/* العنوان */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-emerald-500" />
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">مزامنة المبيعات</h3>
        </div>
        <div className="flex items-center gap-1.5">
          {isOnline ? (
            <Wifi className="h-4 w-4 text-emerald-500" />
          ) : (
            <WifiOff className="h-4 w-4 text-red-500" />
          )}
          <span className={`text-xs ${isOnline ? 'text-emerald-500' : 'text-red-500'}`}>
            {isOnline ? 'متصل' : 'غير متصل'}
          </span>
        </div>
      </div>

      {/* عدد المبيعات غير المزامنة */}
      <div className="flex items-center justify-between mb-3 px-2 py-2 rounded-lg bg-gray-50 dark:bg-slate-800">
        <span className="text-xs text-gray-500 dark:text-gray-400">مبيعات غير مزامنة</span>
        <span className="text-sm font-bold text-gray-900 dark:text-white">
          {unsyncedCount}
        </span>
      </div>

      {/* زر المزامنة */}
      <button
        onClick={handleSync}
        disabled={!isOnline || isSyncing || unsyncedCount === 0}
        className="w-full h-10 rounded-lg bg-emerald-500 text-white text-sm font-bold flex items-center justify-center gap-2 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isSyncing ? (
          <>
            <RefreshCw className="h-4 w-4 animate-spin" />
            جاري المزامنة...
          </>
        ) : (
          <>
            <RefreshCw className="h-4 w-4" />
            مزامنة الآن
          </>
        )}
      </button>

      {/* شريط التقدم */}
      {isSyncing && total > 0 && (
        <div className="mt-3">
          <div className="h-2 rounded-full bg-gray-200 dark:bg-slate-700 overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${(progress / total) * 100}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
            {progress} / {total}
            {currentSale && ` - ${currentSale.orderNumber}`}
          </p>
        </div>
      )}

      {/* نتيجة المزامنة */}
      {result && (
        <div className="mt-3 space-y-2">
          {result.success > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              <span className="text-xs text-emerald-700 dark:text-emerald-300">
                تم مزامنة {result.success} عملية بنجاح
              </span>
            </div>
          )}
          {result.failed > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <span className="text-xs text-red-700 dark:text-red-300">
                فشل {result.failed} عملية
              </span>
            </div>
          )}
          {result.errors.length > 0 && (
            <div className="px-3 py-2 rounded-lg bg-gray-50 dark:bg-slate-800">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">الأخطاء:</p>
              {result.errors.slice(0, 3).map((err, i) => (
                <p key={i} className="text-xs text-red-500 truncate">{err}</p>
              ))}
              {result.errors.length > 3 && (
                <p className="text-xs text-gray-400">+{result.errors.length - 3} أخطاء أخرى</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
