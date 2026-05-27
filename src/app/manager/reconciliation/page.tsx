'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/lib/store/auth-store';
import {
  reconciliationService, discrepancyService, reconciliationLogService, STATUS_CONFIG,
  type ReconciliationSession, type DiscrepancyEntry, type ReconciliationLog,
} from '@/lib/supabase/services/reconciliation';
import {
  treasuryService, treasuryTransactionService,
  type TreasuryAccount, type TreasuryTransaction,
} from '@/lib/supabase/services/treasury';
import { transferService, type StockTransfer } from '@/lib/supabase/services/procurement';
import {
  AlertTriangle, CheckCircle, XCircle, Search, RefreshCw, Save, FileText,
  Clock, ArrowRightLeft, Wallet, Package, Camera} from 'lucide-react';
import toast from 'react-hot-toast';

const supabase = createClient();

const DISCREPANCY_TYPE_LABELS: Record<string, string> = {
  treasury: 'خزينة',
  inventory: 'مخزون',
  transfer: 'تحويل',
  collection: 'تحصيل',
};

const SESSION_ACTION_LABELS: Record<string, string> = {
  started: 'بدء الجلسة',
  discrepancy_found: 'تم اكتشاف فرق',
  discrepancy_resolved: 'تم حل الفرق',
  settlement_recorded: 'تسوية مسجلة',
  completed: 'اكتملت المطابقة',
  cancelled: 'ملغية',
};

