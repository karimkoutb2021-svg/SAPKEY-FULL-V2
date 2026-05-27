'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BackButton } from '@/components/layout/back-button';
import { formatCurrency, formatDate } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Plus, Search, Eye, X,
  TrendingUp, TrendingDown, CheckCircle, Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';

const supabase = createClient();

const typeConfig: Record<string, { label: string; color: string }> = {
  sales: { label: 'مبيعات', color: 'bg-emerald-100 text-emerald-800' },
  purchase: { label: 'مشتريات', color: 'bg-blue-100 text-blue-800' },
  salary: { label: 'رواتب', color: 'bg-purple-100 text-purple-800' },
  expense: { label: 'مصروف', color: 'bg-red-100 text-red-800' },
  payment: { label: 'دفعة', color: 'bg-amber-100 text-amber-800' },
  receipt: { label: 'قبض', color: 'bg-emerald-100 text-emerald-800' },
  transfer: { label: 'تحويل', color: 'bg-cyan-100 text-cyan-800' },
  adjustment: { label: 'تسوية', color: 'bg-orange-100 text-orange-800' },
  petty_cash: { label: 'نثري', color: 'bg-yellow-100 text-yellow-800' },
  other: { label: 'أخرى', color: 'bg-gray-100 text-gray-800' },
};

const statusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: 'مسودة', color: 'bg-gray-100 text-gray-800' },
  posted: { label: 'مرحل', color: 'bg-emerald-100 text-emerald-800' },
  cancelled: { label: 'ملغي', color: 'bg-red-100 text-red-800' },
};

interface JournalLine {
  account_id: string; account_name: string; debit: number; credit: number;
}

interface JournalEntry {
  id: string; entry_number: string; type: string; status: string;
  description_ar: string; entry_date: string; reference: string;
  created_by: string; lines: JournalLine[];
}

