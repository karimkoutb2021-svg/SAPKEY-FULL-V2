'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BackButton } from '@/components/layout/back-button';
import { formatCurrency } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import {
  ChevronDown, ChevronRight, Plus, Search,
  TrendingUp, TrendingDown, Wallet, Building2,
  BookOpen, X, Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';

const supabase = createClient();

const typeColors: Record<string, string> = {
  asset: 'bg-blue-100 text-blue-800',
  liability: 'bg-red-100 text-red-800',
  equity: 'bg-purple-100 text-purple-800',
  revenue: 'bg-emerald-100 text-emerald-800',
  expense: 'bg-amber-100 text-amber-800',
};

const typeLabels: Record<string, string> = {
  asset: 'أصل', liability: 'خصم', equity: 'حقوق ملكية', revenue: 'إيراد', expense: 'مصروف',
};

interface Account {
  id: string; code: string; name_ar: string; name_en: string;
  type: string; parent_id: string | null; balance: number;
  is_active: boolean; children?: Account[];
}

function buildTree(accounts: Account[]): Account[] {
  const map = new Map<string, Account>();
  const roots: Account[] = [];
  accounts.forEach((a) => map.set(a.id, { ...a, children: [] }));
  accounts.forEach((a) => {
    const node = map.get(a.id)!;
    if (a.parent_id && map.has(a.parent_id)) map.get(a.parent_id)!.children!.push(node);
    else roots.push(node);
  });
  return roots;
}

function AccountRow({ account, level = 0, expanded, onToggle }: {
  account: Account; level?: number; expanded: Set<string>; onToggle: (id: string) => void;
}) {
  const hasChildren = account.children && account.children.length > 0;
  const isExpanded = expanded.has(account.id);
  return (
    <>
      <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${hasChildren ? 'bg-gray-25' : ''}`}>
        <td className="px-4 py-2.5">
          <div className="flex items-center gap-1" style={{ paddingRight: `${level * 20}px` }}>
            {hasChildren ? (
              <button onClick={() => onToggle(account.id)} className="h-5 w-5 flex items-center justify-center shrink-0">
                {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-gray-400" /> : <ChevronRight className="h-3.5 w-3.5 text-gray-400" />}
              </button>
            ) : <div className="h-5 w-5" />}
            <span className={`text-xs ${hasChildren ? 'font-bold' : 'font-medium'}`}>{account.name_ar}</span>
          </div>
        </td>
        <td className="px-4 py-2.5 text-center"><code className="text-[10px] font-mono text-gray-500">{account.code}</code></td>
        <td className="px-4 py-2.5 text-center"><Badge className={`${typeColors[account.type]} border-0 text-[9px]`}>{typeLabels[account.type]}</Badge></td>
        <td className="px-4 py-2.5 text-left"><span className={`text-xs font-bold tabular-nums ${account.balance > 0 ? 'text-emerald-600' : account.balance < 0 ? 'text-red-600' : 'text-gray-400'}`}>{formatCurrency(Math.abs(account.balance))}</span></td>
        <td className="px-4 py-2.5 text-center"><Badge variant={account.is_active ? 'success' : 'secondary'} className="text-[9px] border-0">{account.is_active ? 'نشط' : 'معطل'}</Badge></td>
      </motion.tr>
      {isExpanded && hasChildren && account.children!.map((child) => (
        <AccountRow key={child.id} account={child} level={level + 1} expanded={expanded} onToggle={onToggle} />
      ))}
    </>
  );
}

export default function ChartOfAccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAccount, setNewAccount] = useState({ code: '', nameAr: '', nameEn: '', type: 'asset', parentId: '', description: '' });

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    const ch = supabase.channel('acct-chart_of_accounts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chart_of_accounts' }, () => {
        loadData();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  async function loadData() {
    try {
      const { data } = await supabase.from('chart_of_accounts').select('*').order('code');
      if (data && data.length > 0) {
        setAccounts(data);
        // auto-expand root accounts
        const roots = data.filter((a: any) => !a.parent_id);
        setExpanded(new Set(roots.map((r: any) => r.id)));
      } else {
        setAccounts([]);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }

  const rootAccounts = buildTree(accounts).filter((a) => {
    const ms = !search || a.name_ar.includes(search) || a.code.includes(search);
    const mt = !typeFilter || a.type === typeFilter;
    return ms && mt;
  });

  const toggleExpand = (id: string) => {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id); else next.add(id);
    setExpanded(next);
  };

  const handleAddAccount = async () => {
    if (!newAccount.code || !newAccount.nameAr) return;
    try {
      const { error } = await supabase.from('chart_of_accounts').insert({
        code: newAccount.code, name_ar: newAccount.nameAr, name_en: newAccount.nameEn || newAccount.nameAr,
        type: newAccount.type, parent_id: newAccount.parentId || null, balance: 0, is_active: true,
        description: newAccount.description,
      });
      if (error) { toast.error(error.message); return; }
      toast.success('تم إضافة الحساب');
      setShowAddModal(false);
      setNewAccount({ code: '', nameAr: '', nameEn: '', type: 'asset', parentId: '', description: '' });
      loadData();
    } catch { toast.error('فشل الإضافة'); }
  };

  const totals = accounts.reduce((acc, a) => {
    if (a.type === 'asset') acc.assets += a.balance;
    else if (a.type === 'liability') acc.liabilities += a.balance;
    else if (a.type === 'equity') acc.equity += a.balance;
    else if (a.type === 'revenue') acc.revenue += a.balance;
    else if (a.type === 'expense') acc.expense += a.balance;
    return acc;
  }, { assets: 0, liabilities: 0, equity: 0, revenue: 0, expense: 0 });

  return (
    <div dir="rtl" className="space-y-4 pb-8 px-2 md:px-4">
      <div className="flex items-center flex-wrap gap-2 justify-between">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <BackButton href="/accounting" label="المحاسبة" />
            <h1 className="text-lg md:text-2xl font-bold">شجرة الحسابات</h1>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground">دليل الحسابات المحاسبي المتكامل</p>
        </div>
        <button onClick={() => setShowAddModal(true)}
          className="h-8 md:h-9 px-2.5 md:px-3 rounded-lg text-white text-[10px] md:text-xs flex items-center gap-1"
          style={{ backgroundColor: 'var(--primary, #22C55E)' }}>
          <Plus className="h-3 w-3 md:h-3.5 md:w-3.5" /> حساب جديد
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-3">
            <Card className="shadow-sm"><CardContent className="p-3 md:p-4"><div className="flex items-center gap-2"><Wallet className="h-4 w-4 text-blue-500" /><div><p className="text-[9px] md:text-xs text-muted-foreground">الأصول</p><p className="text-xs md:text-sm font-bold text-blue-600">{formatCurrency(totals.assets)}</p></div></div></CardContent></Card>
            <Card className="shadow-sm"><CardContent className="p-3 md:p-4"><div className="flex items-center gap-2"><TrendingDown className="h-4 w-4 text-red-500" /><div><p className="text-[9px] md:text-xs text-muted-foreground">الخصوم</p><p className="text-xs md:text-sm font-bold text-red-600">{formatCurrency(totals.liabilities)}</p></div></div></CardContent></Card>
            <Card className="shadow-sm"><CardContent className="p-3 md:p-4"><div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-purple-500" /><div><p className="text-[9px] md:text-xs text-muted-foreground">حقوق الملكية</p><p className="text-xs md:text-sm font-bold text-purple-600">{formatCurrency(totals.equity)}</p></div></div></CardContent></Card>
            <Card className="shadow-sm"><CardContent className="p-3 md:p-4"><div className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-emerald-500" /><div><p className="text-[9px] md:text-xs text-muted-foreground">الإيرادات</p><p className="text-xs md:text-sm font-bold text-emerald-600">{formatCurrency(totals.revenue)}</p></div></div></CardContent></Card>
            <Card className="shadow-sm"><CardContent className="p-3 md:p-4"><div className="flex items-center gap-2"><Wallet className="h-4 w-4 text-amber-500" /><div><p className="text-[9px] md:text-xs text-muted-foreground">صافي الربح</p><p className={`text-xs md:text-sm font-bold ${totals.revenue - totals.expense >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatCurrency(totals.revenue - totals.expense)}</p></div></div></CardContent></Card>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input type="text" placeholder="بحث..." value={search} onChange={(e) => setSearch(e.target.value)}
                className="w-full h-8 md:h-9 pr-9 pl-3 rounded-lg border text-xs" />
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              {[{ key: null, label: 'الكل' }, { key: 'asset', label: 'أصول' }, { key: 'liability', label: 'خصوم' }, { key: 'equity', label: 'حقوق ملكية' }, { key: 'revenue', label: 'إيرادات' }, { key: 'expense', label: 'مصروفات' }].map((opt) => (
                <button key={opt.key || 'all'} onClick={() => setTypeFilter(opt.key)}
                  className={`h-7 px-2.5 rounded-lg text-[10px] font-medium transition-all ${typeFilter === opt.key ? 'bg-foreground text-background' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>{opt.label}</button>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border shadow-sm">
            <table className="w-full text-[10px] md:text-sm">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="text-right px-4 py-2.5 text-[10px] font-medium text-gray-500">الحساب</th>
                  <th className="text-center px-4 py-2.5 text-[10px] font-medium text-gray-500">الكود</th>
                  <th className="text-center px-4 py-2.5 text-[10px] font-medium text-gray-500">النوع</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-medium text-gray-500">الرصيد</th>
                  <th className="text-center px-4 py-2.5 text-[10px] font-medium text-gray-500">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {rootAccounts.map((account) => (
                  <AccountRow key={account.id} account={account} expanded={expanded} onToggle={toggleExpand} />
                ))}
              </tbody>
            </table>
            {rootAccounts.length === 0 && <div className="text-center py-12 text-gray-400 text-xs">لا توجد حسابات</div>}
          </div>
        </>
      )}

      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowAddModal(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl border" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold">إضافة حساب جديد</h3>
                <button onClick={() => setShowAddModal(false)}><X className="h-4 w-4 text-gray-400" /></button>
              </div>
              <div className="space-y-3">
                <div><label className="text-[10px] font-medium text-gray-500 block mb-1">الكود</label>
                  <input type="text" value={newAccount.code} onChange={(e) => setNewAccount({ ...newAccount, code: e.target.value })}
                    className="w-full h-9 rounded-lg border text-xs px-3" placeholder="مثال: 1008" /></div>
                <div><label className="text-[10px] font-medium text-gray-500 block mb-1">الاسم بالعربي</label>
                  <input type="text" value={newAccount.nameAr} onChange={(e) => setNewAccount({ ...newAccount, nameAr: e.target.value })}
                    className="w-full h-9 rounded-lg border text-xs px-3" placeholder="اسم الحساب" /></div>
                <div><label className="text-[10px] font-medium text-gray-500 block mb-1">النوع</label>
                  <select value={newAccount.type} onChange={(e) => setNewAccount({ ...newAccount, type: e.target.value })}
                    className="w-full h-9 rounded-lg border text-xs px-3">
                    <option value="asset">أصل</option><option value="liability">خصم</option>
                    <option value="equity">حقوق ملكية</option><option value="revenue">إيراد</option><option value="expense">مصروف</option>
                  </select></div>
                <div><label className="text-[10px] font-medium text-gray-500 block mb-1">الحساب الأب (اختياري)</label>
                  <select value={newAccount.parentId} onChange={(e) => setNewAccount({ ...newAccount, parentId: e.target.value })}
                    className="w-full h-9 rounded-lg border text-xs px-3">
                    <option value="">بدون (حساب رئيسي)</option>
                    {accounts.filter((a) => !a.parent_id).map((a) => (<option key={a.id} value={a.id}>{a.name_ar} ({a.code})</option>))}
                  </select></div>
                <div className="flex gap-2 pt-2">
                  <button onClick={() => setShowAddModal(false)} className="flex-1 h-9 rounded-lg border text-xs font-medium hover:bg-gray-50 transition-all">إلغاء</button>
                  <button onClick={handleAddAccount}
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
