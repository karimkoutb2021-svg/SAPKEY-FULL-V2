'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageTransition } from '@/components/ui/page-transition';
import { BackButton } from '@/components/layout/back-button';
import { Wallet, Plus, ArrowUp, ArrowDown, History, Search, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

const supabase = createClient();

export default function TreasuryPage() {
  const [search, setSearch] = useState('');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    loadData();
    const channel = supabase.channel('acct-treasury')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'treasury_transactions' }, () => loadData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  async function loadData() {
    try {
      const { data: accounts } = await supabase.from('treasury_accounts').select('current_balance').limit(1);
      const currentBalance = (accounts && accounts[0]?.current_balance) || 0;
      setBalance(currentBalance);

      const { data: txns } = await supabase
        .from('treasury_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      setTransactions(txns || []);
    } catch {
      toast.error('خطأ في تحميل بيانات الخزينة');
    } finally {
      setLoading(false);
    }
  }

  const totalIn = transactions.filter((t) => t.type === 'deposit' || t.type === 'transfer_in').reduce((s, t) => s + (t.amount || 0), 0);
  const totalOut = transactions.filter((t) => t.type === 'withdrawal' || t.type === 'transfer_out').reduce((s, t) => s + (t.amount || 0), 0);

  const filtered = transactions.filter((t) =>
    (t.description || '').includes(search) || (t.created_by || '').includes(search)
  );

  // Last 7 days chart data
  const last7Days = [...Array(7)].map((_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const dayTxns = transactions.filter((t) => {
      const td = new Date(t.created_at);
      return td.toDateString() === d.toDateString();
    });
    const net = dayTxns.reduce((s: number, t: any) => {
      if (t.type === 'deposit' || t.type === 'transfer_in') return s + (t.amount || 0);
      if (t.type === 'withdrawal' || t.type === 'transfer_out') return s - (t.amount || 0);
      return s;
    }, 0);
    return { date: d.toLocaleDateString('ar-EG', { weekday: 'short' }), net };
  });

  const maxChart = Math.max(...last7Days.map(d => Math.abs(d.net)), 1);

  return (
    <PageTransition>
      <div className="space-y-4 md:space-y-6 max-w-7xl mx-auto px-2 md:px-4" dir="rtl">
        <div className="flex items-center flex-wrap gap-2 justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              <BackButton href="/accounting" label="المحاسبة" />
              <h1 className="text-lg md:text-2xl font-bold">الخزينة</h1>
            </div>
            <p className="text-xs md:text-sm text-muted-foreground">إدارة النقد والصندوق</p>
          </div>
          <div className="flex gap-1.5 md:gap-2">
            <button onClick={() => toast.success('تم تحميل كشف الحساب')}
              className="h-8 md:h-9 px-2.5 md:px-3 rounded-lg border text-[10px] md:text-xs flex items-center gap-1 hover:bg-accent transition-colors">
              <History className="h-3 w-3 md:h-3.5 md:w-3.5" /> كشف حساب
            </button>
            <button onClick={() => toast.success('تم إضافة حركة جديدة')}
              className="h-8 md:h-9 px-2.5 md:px-3 rounded-lg text-white text-[10px] md:text-xs flex items-center gap-1"
              style={{ backgroundColor: 'var(--primary, #22C55E)' }}>
              <Plus className="h-3 w-3 md:h-3.5 md:w-3.5" /> إضافة حركة
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
              {[
                { label: 'الرصيد الحالي', value: formatCurrency(balance), color: 'border-r-4 border-r-emerald-500', textColor: 'text-primary' },
                { label: 'وارد', value: formatCurrency(totalIn), icon: <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />, textColor: 'text-emerald-600' },
                { label: 'صادر', value: formatCurrency(totalOut), icon: <TrendingDown className="h-3.5 w-3.5 text-red-500" />, textColor: 'text-red-600' },
                { label: 'آخر تحديث', value: formatDate(Date.now()), textColor: 'text-gray-600' },
              ].map((s, i) => (
                <Card key={i} className={`${s.color || ''} shadow-sm`}>
                  <CardContent className="p-3 md:p-4">
                    {s.icon && <div className="flex items-center gap-1 mb-1">{s.icon}<span className="text-[10px] md:text-xs text-muted-foreground">{s.label}</span></div>}
                    {!s.icon && <p className="text-[10px] md:text-xs text-muted-foreground mb-1">{s.label}</p>}
                    <p className={`text-sm md:text-xl font-bold tabular-nums ${s.textColor}`}>{s.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Mini Chart */}
            <Card className="shadow-sm">
              <CardHeader className="px-3 md:px-4 py-2 md:py-3">
                <CardTitle className="text-xs md:text-sm">صافي الحركة اليومي (آخر 7 أيام)</CardTitle>
              </CardHeader>
              <CardContent className="px-2 md:px-4">
                <div className="flex items-end gap-1 md:gap-2 h-24 md:h-32">
                  {last7Days.map((day, i) => {
                    const height = day.net >= 0 ? (day.net / maxChart) * 100 : 0;
                    const negHeight = day.net < 0 ? (Math.abs(day.net) / maxChart) * 100 : 0;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full flex flex-col items-center" style={{ height: '100%', justifyContent: 'flex-end' }}>
                          {day.net >= 0 ? (
                            <motion.div initial={{ height: 0 }} animate={{ height: `${height}%` }}
                              className="w-full max-w-[24px] md:max-w-[32px] rounded-t bg-emerald-400"
                              transition={{ duration: 0.5, delay: i * 0.05 }} />
                          ) : (
                            <motion.div initial={{ height: 0 }} animate={{ height: `${negHeight}%` }}
                              className="w-full max-w-[24px] md:max-w-[32px] rounded-t bg-red-400"
                              transition={{ duration: 0.5, delay: i * 0.05 }} />
                          )}
                        </div>
                        <span className="text-[8px] md:text-[10px] text-muted-foreground">{day.date}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Transactions */}
            <Card className="shadow-sm">
              <CardContent className="p-0">
                <div className="p-2 md:p-3 border-b">
                  <div className="relative">
                    <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <input type="text" placeholder="بحث..." className="w-full h-9 rounded-lg border pr-8 pl-2.5 text-xs md:text-sm"
                      value={search} onChange={(e) => setSearch(e.target.value)} />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[10px] md:text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-right p-2 md:p-3 font-medium text-muted-foreground">التاريخ</th>
                        <th className="text-right p-2 md:p-3 font-medium text-muted-foreground">البيان</th>
                        <th className="text-right p-2 md:p-3 font-medium text-muted-foreground">بواسطة</th>
                        <th className="text-left p-2 md:p-3 font-medium text-muted-foreground">وارد</th>
                        <th className="text-left p-2 md:p-3 font-medium text-muted-foreground">صادر</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.length === 0 && (
                        <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">لا توجد حركات</td></tr>
                      )}
                      {filtered.map((tx, i) => {
                        const isIn = tx.type === 'deposit' || tx.type === 'transfer_in';
                        return (
                          <tr key={tx.id || i} className="border-b hover:bg-accent/50">
                            <td className="p-2 md:p-3 text-[10px] md:text-sm whitespace-nowrap">{formatDate(new Date(tx.created_at))}</td>
                            <td className="p-2 md:p-3 text-[10px] md:text-sm font-medium">{tx.description || tx.type}</td>
                            <td className="p-2 md:p-3 text-[10px] md:text-sm text-muted-foreground">{tx.created_by || '-'}</td>
                            <td className="p-2 md:p-3 text-left font-medium tabular-nums text-emerald-600">
                              {isIn ? formatCurrency(tx.amount) : '-'}
                            </td>
                            <td className="p-2 md:p-3 text-left font-medium tabular-nums text-red-600">
                              {!isIn ? formatCurrency(tx.amount) : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </PageTransition>
  );
}