export default function ReconciliationPage() {
  const user = useAuthStore((s) => s.user);

  const [session, setSession] = useState<ReconciliationSession | null>(null);
  const [accounts, setAccounts] = useState<TreasuryAccount[]>([]);
  const [transactions, setTransactions] = useState<TreasuryTransaction[]>([]);
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [actualBalances, setActualBalances] = useState<Record<string, string>>({});
  const [discrepancies, setDiscrepancies] = useState<DiscrepancyEntry[]>([]);
  const [logs, setLogs] = useState<ReconciliationLog[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'discrepancies' | 'log'>('overview');
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [settleAmount, setSettleAmount] = useState('');
  const [settleReason, setSettleReason] = useState('');

  const totalSystemBalance = accounts.reduce((s, a) => s + a.current_balance, 0);
  const totalActualBalance = accounts.reduce(
    (s, a) => s + (parseFloat(actualBalances[a.id]) || 0), 0,
  );
  const totalDifference = totalActualBalance - totalSystemBalance;

  const pendingTransactions = transactions.filter((t) => t.status === 'pending' || t.status === 'delayed');
  const delayedTransactions = transactions.filter((t) => t.status === 'delayed');
  const pendingTransfers = transfers.filter((t) => t.status === 'pending_approval');

  useEffect(() => {
    fetchAllData();
    const channel = supabase.channel('reconciliation-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reconciliation_sessions' }, () => fetchAllData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'treasury_transactions' }, () => fetchAllData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_transfers' }, () => fetchAllData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  async function fetchAllData() {
    try {
      const [sessionRes, accountsRes, txRes, transferRes] = await Promise.all([
        reconciliationService.getTodaySession(),
        treasuryService.getAll(),
        treasuryTransactionService.getAll(),
        transferService.getAll(),
      ]);
      if (sessionRes.data) {
        setSession(sessionRes.data);
        if (sessionRes.data.status !== 'completed') {
          sessionRes.data.total_difference = totalDifference;
        }
      }
      if (accountsRes.data) {
        setAccounts(accountsRes.data);
        const initial: Record<string, string> = {};
        for (const a of accountsRes.data) {
          initial[a.id] = actualBalances[a.id] !== undefined ? actualBalances[a.id] : a.current_balance.toString();
        }
        setActualBalances(initial);
      }
      if (txRes.data) setTransactions(txRes.data);
      if (transferRes.data) setTransfers(transferRes.data);

      if (sessionRes.data) {
        const [discRes, logRes] = await Promise.all([
          discrepancyService.getAll(sessionRes.data.id),
          reconciliationLogService.getAll(sessionRes.data.id),
        ]);
        if (discRes.data) setDiscrepancies(discRes.data);
        if (logRes.data) setLogs(logRes.data);
      }
    } catch (err: any) {
      toast.error('فشل تحميل بيانات المطابقة');
    } finally {
      setLoading(false);
    }
  }

  async function handleStartSession() {
    if (!user) return;
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const now = new Date().toISOString();
      const { data, error } = await reconciliationService.create({
        session_date: today,
        status: 'open',
        total_system_balance: totalSystemBalance,
        total_actual_balance: 0,
        total_difference: 0,
        pending_operations_count: pendingTransactions.length,
        pending_transfers_count: pendingTransfers.length,
        pending_collections_count: delayedTransactions.length,
        started_by: user.id,
        started_at: now,
      });
      if (error || !data) { toast.error('فشل بدء الجلسة'); return; }
      setSession(data);
      await reconciliationLogService.create({
        session_id: data.id,
        action: 'started',
        description: 'بدأ جلسة المطابقة اليومية',
        performed_by: user.id,
        performed_by_name: user.nameAr || user.name,
      });
      toast.success('تم بدء جلسة المطابقة');
      fetchAllData();
    } catch { toast.error('فشل بدء الجلسة'); }
    setLoading(false);
  }

  async function handleReopenSession() {
    if (!session || !user) return;
    const { error } = await reconciliationService.update(session.id, { status: 'in_progress' });
    if (error) { toast.error('فشل إعادة فتح الجلسة'); return; }
    setSession({ ...session, status: 'in_progress' });
    await reconciliationLogService.create({
      session_id: session.id,
      action: 'started',
      description: 'إعادة فتح جلسة المطابقة',
      performed_by: user.id,
      performed_by_name: user.nameAr || user.name,
    });
    toast.success('تم إعادة فتح الجلسة');
    fetchAllData();
  }

  async function handleSaveBalances() {
    if (!session || !user) return;
    setLoading(true);
    try {
      const { error } = await reconciliationService.update(session.id, {
        total_system_balance: totalSystemBalance,
        total_actual_balance: totalActualBalance,
        total_difference: totalDifference,
        status: session.status === 'open' ? 'in_progress' : session.status,
        pending_operations_count: pendingTransactions.length,
        pending_transfers_count: pendingTransfers.length,
        pending_collections_count: delayedTransactions.length,
      });
      if (error) { toast.error('فشل حفظ الأرصدة'); return; }
      setSession((prev) => prev ? {
        ...prev,
        total_system_balance: totalSystemBalance,
        total_actual_balance: totalActualBalance,
        total_difference: totalDifference,
        status: prev.status === 'open' ? 'in_progress' : prev.status,
      } : prev);

      for (const account of accounts) {
        const actual = parseFloat(actualBalances[account.id]) || 0;
        if (actual !== account.current_balance) {
          await discrepancyService.create({
            session_id: session.id,
            type: 'treasury',
            source_type: 'treasury_account',
            source_id: account.id,
            source_name: account.name_ar,
            system_value: account.current_balance,
            actual_value: actual,
            difference: actual - account.current_balance,
            resolved: false,
          });
        }
      }

      if (totalDifference !== 0) {
        await reconciliationLogService.create({
          session_id: session.id,
          action: 'discrepancy_found',
          description: `تم اكتشاف فروقات بقيمة ${totalDifference.toLocaleString('ar-EG')} ج.م`,
          performed_by: user.id,
          performed_by_name: user.nameAr || user.name,
        });
      }

      toast.success('تم حفظ الأرصدة');
      fetchAllData();
    } catch { toast.error('فشل حفظ الأرصدة'); }
    setLoading(false);
  }

  async function handleSettle() {
    if (!session || !user || !settleAmount) return;
    setLoading(true);
    try {
      const amount = parseFloat(settleAmount);
      const { error } = await reconciliationService.update(session.id, {
        total_difference: 0,
        total_actual_balance: totalSystemBalance,
      });
      if (error) { toast.error('فشل تسوية الفروقات'); return; }

      for (const account of accounts) {
        const actual = parseFloat(actualBalances[account.id]) || 0;
        if (actual !== account.current_balance) {
          await discrepancyService.create({
            session_id: session.id,
            type: 'treasury',
            source_type: 'treasury_account',
            source_id: account.id,
            source_name: account.name_ar,
            system_value: account.current_balance,
            actual_value: actual,
            difference: actual - account.current_balance,
            resolved: true,
            reason: settleReason || 'تسوية يدوية',
            resolved_by: user.id,
            resolved_at: new Date().toISOString(),
          });
        }
      }

      await reconciliationLogService.create({
        session_id: session.id,
        action: 'settlement_recorded',
        description: `تسوية فروقات بقيمة ${amount.toLocaleString('ar-EG')} ج.م - ${settleReason || 'بدون ملاحظات'}`,
        performed_by: user.id,
        performed_by_name: user.nameAr || user.name,
      });

      setShowSettleModal(false);
      setSettleAmount('');
      setSettleReason('');
      toast.success('تم تسجيل التسوية');
      fetchAllData();
    } catch { toast.error('فشل تسوية الفروقات'); }
    setLoading(false);
  }

  async function handleCompleteSession() {
    if (!session || !user) return;
    setLoading(true);
    try {
      const { error } = await reconciliationService.complete(session.id, user.id);
      if (error) { toast.error('فشل إتمام المطابقة'); return; }
      await reconciliationLogService.create({
        session_id: session.id,
        action: 'completed',
        description: 'تم إتمام جلسة المطابقة اليومية بنجاح',
        performed_by: user.id,
        performed_by_name: user.nameAr || user.name,
      });
      toast.success('تم إتمام المطابقة اليومية');
      fetchAllData();
    } catch { toast.error('فشل إتمام المطابقة'); }
    setLoading(false);
  }

  async function handleResolveDiscrepancy(discId: string) {
    if (!user) return;
    const { error } = await discrepancyService.resolve(discId, user.id, 'تمت التسوية');
    if (error) { toast.error('فشل حل الفرق'); return; }
    await reconciliationLogService.create({
      session_id: session?.id || '',
      action: 'discrepancy_resolved',
      description: 'تم حل أحد الفروقات',
      performed_by: user.id,
      performed_by_name: user.nameAr || user.name,
    });
    toast.success('تم حل الفرق');
    fetchAllData();
  }

  function getAccountDiff(accountId: string): number {
    const actual = parseFloat(actualBalances[accountId]) || 0;
    const account = accounts.find((a) => a.id === accountId);
    return actual - (account?.current_balance || 0);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin text-emerald-400 mx-auto" />
          <p className="text-gray-400 text-sm">جاري تحميل بيانات المطابقة...</p>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="space-y-6">
      {/* Section 1: Session Header */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold">المطابقة اليومية</h1>
              <p className="text-sm text-gray-400">
                {new Date().toLocaleDateString('ar-EG', {
                  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {session && (
              <span className={cn(
                'text-xs px-3 py-1 rounded-full border',
                STATUS_CONFIG[session.status]?.color || 'bg-gray-500/20 text-gray-400',
              )}>
                {STATUS_CONFIG[session.status]?.label || session.status}
              </span>
            )}
            {!session ? (
              <button
                onClick={handleStartSession}
                className="px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors text-sm font-medium"
              >
                بدء جلسة مطابقة جديدة
              </button>
            ) : session.status === 'completed' ? (
              <span className="text-sm text-gray-400 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                اكتملت المطابقة لهذا اليوم
              </span>
            ) : (
              <button
                onClick={handleReopenSession}
                className="px-4 py-2 rounded-xl bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-colors text-sm font-medium"
              >
                استئناف / إعادة فتح
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Section 2: Main Reconciliation Formula */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6">
        <h2 className="text-lg font-semibold mb-4">معادلة المطابقة</h2>
        <div className="space-y-3 font-mono text-base">
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.04]">
            <span className="text-gray-400">الرصيد الدفتري للنظام:</span>
            <span className="font-bold text-white">{totalSystemBalance.toLocaleString('ar-EG')} ج.م</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.04]">
            <span className="text-gray-400">الرصيد الفعلي (يدوياً):</span>
            <input
              type="text"
              value={totalActualBalance.toLocaleString('ar-EG')}
              readOnly
              className="bg-transparent text-left font-bold text-white w-40 text-base outline-none"
            />
          </div>
          <div className="border-t border-white/[0.08] my-1" />
          <div className={cn(
            'flex items-center justify-between p-3 rounded-xl font-bold',
            totalDifference === 0
              ? 'bg-emerald-500/10 text-emerald-400'
              : 'bg-red-500/10 text-red-400',
          )}>
            <span>الفرق:</span>
            <span>
              {totalDifference >= 0 ? '+' : ''}{totalDifference.toLocaleString('ar-EG')} ج.م
              {totalDifference === 0 ? (
                <CheckCircle className="w-4 h-4 inline mr-2 text-emerald-400" />
              ) : (
                <XCircle className="w-4 h-4 inline mr-2 text-red-400" />
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Section 3: Account-by-Account Table */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">أرصدة الحسابات</h2>
          {session && session.status !== 'completed' && (
            <button
              onClick={handleSaveBalances}
              className="px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors text-sm font-medium flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              حفظ الأرصدة
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-gray-400">
                <th className="text-right py-3 px-2 font-medium">الحساب</th>
                <th className="text-right py-3 px-2 font-medium">الرصيد الدفتري</th>
                <th className="text-right py-3 px-2 font-medium">الرصيد الفعلي يدوياً</th>
                <th className="text-right py-3 px-2 font-medium">الفرق</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => {
                const diff = getAccountDiff(account.id);
                const actual = parseFloat(actualBalances[account.id]) || 0;
                return (
                  <tr key={account.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-2 font-medium">{account.name_ar}</td>
                    <td className="py-3 px-2 text-gray-300 font-mono">
                      {account.current_balance.toLocaleString('ar-EG')}
                    </td>
                    <td className="py-3 px-2">
                      {session && session.status !== 'completed' ? (
                        <input
                          type="number"
                          value={actualBalances[account.id] || ''}
                          onChange={(e) => setActualBalances((prev) => ({ ...prev, [account.id]: e.target.value }))}
                          className="w-32 px-2 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-left font-mono outline-none focus:border-emerald-500/50"
                        />
                      ) : (
                        <span className="font-mono text-gray-300">{actual.toLocaleString('ar-EG')}</span>
                      )}
                    </td>
                    <td className={cn(
                      'py-3 px-2 font-mono font-semibold',
                      diff === 0 ? 'text-emerald-400' : 'text-red-400',
                    )}>
                      {diff >= 0 ? '+' : ''}{diff.toLocaleString('ar-EG')}
                    </td>
                  </tr>
                );
              })}
              <tr className="border-t border-white/[0.08] font-bold">
                <td className="py-3 px-2">الإجمالي</td>
                <td className="py-3 px-2 font-mono">{totalSystemBalance.toLocaleString('ar-EG')}</td>
                <td className="py-3 px-2 font-mono">{totalActualBalance.toLocaleString('ar-EG')}</td>
                <td className={cn('py-3 px-2 font-mono', totalDifference === 0 ? 'text-emerald-400' : 'text-red-400')}>
                  {totalDifference >= 0 ? '+' : ''}{totalDifference.toLocaleString('ar-EG')}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 4: Pending Operations */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6">
        <h2 className="text-lg font-semibold mb-4">العمليات المعلقة وقيد التحصيل</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl bg-white/[0.04] p-4 border border-white/[0.06]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-medium">العمليات المعلقة</span>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                {pendingTransactions.length}
              </span>
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {pendingTransactions.length === 0 ? (
                <p className="text-xs text-gray-500 py-2">لا توجد عمليات معلقة</p>
              ) : (
                pendingTransactions.slice(0, 5).map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between text-xs text-gray-400 py-1">
                    <span className="truncate">{tx.description || 'عملية'}</span>
                    <span className="font-mono">{tx.amount.toLocaleString('ar-EG')} ج.م</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-xl bg-white/[0.04] p-4 border border-white/[0.06]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium">التحويلات التي لم تصل</span>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                {pendingTransfers.length}
              </span>
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {pendingTransfers.length === 0 ? (
                <p className="text-xs text-gray-500 py-2">لا توجد تحويلات معلقة</p>
              ) : (
                pendingTransfers.slice(0, 5).map((tr) => (
                  <div key={tr.id} className="flex items-center justify-between text-xs text-gray-400 py-1">
                    <span className="truncate">{tr.transfer_number}</span>
                    <span className="font-mono">{tr.total_items} أصناف</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-xl bg-white/[0.04] p-4 border border-white/[0.06]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-orange-400" />
                <span className="text-sm font-medium">التحصيلات المؤجلة</span>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30">
                {delayedTransactions.length}
              </span>
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {delayedTransactions.length === 0 ? (
                <p className="text-xs text-gray-500 py-2">لا توجد تحصيلات مؤجلة</p>
              ) : (
                delayedTransactions.slice(0, 5).map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between text-xs text-gray-400 py-1">
                    <span className="truncate">{tx.description || 'تحصيل'}</span>
                    <span className="font-mono">{tx.amount.toLocaleString('ar-EG')} ج.م</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Section 5: Mismatch Alerts */}
      {session && totalDifference !== 0 && session.status !== 'completed' && (
        <div className="rounded-2xl bg-red-500/10 border border-red-500/30 p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-400 mb-2">⚠️ وجود فروقات في المطابقة!</h3>
              <p className="text-sm text-red-300 mb-3">
                إجمالي الفروقات: {totalDifference.toLocaleString('ar-EG')} ج.م
              </p>
              <div className="space-y-1 mb-4">
                {accounts.map((account) => {
                  const diff = getAccountDiff(account.id);
                  if (diff === 0) return null;
                  return (
                    <div key={account.id} className="flex items-center justify-between text-sm text-red-300 py-1">
                      <span>{account.name_ar}</span>
                      <span className="font-mono">{diff >= 0 ? '+' : ''}{diff.toLocaleString('ar-EG')} ج.م</span>
                    </div>
                  );
                })}
              </div>
              <button
                onClick={() => {
                  setSettleAmount(Math.abs(totalDifference).toString());
                  setShowSettleModal(true);
                }}
                className="px-4 py-2 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors text-sm font-medium"
              >
                تسوية الفروقات
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-white/[0.04] w-fit">
        {(['overview', 'discrepancies', 'log'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm transition-colors',
              activeTab === tab
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'text-gray-400 hover:text-gray-300',
            )}
          >
            {tab === 'overview' ? 'نظرة عامة' : tab === 'discrepancies' ? 'الفروقات' : 'سجل النشاط'}
          </button>
        ))}
      </div>

      {/* Section 7: Discrepancies Tab */}
      {activeTab === 'discrepancies' && (
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6">
          <h2 className="text-lg font-semibold mb-4">سجل الفروقات</h2>
          {discrepancies.length === 0 ? (
            <div className="text-center py-8 text-gray-500">لا توجد فروقات مسجلة</div>
          ) : (
            <div className="space-y-2">
              {discrepancies.map((disc) => (
                <div key={disc.id} className="flex flex-wrap items-center justify-between p-4 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] transition-colors gap-3">
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      'text-xs px-2 py-0.5 rounded-full border',
                      disc.type === 'treasury' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                      disc.type === 'inventory' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                      disc.type === 'transfer' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                      'bg-orange-500/20 text-orange-400 border-orange-500/30',
                    )}>
                      {DISCREPANCY_TYPE_LABELS[disc.type] || disc.type}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{disc.source_name}</p>
                      <p className="text-xs text-gray-500">
                        النظام: {disc.system_value.toLocaleString('ar-EG')} | الفعلي: {disc.actual_value.toLocaleString('ar-EG')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-red-400 font-mono">
                      {disc.difference >= 0 ? '+' : ''}{disc.difference.toLocaleString('ar-EG')}
                    </span>
                    <span className={cn(
                      'text-xs px-2 py-0.5 rounded-full border',
                      disc.resolved
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        : 'bg-red-500/20 text-red-400 border-red-500/30',
                    )}>
                      {disc.resolved ? 'تم الحل' : 'مفتوح'}
                    </span>
                    {!disc.resolved && session && session.status !== 'completed' && (
                      <button
                        onClick={() => handleResolveDiscrepancy(disc.id)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors text-xs"
                      >
                        حل
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Section 8: Activity Log Tab */}
      {activeTab === 'log' && (
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6">
          <h2 className="text-lg font-semibold mb-4">سجل النشاط</h2>
          {logs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">لا توجد نشاطات مسجلة</div>
          ) : (
            <div className="space-y-0">
              {logs.map((log, idx) => (
                <div key={log.id} className="flex gap-4 pb-4 relative">
                  {idx < logs.length - 1 && (
                    <div className="absolute right-[11px] top-6 bottom-0 w-0.5 bg-white/[0.06]" />
                  )}
                  <div className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5',
                    log.action === 'started' ? 'bg-blue-500/20 text-blue-400' :
                    log.action === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                    log.action === 'settlement_recorded' ? 'bg-amber-500/20 text-amber-400' :
                    log.action === 'discrepancy_found' ? 'bg-red-500/20 text-red-400' :
                    log.action === 'discrepancy_resolved' ? 'bg-emerald-500/20 text-emerald-400' :
                    'bg-gray-500/20 text-gray-400',
                  )}>
                    <div className="w-2 h-2 rounded-full bg-current" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {SESSION_ACTION_LABELS[log.action] || log.action}
                    </p>
                    <p className="text-xs text-gray-400">{log.description}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {log.performed_by_name && `${log.performed_by_name} • `}
                      {new Date(log.created_at).toLocaleString('ar-EG')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Section 9: Complete Session Button */}
      {session && session.status !== 'completed' && (
        <div className="rounded-2xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold">إتمام المطابقة اليومية</h3>
              <p className="text-sm text-gray-400 mt-1">
                بعد التأكد من صحة جميع الأرصدة، قم بإتمام جلسة المطابقة
              </p>
            </div>
            <button
              onClick={handleCompleteSession}
              className="px-6 py-3 rounded-xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors font-medium flex items-center gap-2"
            >
              <CheckCircle className="w-5 h-5" />
              إتمام المطابقة
            </button>
          </div>
        </div>
      )}

      {/* Section 6: Settlement Modal */}
      {showSettleModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl bg-[#111114] border border-white/[0.08] p-6 space-y-4">
            <h3 className="text-lg font-semibold">تسوية الفروقات</h3>

            <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4">
              <p className="text-sm text-red-400">
                إجمالي الفروقات المطلوب تسويتها:
              </p>
              <p className="text-2xl font-bold text-red-400 mt-1 font-mono">
                {Math.abs(totalDifference).toLocaleString('ar-EG')} ج.م
              </p>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1.5">مبلغ التسوية</label>
              <input
                type="number"
                value={settleAmount}
                onChange={(e) => setSettleAmount(e.target.value)}
                placeholder="مبلغ التسوية"
                className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm outline-none focus:border-emerald-500/50"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1.5">ملاحظات / سبب التسوية</label>
              <textarea
                value={settleReason}
                onChange={(e) => setSettleReason(e.target.value)}
                placeholder="أدخل ملاحظات التسوية..."
                rows={3}
                className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm outline-none focus:border-emerald-500/50 resize-none"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowSettleModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/[0.06] text-sm hover:bg-white/[0.1] transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={handleSettle}
                disabled={loading || !settleAmount}
                className="flex-1 py-2.5 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors text-sm font-medium disabled:opacity-50"
              >
                {loading ? 'جاري...' : 'تسجيل التسوية في السجل'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