export default function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    const ch = supabase.channel('acct-journal_entries')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'journal_entries' }, () => {
        loadData();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  async function loadData() {
    try {
      const { data } = await supabase.from('journal_entries').select('*').order('entry_date', { ascending: false });
      if (data) setEntries(data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }

  const filtered = entries.filter((e) => {
    const ms = !search || (e.description_ar || '').includes(search) || (e.entry_number || '').includes(search);
    const mt = !typeFilter || e.type === typeFilter;
    const mst = !statusFilter || e.status === statusFilter;
    return ms && mt && mst;
  });

  const totalDebit = filtered.reduce((s, e) => s + (e.lines || []).reduce((sum, l) => sum + (l.debit || 0), 0), 0);
  const totalCredit = filtered.reduce((s, e) => s + (e.lines || []).reduce((sum, l) => sum + (l.credit || 0), 0), 0);

  const sel = selectedEntry ? entries.find((e) => e.id === selectedEntry) : null;

  return (
    <div dir="rtl" className="space-y-4 pb-8 px-2 md:px-4">
      <div className="flex items-center flex-wrap gap-2 justify-between">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <BackButton href="/accounting" label="المحاسبة" />
            <h1 className="text-lg md:text-2xl font-bold">قيود اليومية</h1>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground">تسجيل وإدارة القيود المحاسبية</p>
        </div>
        <button onClick={() => toast.success('يمكن إضافة قيد من خلال شجرة الحسابات')}
          className="h-8 md:h-9 px-2.5 md:px-3 rounded-lg text-white text-[10px] md:text-xs flex items-center gap-1"
          style={{ backgroundColor: 'var(--primary, #22C55E)' }}>
          <Plus className="h-3 w-3 md:h-3.5 md:w-3.5" /> قيد جديد
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
            <Card className="shadow-sm"><CardContent className="p-3 md:p-4"><div className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-blue-500" /><div><p className="text-[9px] md:text-xs text-muted-foreground">إجمالي القيود</p><p className="text-xs md:text-sm font-bold text-blue-600">{entries.length}</p></div></div></CardContent></Card>
            <Card className="shadow-sm"><CardContent className="p-3 md:p-4"><div className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-emerald-500" /><div><p className="text-[9px] md:text-xs text-muted-foreground">إجمالي المدين</p><p className="text-xs md:text-sm font-bold text-emerald-600 tabular-nums">{formatCurrency(totalDebit)}</p></div></div></CardContent></Card>
            <Card className="shadow-sm"><CardContent className="p-3 md:p-4"><div className="flex items-center gap-2"><TrendingDown className="h-4 w-4 text-red-500" /><div><p className="text-[9px] md:text-xs text-muted-foreground">إجمالي الدائن</p><p className="text-xs md:text-sm font-bold text-red-600 tabular-nums">{formatCurrency(totalCredit)}</p></div></div></CardContent></Card>
            <Card className="shadow-sm"><CardContent className="p-3 md:p-4"><div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-purple-500" /><div><p className="text-[9px] md:text-xs text-muted-foreground">الفرق</p><p className="text-xs md:text-sm font-bold text-purple-600 tabular-nums">{formatCurrency(totalDebit - totalCredit)}</p></div></div></CardContent></Card>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input type="text" placeholder="بحث..." value={search} onChange={(e) => setSearch(e.target.value)}
                className="w-full h-8 md:h-9 pr-9 pl-3 rounded-lg border text-xs" />
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              {[
                { key: null, label: 'الكل' }, { key: 'sales', label: 'مبيعات' },
                { key: 'purchase', label: 'مشتريات' }, { key: 'expense', label: 'مصروفات' },
                { key: 'petty_cash', label: 'نثري' },
              ].map((opt) => (
                <button key={opt.key || 'all'} onClick={() => setTypeFilter(opt.key)}
                  className={`h-7 px-2.5 rounded-lg text-[10px] font-medium transition-all ${typeFilter === opt.key ? 'bg-foreground text-background' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>{opt.label}</button>
              ))}
            </div>
            <div className="flex items-center gap-1">
              {[
                { key: null, label: 'الكل' }, { key: 'posted', label: 'مرحل' },
                { key: 'draft', label: 'مسودة' }, { key: 'cancelled', label: 'ملغي' },
              ].map((opt) => (
                <button key={opt.key || 'all'} onClick={() => setStatusFilter(opt.key)}
                  className={`h-7 px-2.5 rounded-lg text-[10px] font-medium transition-all ${statusFilter === opt.key ? 'bg-foreground text-background' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>{opt.label}</button>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border shadow-sm">
            <table className="w-full text-[10px] md:text-sm">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="text-right px-4 py-2.5 text-[10px] font-medium text-gray-500">الرقم</th>
                  <th className="text-right px-4 py-2.5 text-[10px] font-medium text-gray-500">التاريخ</th>
                  <th className="text-right px-4 py-2.5 text-[10px] font-medium text-gray-500">البيان</th>
                  <th className="text-center px-4 py-2.5 text-[10px] font-medium text-gray-500">النوع</th>
                  <th className="text-center px-4 py-2.5 text-[10px] font-medium text-gray-500">الحالة</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-medium text-gray-500">مدين</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-medium text-gray-500">دائن</th>
                  <th className="text-center px-4 py-2.5 text-[10px] font-medium text-gray-500">إجراء</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((entry) => {
                  const type = typeConfig[entry.type] || { label: entry.type, color: 'bg-gray-100 text-gray-800' };
                  const status = statusConfig[entry.status] || { label: entry.status, color: 'bg-gray-100 text-gray-800' };
                  const debit = (entry.lines || []).reduce((s, l) => s + (l.debit || 0), 0);
                  const credit = (entry.lines || []).reduce((s, l) => s + (l.credit || 0), 0);
                  return (
                    <motion.tr key={entry.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${entry.status === 'cancelled' ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-2.5"><code className="text-[10px] font-mono font-medium">{entry.entry_number}</code></td>
                      <td className="px-4 py-2.5 text-xs text-gray-500">{formatDate(new Date(entry.entry_date))}</td>
                      <td className="px-4 py-2.5 text-xs font-medium">{entry.description_ar}</td>
                      <td className="px-4 py-2.5 text-center"><Badge className={`${type.color} border-0 text-[9px]`}>{type.label}</Badge></td>
                      <td className="px-4 py-2.5 text-center"><Badge className={`${status.color} border-0 text-[9px]`}>{status.label}</Badge></td>
                      <td className="px-4 py-2.5 text-left text-xs font-medium text-emerald-600 tabular-nums">{debit > 0 ? formatCurrency(debit) : '-'}</td>
                      <td className="px-4 py-2.5 text-left text-xs font-medium text-red-600 tabular-nums">{credit > 0 ? formatCurrency(credit) : '-'}</td>
                      <td className="px-4 py-2.5 text-center">
                        <button onClick={() => setSelectedEntry(selectedEntry === entry.id ? null : entry.id)}
                          className="h-6 w-6 rounded-lg bg-gray-50 text-gray-400 hover:bg-gray-100 transition-all flex items-center justify-center mx-auto">
                          <Eye className="h-3 w-3" /></button>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 bg-gray-50">
                  <td colSpan={5} className="px-4 py-2.5 text-left text-xs font-bold">الإجمالي</td>
                  <td className="px-4 py-2.5 text-left text-xs font-bold text-emerald-600 tabular-nums">{formatCurrency(totalDebit)}</td>
                  <td className="px-4 py-2.5 text-left text-xs font-bold text-red-600 tabular-nums">{formatCurrency(totalCredit)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
            {filtered.length === 0 && <div className="text-center py-12 text-gray-400 text-xs">لا توجد قيود</div>}
          </div>
        </>
      )}

      <AnimatePresence>
        {sel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setSelectedEntry(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl p-6 max-w-lg w-full mx-4 shadow-2xl border max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold">قيد: {sel.entry_number}</h3>
                <button onClick={() => setSelectedEntry(null)}><X className="h-4 w-4 text-gray-400" /></button>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge className={`${(typeConfig[sel.type] || typeConfig.other).color} border-0 text-[10px]`}>{(typeConfig[sel.type] || typeConfig.other).label}</Badge>
                  <Badge className={`${(statusConfig[sel.status] || statusConfig.draft).color} border-0 text-[10px]`}>{(statusConfig[sel.status] || statusConfig.draft).label}</Badge>
                </div>
                <p className="text-xs text-gray-500">{formatDate(new Date(sel.entry_date))}</p>
                <p className="text-sm font-medium">{sel.description_ar}</p>
                {sel.reference && <p className="text-[10px] text-gray-400">مرجع: {sel.reference}</p>}
                <div className="border-t pt-3">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-gray-500">
                        <th className="text-right pb-2">الحساب</th>
                        <th className="text-left pb-2">مدين</th>
                        <th className="text-left pb-2">دائن</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(sel.lines || []).map((line, i) => (
                        <tr key={i} className="border-t border-gray-50">
                          <td className="py-2 font-medium">{line.account_name || '?'}</td>
                          <td className="py-2 text-left text-emerald-600 tabular-nums">{(line.debit || 0) > 0 ? formatCurrency(line.debit) : '-'}</td>
                          <td className="py-2 text-left text-red-600 tabular-nums">{(line.credit || 0) > 0 ? formatCurrency(line.credit) : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 font-bold">
                        <td className="py-2">الإجمالي</td>
                        <td className="py-2 text-left text-emerald-600 tabular-nums">{formatCurrency((sel.lines || []).reduce((s, l) => s + (l.debit || 0), 0))}</td>
                        <td className="py-2 text-left text-red-600 tabular-nums">{formatCurrency((sel.lines || []).reduce((s, l) => s + (l.credit || 0), 0))}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <p className="text-[10px] text-gray-400">بواسطة: {sel.created_by || '—'}</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
