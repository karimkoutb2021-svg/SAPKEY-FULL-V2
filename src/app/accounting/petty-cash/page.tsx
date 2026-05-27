'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BackButton } from '@/components/layout/back-button';
import { formatCurrency, formatDate } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store/auth-store';
import {
  Plus, Search, Wallet, Check, X,
  Clock, FileText, Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';

const supabase = createClient();

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: 'قيد الانتظار', color: 'bg-amber-100 text-amber-800', icon: Clock },
  approved: { label: 'معتمد', color: 'bg-emerald-100 text-emerald-800', icon: Check },
  rejected: { label: 'مرفوض', color: 'bg-red-100 text-red-800', icon: X },
};

const PETTY_ACCOUNTS = [
  { id: 'p1', name: 'مشروبات موظفين' },
  { id: 'p2', name: 'أدوات تنظيف طارئة' },
  { id: 'p3', name: 'مواصلات' },
  { id: 'p4', name: 'طوارئ' },
];

interface PettyEntry {
  id: string; date: string; description: string; amount: number;
  account_id: string; paid_by: string; status: string;
  approved_by: string | null; approved_at: string | null;
}

export default function PettyCashPage() {
  const [entries, setEntries] = useState<PettyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEntry, setNewEntry] = useState({ description: '', amount: '', accountId: 'p1' });
  const auth = useAuthStore();

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    const ch = supabase.channel('acct-petty_cash_entries')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'petty_cash_entries' }, () => {
        loadData();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  async function loadData() {
    try {
      const { data } = await supabase.from('petty_cash_entries').select('*').order('created_at', { ascending: false });
      if (data) setEntries(data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }

  const filtered = entries.filter((e) => {
    const ms = !search || (e.description || '').includes(search);
    const mst = !statusFilter || e.status === statusFilter;
    return ms && mst;
  });

  const totalPending = entries.filter((e) => e.status === 'pending').reduce((s, e) => s + e.amount, 0);
  const totalApproved = entries.filter((e) => e.status === 'approved').reduce((s, e) => s + e.amount, 0);
  const totalRejected = entries.filter((e) => e.status === 'rejected').reduce((s, e) => s + e.amount, 0);

  const handleAdd = async () => {
    if (!newEntry.description || !newEntry.amount) return;
    try {
      const { error } = await supabase.from('petty_cash_entries').insert({
        description: newEntry.description,
        amount: parseFloat(newEntry.amount),
        account_id: newEntry.accountId,
        paid_by: auth.user?.nameAr || auth.user?.name || 'غير معروف',
        status: 'pending',
      });
      if (error) { toast.error(error.message); return; }
      toast.success('تم إضافة المصروف النثري');
      setShowAddModal(false);
      setNewEntry({ description: '', amount: '', accountId: 'p1' });
      loadData();
    } catch { toast.error('فشل الإضافة'); }
  };

  const handleApprove = async (id: string) => {
    try {
      const { error } = await supabase.from('petty_cash_entries').update({
        status: 'approved',
        approved_by: auth.user?.nameAr || auth.user?.name || 'غير معروف',
        approved_at: new Date().toISOString(),
      }).eq('id', id);
      if (error) { toast.error(error.message); return; }
      toast.success('تم اعتماد المصروف النثري');
      loadData();
    } catch { toast.error('فشل الاعتماد'); }
  };

  const handleReject = async (id: string) => {
    try {
      const { error } = await supabase.from('petty_cash_entries').update({
        status: 'rejected',
        approved_by: auth.user?.nameAr || auth.user?.name || 'غير معروف',
        approved_at: new Date().toISOString(),
      }).eq('id', id);
      if (error) { toast.error(error.message); return; }
      toast.success('تم رفض المصروف النثري');
      loadData();
    } catch { toast.error('فشل الرفض'); }
  };

  const canApprove = auth.isRole(['admin', 'manager', 'accountant']);

  return (
    <div dir="rtl" className="space-y-4 pb-8 px-2 md:px-4">
      <div className="flex items-center flex-wrap gap-2 justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-amber-500" />
            <BackButton href="/accounting" label="المحاسبة" />
            <h1 className="text-lg md:text-2xl font-bold">المصروفات النثرية</h1>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground">إدارة المصروفات الصغيرة والطارئة</p>
        </div>
        <button onClick={() => setShowAddModal(true)}
          className="h-8 md:h-9 px-2.5 md:px-3 rounded-lg text-white text-[10px] md:text-xs flex items-center gap-1"
          style={{ backgroundColor: 'var(--primary, #22C55E)' }}>
          <Plus className="h-3 w-3 md:h-3.5 md:w-3.5" /> مصروف جديد
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
            <Card className="shadow-sm"><CardContent className="p-3 md:p-4"><div className="flex items-center gap-2"><Clock className="h-4 w-4 text-amber-500" /><div><p className="text-[9px] text-gray-500">قيد الانتظار</p><p className="text-xs md:text-sm font-bold text-amber-600 tabular-nums">{formatCurrency(totalPending)}</p></div></div></CardContent></Card>
            <Card className="shadow-sm"><CardContent className="p-3 md:p-4"><div className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500" /><div><p className="text-[9px] text-gray-500">معتمد</p><p className="text-xs md:text-sm font-bold text-emerald-600 tabular-nums">{formatCurrency(totalApproved)}</p></div></div></CardContent></Card>
            <Card className="shadow-sm"><CardContent className="p-3 md:p-4"><div className="flex items-center gap-2"><X className="h-4 w-4 text-red-500" /><div><p className="text-[9px] text-gray-500">مرفوض</p><p className="text-xs md:text-sm font-bold text-red-600 tabular-nums">{formatCurrency(totalRejected)}</p></div></div></CardContent></Card>
            <Card className="shadow-sm"><CardContent className="p-3 md:p-4"><div className="flex items-center gap-2"><FileText className="h-4 w-4 text-blue-500" /><div><p className="text-[9px] text-gray-500">إجمالي الطلبات</p><p className="text-xs md:text-sm font-bold text-blue-600">{entries.length}</p></div></div></CardContent></Card>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input type="text" placeholder="بحث..." value={search} onChange={(e) => setSearch(e.target.value)}
                className="w-full h-8 md:h-9 pr-9 pl-3 rounded-lg border text-xs" />
            </div>
            <div className="flex items-center gap-1">
              {[
                { key: null, label: 'الكل' }, { key: 'pending', label: 'قيد الانتظار' },
                { key: 'approved', label: 'معتمد' }, { key: 'rejected', label: 'مرفوض' },
              ].map((opt) => (
                <button key={opt.key || 'all'} onClick={() => setStatusFilter(opt.key)}
                  className={`h-7 px-2.5 rounded-lg text-[10px] font-medium transition-all ${statusFilter === opt.key ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>{opt.label}</button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            {filtered.map((entry) => {
              const status = statusConfig[entry.status] || statusConfig.pending;
              const StatusIcon = status.icon;
              const account = PETTY_ACCOUNTS.find((a) => a.id === entry.account_id);
              return (
                <motion.div key={entry.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-xl border p-3 md:p-4 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 md:gap-2 mb-0.5 md:mb-1">
                        <Wallet className="h-3 w-3 md:h-4 md:w-4 text-amber-500 shrink-0" />
                        <p className="text-[10px] md:text-xs font-bold truncate">{entry.description}</p>
                      </div>
                      <div className="flex items-center gap-1.5 md:gap-3 text-[9px] md:text-xs text-muted-foreground flex-wrap">
                        <span>{formatDate(new Date(entry.date))}</span>
                        <span>•</span>
                        <span>بواسطة: {entry.paid_by}</span>
                        {account && <><span>•</span><span>الحساب: {account.name}</span></>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
                      <span className="text-xs md:text-sm font-bold tabular-nums">{formatCurrency(entry.amount)}</span>
                      <Badge className={`${status.color} border-0 text-[9px] md:text-xs`}>
                        <StatusIcon className="h-2.5 w-2.5 md:h-3 md:w-3 ml-0.5" />
                        {status.label}
                      </Badge>
                    </div>
                  </div>
                  {canApprove && entry.status === 'pending' && (
                    <div className="flex items-center gap-1.5 md:gap-2 mt-2 md:mt-3 pt-2 md:pt-3 border-t">
                      <button onClick={() => handleApprove(entry.id)}
                        className="h-7 px-2.5 md:px-3 rounded-lg bg-emerald-50 text-emerald-600 text-[10px] font-medium hover:bg-emerald-100 transition-all flex items-center gap-1">
                        <Check className="h-3 w-3" /> اعتماد
                      </button>
                      <button onClick={() => handleReject(entry.id)}
                        className="h-7 px-2.5 md:px-3 rounded-lg bg-red-50 text-red-600 text-[10px] font-medium hover:bg-red-100 transition-all flex items-center gap-1">
                        <X className="h-3 w-3" /> رفض
                      </button>
                    </div>
                  )}
                </motion.div>
              );
            })}
            {filtered.length === 0 && (
              <div className="text-center py-12 text-gray-400 text-xs">لا توجد مصروفات نثرية</div>
            )}
          </div>
        </>
      )}

      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowAddModal(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl border" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold">إضافة مصروف نثري</h3>
                <button onClick={() => setShowAddModal(false)}><X className="h-4 w-4 text-gray-400" /></button>
              </div>
              <div className="space-y-3">
                <div><label className="text-[10px] font-medium text-gray-500 block mb-1">الوصف</label>
                  <input type="text" value={newEntry.description} onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })}
                    className="w-full h-9 rounded-lg border text-xs px-3" placeholder="وصف المصروف" /></div>
                <div><label className="text-[10px] font-medium text-gray-500 block mb-1">المبلغ (ج.م)</label>
                  <input type="number" value={newEntry.amount} onChange={(e) => setNewEntry({ ...newEntry, amount: e.target.value })}
                    className="w-full h-9 rounded-lg border text-xs px-3" placeholder="0.00" /></div>
                <div><label className="text-[10px] font-medium text-gray-500 block mb-1">الحساب</label>
                  <select value={newEntry.accountId} onChange={(e) => setNewEntry({ ...newEntry, accountId: e.target.value })}
                    className="w-full h-9 rounded-lg border text-xs px-3">
                    {PETTY_ACCOUNTS.map((a) => (<option key={a.id} value={a.id}>{a.name}</option>))}
                  </select></div>
                <div className="flex gap-2 pt-2">
                  <button onClick={() => setShowAddModal(false)}
                    className="flex-1 h-9 rounded-lg border text-gray-500 text-xs font-medium hover:bg-gray-50 transition-all">إلغاء</button>
                  <button onClick={handleAdd}
                    className="flex-1 h-9 rounded-lg text-white text-xs font-medium shadow-lg"
                    style={{ backgroundColor: 'var(--primary, #22C55E)' }}>إضافة</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
