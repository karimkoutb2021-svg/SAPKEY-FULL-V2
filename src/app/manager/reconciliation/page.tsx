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
      <div className="rounded-[2rem] bg-[#111114]/90 backdrop-blur-3xl border border-white/[0.06] p-8 shadow-2xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center border border-emerald-500/30 shadow-lg shadow-emerald-500/10">
              <CheckCircle className="w-7 h-7 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">المطابقة اليومية</h1>
              <p className="text-sm font-medium text-gray-400 mt-1">
                {new Date().toLocaleDateString('ar-EG', {
                  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {session && (
              <span className={cn(
                'text-sm font-bold px-4 py-2 rounded-xl border shadow-lg',
                STATUS_CONFIG[session.status]?.color || 'bg-gray-500/20 text-gray-400 border-gray-500/30',
              )}>
                {STATUS_CONFIG[session.status]?.label || session.status}
              </span>
            )}
            {!session ? (
              <button
                onClick={handleStartSession}
                className="px-6 py-3 rounded-xl bg-gradient-to-l from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-lg shadow-emerald-500/25 transition-all text-sm font-bold"
              >
                بدء جلسة مطابقة جديدة
              </button>
            ) : session.status === 'completed' ? (
              <span className="text-sm font-bold text-gray-400 flex items-center gap-2 bg-white/[0.04] px-4 py-2 rounded-xl border border-white/[0.06]">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                اكتملت المطابقة لهذا اليوم
              </span>
            ) : (
              <button
                onClick={handleReopenSession}
                className="px-6 py-3 rounded-xl bg-gradient-to-l from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white shadow-lg shadow-amber-500/25 transition-all text-sm font-bold"
              >
                استئناف / إعادة فتح
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Section 2: Main Reconciliation Formula */}
      <div className="rounded-[2rem] bg-gradient-to-br from-[#111114] to-[#1A1A1F] border border-white/[0.06] p-8 shadow-2xl relative overflow-hidden">
        <h2 className="text-xl font-black text-white mb-6">معادلة المطابقة</h2>
        <div className="space-y-4 font-mono text-lg">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-colors">
            <span className="text-gray-400 font-bold">الرصيد الدفتري للنظام:</span>
            <span className="font-black text-white">{totalSystemBalance.toLocaleString('ar-EG')} <span className="text-sm text-gray-500 font-normal">ج.م</span></span>
          </div>
          <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-colors">
            <span className="text-gray-400 font-bold">الرصيد الفعلي (يدوياً):</span>
            <input
              type="text"
              value={totalActualBalance.toLocaleString('ar-EG')}
              readOnly
              className="bg-transparent text-left font-black text-white w-48 outline-none"
            />
          </div>
          <div className="border-t border-white/[0.08] my-4" />
          <div className={cn(
            'flex items-center justify-between p-5 rounded-2xl font-bold border shadow-xl',
            totalDifference === 0
              ? 'bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-gradient-to-br from-red-500/20 to-rose-500/10 border-red-500/30 text-red-400',
          )}>
            <span className="text-lg">الفرق:</span>
            <span className="text-2xl font-black flex items-center gap-3">
              {totalDifference >= 0 ? '+' : ''}{totalDifference.toLocaleString('ar-EG')} <span className="text-sm opacity-60">ج.م</span>
              {totalDifference === 0 ? (
                <CheckCircle className="w-8 h-8 text-emerald-400" />
              ) : (
                <XCircle className="w-8 h-8 text-red-400" />
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Section 3: Account-by-Account Table */}
      <div className="rounded-[2rem] bg-[#111114]/90 backdrop-blur-3xl border border-white/[0.06] p-8 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-black text-white">أرصدة الحسابات</h2>
          {session && session.status !== 'completed' && (
            <button
              onClick={handleSaveBalances}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-l from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-lg shadow-emerald-500/25 transition-all text-sm font-bold flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              حفظ الأرصدة
            </button>
          )}
        </div>
        <div className="overflow-x-auto -mx-8 px-8">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-gray-400">
                <th className="text-right py-4 px-4 font-bold">الحساب</th>
                <th className="text-right py-4 px-4 font-bold">الرصيد الدفتري</th>
                <th className="text-right py-4 px-4 font-bold">الرصيد الفعلي يدوياً</th>
                <th className="text-right py-4 px-4 font-bold">الفرق</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => {
                const diff = getAccountDiff(account.id);
                const actual = parseFloat(actualBalances[account.id]) || 0;
                return (
                  <tr key={account.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors group">
                    <td className="py-4 px-4 font-bold text-white">{account.name_ar}</td>
                    <td className="py-4 px-4 text-gray-300 font-mono text-base">
                      {account.current_balance.toLocaleString('ar-EG')}
                    </td>
                    <td className="py-4 px-4">
                      {session && session.status !== 'completed' ? (
                        <input
                          type="number"
                          value={actualBalances[account.id] || ''}
                          onChange={(e) => setActualBalances((prev) => ({ ...prev, [account.id]: e.target.value }))}
                          className="w-32 px-4 py-2 rounded-xl bg-white/[0.02] border border-white/[0.08] text-sm text-left font-mono font-bold text-white outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all"
                        />
                      ) : (
                        <span className="font-mono font-bold text-white text-base">{actual.toLocaleString('ar-EG')}</span>
                      )}
                    </td>
                    <td className={cn(
                      'py-4 px-4 font-mono font-black text-base',
                      diff === 0 ? 'text-emerald-400' : 'text-red-400',
                    )}>
                      {diff >= 0 ? '+' : ''}{diff.toLocaleString('ar-EG')}
                    </td>
                  </tr>
                );
              })}
              <tr className="border-t border-white/[0.08] font-bold bg-white/[0.02]">
                <td className="py-4 px-4 text-white">الإجمالي</td>
                <td className="py-4 px-4 font-mono text-base text-gray-300">{totalSystemBalance.toLocaleString('ar-EG')}</td>
                <td className="py-4 px-4 font-mono text-base text-white">{totalActualBalance.toLocaleString('ar-EG')}</td>
                <td className={cn('py-4 px-4 font-mono text-base', totalDifference === 0 ? 'text-emerald-400' : 'text-red-400')}>
                  {totalDifference >= 0 ? '+' : ''}{totalDifference.toLocaleString('ar-EG')}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 4: Pending Operations */}
      <div className="rounded-[2rem] bg-[#111114]/90 backdrop-blur-3xl border border-white/[0.06] p-8 shadow-2xl">
        <h2 className="text-xl font-black text-white mb-6">العمليات المعلقة وقيد التحصيل</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl bg-white/[0.02] p-5 border border-white/[0.04] hover:bg-white/[0.04] transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                  <Clock className="w-5 h-5 text-amber-400" />
                </div>
                <span className="font-bold text-gray-300">العمليات المعلقة</span>
              </div>
              <span className="text-sm font-black px-3 py-1 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                {pendingTransactions.length}
              </span>
            </div>
            <div className="space-y-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
              {pendingTransactions.length === 0 ? (
                <p className="text-sm text-gray-500 py-2">لا توجد عمليات معلقة</p>
              ) : (
                pendingTransactions.slice(0, 5).map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between text-sm py-1.5 border-b border-white/[0.04] last:border-0">
                    <span className="text-gray-400 truncate max-w-[120px]">{tx.description || 'عملية'}</span>
                    <span className="font-mono font-bold text-amber-400/80">{tx.amount.toLocaleString('ar-EG')} ج.م</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl bg-white/[0.02] p-5 border border-white/[0.04] hover:bg-white/[0.04] transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                  <ArrowRightLeft className="w-5 h-5 text-blue-400" />
                </div>
                <span className="font-bold text-gray-300">التحويلات العالقة</span>
              </div>
              <span className="text-sm font-black px-3 py-1 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
                {pendingTransfers.length}
              </span>
            </div>
            <div className="space-y-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
              {pendingTransfers.length === 0 ? (
                <p className="text-sm text-gray-500 py-2">لا توجد تحويلات معلقة</p>
              ) : (
                pendingTransfers.slice(0, 5).map((tr) => (
                  <div key={tr.id} className="flex items-center justify-between text-sm py-1.5 border-b border-white/[0.04] last:border-0">
                    <span className="text-gray-400 truncate max-w-[120px]">{tr.transfer_number}</span>
                    <span className="font-mono font-bold text-blue-400/80">{tr.total_items} أصناف</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl bg-white/[0.02] p-5 border border-white/[0.04] hover:bg-white/[0.04] transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                  <Wallet className="w-5 h-5 text-orange-400" />
                </div>
                <span className="font-bold text-gray-300">التحصيلات المؤجلة</span>
              </div>
              <span className="text-sm font-black px-3 py-1 rounded-lg bg-orange-500/20 text-orange-400 border border-orange-500/30">
                {delayedTransactions.length}
              </span>
            </div>
            <div className="space-y-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
              {delayedTransactions.length === 0 ? (
                <p className="text-sm text-gray-500 py-2">لا توجد تحصيلات مؤجلة</p>
              ) : (
                delayedTransactions.slice(0, 5).map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between text-sm py-1.5 border-b border-white/[0.04] last:border-0">
                    <span className="text-gray-400 truncate max-w-[120px]">{tx.description || 'تحصيل'}</span>
                    <span className="font-mono font-bold text-orange-400/80">{tx.amount.toLocaleString('ar-EG')} ج.م</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Section 5: Mismatch Alerts */}
      {session && totalDifference !== 0 && session.status !== 'completed' && (
        <div className="rounded-[2rem] bg-gradient-to-br from-red-500/10 to-rose-500/5 border border-red-500/30 p-8 shadow-2xl shadow-red-500/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
             <AlertTriangle className="w-48 h-48 text-red-500" />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row items-start gap-6">
            <div className="w-16 h-16 rounded-2xl bg-red-500/20 flex items-center justify-center border border-red-500/30 shrink-0 shadow-lg shadow-red-500/20">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-black text-red-400 mb-2">تنبيه: وجود فروقات في المطابقة!</h3>
              <p className="text-lg font-bold text-red-300 mb-4">
                إجمالي الفروقات: {totalDifference.toLocaleString('ar-EG')} ج.م
              </p>
              <div className="space-y-2 mb-6 max-w-md bg-black/20 p-4 rounded-2xl border border-red-500/20">
                {accounts.map((account) => {
                  const diff = getAccountDiff(account.id);
                  if (diff === 0) return null;
                  return (
                    <div key={account.id} className="flex items-center justify-between text-sm font-bold text-red-300 py-1.5 border-b border-red-500/10 last:border-0">
                      <span>{account.name_ar}</span>
                      <span className="font-mono text-base">{diff >= 0 ? '+' : ''}{diff.toLocaleString('ar-EG')} ج.م</span>
                    </div>
                  );
                })}
              </div>
              <button
                onClick={() => {
                  setSettleAmount(Math.abs(totalDifference).toString());
                  setShowSettleModal(true);
                }}
                className="px-6 py-3 rounded-xl bg-gradient-to-l from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white shadow-lg shadow-red-500/25 transition-all text-sm font-bold"
              >
                تسوية الفروقات الآن
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 p-1.5 rounded-2xl bg-white/[0.02] border border-white/[0.04] w-fit">
        {(['overview', 'discrepancies', 'log'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300',
              activeTab === tab
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                : 'text-gray-400 hover:text-white hover:bg-white/[0.04]',
            )}
          >
            {tab === 'overview' ? 'نظرة عامة' : tab === 'discrepancies' ? 'الفروقات' : 'سجل النشاط'}
          </button>
        ))}
      </div>

      {/* Section 7: Discrepancies Tab */}
      {activeTab === 'discrepancies' && (
        <div className="rounded-[2rem] bg-[#111114]/90 backdrop-blur-3xl border border-white/[0.06] p-8 shadow-2xl">
          <h2 className="text-xl font-black text-white mb-6">سجل الفروقات</h2>
          {discrepancies.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500">
              <span className="text-5xl mb-4">✨</span>
              <p className="text-lg font-bold text-white mb-2">لا توجد فروقات مسجلة</p>
              <p className="text-sm">الأرصدة متطابقة بالكامل ولا توجد أي ملاحظات</p>
            </div>
          ) : (
            <div className="space-y-4">
              {discrepancies.map((disc) => (
                <div key={disc.id} className="flex flex-wrap items-center justify-between p-5 rounded-2xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-colors gap-4">
                  <div className="flex items-center gap-4">
                    <span className={cn(
                      'text-sm font-bold px-4 py-1.5 rounded-xl border',
                      disc.type === 'treasury' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shadow-emerald-500/10' :
                      disc.type === 'inventory' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30 shadow-blue-500/10' :
                      disc.type === 'transfer' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30 shadow-amber-500/10' :
                      'bg-orange-500/20 text-orange-400 border-orange-500/30 shadow-orange-500/10',
                    )}>
                      {DISCREPANCY_TYPE_LABELS[disc.type] || disc.type}
                    </span>
                    <div>
                      <p className="text-base font-bold text-white">{disc.source_name}</p>
                      <p className="text-sm font-medium text-gray-400 mt-1">
                        النظام: <span className="font-mono text-gray-300">{disc.system_value.toLocaleString('ar-EG')}</span> | الفعلي: <span className="font-mono text-gray-300">{disc.actual_value.toLocaleString('ar-EG')}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-lg font-black text-red-400 font-mono">
                      {disc.difference >= 0 ? '+' : ''}{disc.difference.toLocaleString('ar-EG')}
                    </span>
                    <span className={cn(
                      'text-xs font-bold px-3 py-1.5 rounded-lg border',
                      disc.resolved
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        : 'bg-red-500/20 text-red-400 border-red-500/30 animate-pulse',
                    )}>
                      {disc.resolved ? 'تم الحل' : 'مفتوح'}
                    </span>
                    {!disc.resolved && session && session.status !== 'completed' && (
                      <button
                        onClick={() => handleResolveDiscrepancy(disc.id)}
                        className="px-4 py-2 rounded-xl bg-gradient-to-l from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-lg shadow-emerald-500/25 transition-all text-xs font-bold"
                      >
                        حل الفرق
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
        <div className="rounded-[2rem] bg-[#111114]/90 backdrop-blur-3xl border border-white/[0.06] p-8 shadow-2xl">
          <h2 className="text-xl font-black text-white mb-6">سجل النشاط والتعديلات</h2>
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500">
              <span className="text-5xl mb-4">📝</span>
              <p className="text-lg font-bold text-white mb-2">لا توجد نشاطات مسجلة</p>
            </div>
          ) : (
            <div className="space-y-0 pl-2">
              {logs.map((log, idx) => (
                <div key={log.id} className="flex gap-6 pb-6 relative">
                  {idx < logs.length - 1 && (
                    <div className="absolute right-[15px] top-8 bottom-0 w-0.5 bg-white/[0.06]" />
                  )}
                  <div className={cn(
                    'w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border shadow-lg z-10',
                    log.action === 'started' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                    log.action === 'completed' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                    log.action === 'settlement_recorded' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                    log.action === 'discrepancy_found' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                    log.action === 'discrepancy_resolved' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                    'bg-gray-500/20 text-gray-400 border-gray-500/30',
                  )}>
                    <div className="w-2 h-2 rounded-full bg-current" />
                  </div>
                  <div className="flex-1 bg-white/[0.02] border border-white/[0.04] p-4 rounded-2xl hover:bg-white/[0.04] transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-base font-bold text-white">
                        {SESSION_ACTION_LABELS[log.action] || log.action}
                      </p>
                      <p className="text-xs font-mono text-gray-500 bg-[#111114] px-2 py-1 rounded-lg border border-white/[0.04]">
                        {new Date(log.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <p className="text-sm text-gray-400 font-medium mb-3">{log.description}</p>
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                      <span className="w-5 h-5 rounded-full bg-white/[0.06] flex items-center justify-center">🧑‍💻</span>
                      {log.performed_by_name || 'مدير النظام'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Section 9: Complete Session Button */}
      {session && session.status !== 'completed' && (
        <div className="rounded-[2rem] bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border border-emerald-500/20 p-8 shadow-2xl shadow-emerald-500/10 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-l from-emerald-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-6">
            <div>
              <h3 className="text-2xl font-black text-emerald-400 mb-2">إتمام المطابقة اليومية</h3>
              <p className="text-base font-medium text-emerald-300/80">
                بعد التأكد من صحة جميع الأرصدة ومعالجة الفروقات، يمكنك إغلاق جلسة المطابقة
              </p>
            </div>
            <button
              onClick={handleCompleteSession}
              className="px-8 py-4 rounded-2xl bg-gradient-to-l from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-xl shadow-emerald-500/25 transition-all font-black text-lg flex items-center gap-3 hover:-translate-y-1"
            >
              <CheckCircle className="w-6 h-6" />
              تأكيد وإتمام المطابقة
            </button>
          </div>
        </div>
      )}

      {/* Section 6: Settlement Modal */}
      {showSettleModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A0A0C]/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-[2rem] bg-[#111114]/95 backdrop-blur-3xl border border-white/[0.08] p-8 shadow-2xl shadow-emerald-500/10 space-y-6" dir="rtl">
            <div>
              <h3 className="text-2xl font-black text-white mb-2">تسوية الفروقات يدوياً</h3>
              <p className="text-sm font-medium text-gray-400">قم بتسجيل التسوية مع توضيح السبب لإغلاق الفروقات</p>
            </div>

            <div className="rounded-2xl bg-gradient-to-br from-red-500/10 to-rose-500/5 border border-red-500/20 p-5">
              <p className="text-sm font-bold text-red-400 mb-1">
                إجمالي الفروقات المطلوب تسويتها:
              </p>
              <p className="text-3xl font-black text-red-400 font-mono">
                {Math.abs(totalDifference).toLocaleString('ar-EG')} <span className="text-sm opacity-70">ج.م</span>
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-300">مبلغ التسوية الفعلي</label>
                <div className="relative">
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">ج.م</span>
                  <input
                    type="number"
                    value={settleAmount}
                    onChange={(e) => setSettleAmount(e.target.value)}
                    placeholder="مبلغ التسوية"
                    className="w-full pr-12 pl-4 py-4 rounded-2xl bg-white/[0.02] border border-white/[0.08] text-base font-mono font-bold text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-300">ملاحظات / سبب التسوية والتبرير</label>
                <textarea
                  value={settleReason}
                  onChange={(e) => setSettleReason(e.target.value)}
                  placeholder="أدخل ملاحظات التسوية بالتفصيل..."
                  rows={4}
                  className="w-full px-4 py-4 rounded-2xl bg-white/[0.02] border border-white/[0.08] text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setShowSettleModal(false)}
                className="flex-1 py-4 rounded-2xl bg-white/[0.04] border border-white/[0.04] text-gray-300 hover:text-white hover:bg-white/[0.08] transition-colors font-bold"
              >
                إلغاء التراجع
              </button>
              <button
                onClick={handleSettle}
                disabled={loading || !settleAmount}
                className="flex-[2] py-4 rounded-2xl bg-gradient-to-l from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-black shadow-lg shadow-red-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'جاري التنفيذ...' : 'تأكيد التسوية وحفظ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
