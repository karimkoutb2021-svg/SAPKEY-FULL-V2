'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageTransition } from '@/components/ui/page-transition';
import { BarChart3, TrendingUp, TrendingDown, Wallet, Download, Printer, Eye, PieChart, LineChart, FileText, Loader2 } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { motion } from 'framer-motion';

const supabase = createClient();

const reportTypes = [
  { key: 'income', titleAr: 'قائمة الدخل (Profit & Loss)', desc: 'ملخص الإيرادات والمصروفات', icon: TrendingUp, color: 'bg-emerald-100 text-emerald-600' },
  { key: 'balance', titleAr: 'الميزانية العمومية (Balance Sheet)', desc: 'الأصول والخصوم', icon: PieChart, color: 'bg-blue-100 text-blue-600' },
  { key: 'cashflow', titleAr: 'قائمة التدفقات النقدية', desc: 'حركة النقد', icon: LineChart, color: 'bg-purple-100 text-purple-600' },
  { key: 'trial', titleAr: 'ميزان المراجعة (Trial Balance)', desc: 'أرصدة جميع الحسابات', icon: BarChart3, color: 'bg-cyan-100 text-cyan-600' },
];

export default function ReportsPage() {
  const [selected, setSelected] = useState('income');
  const [loading, setLoading] = useState(true);
  const [revenue, setRevenue] = useState(0);
  const [expenses, setExpenses] = useState(0);
  const [monthlyRev, setMonthlyRev] = useState<number[]>([]);
  const [monthlyExp, setMonthlyExp] = useState<number[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const ch1 = supabase.channel('acct-journal_entries')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'journal_entries' }, () => {
        loadData();
      })
      .subscribe();
    const ch2 = supabase.channel('acct-expenses')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, () => {
        loadData();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch1);
      supabase.removeChannel(ch2);
    };
  }, []);

  async function loadData() {
    try {
      const { data: orders } = await supabase.from('orders').select('total, created_at');
      const { data: exps } = await supabase.from('expenses').select('amount, status, created_at');

      const totalRev = (orders || []).reduce((s: number, o: any) => s + (o.total || 0), 0);
      const totalExp = (exps || []).filter((e: any) => e.status === 'approved').reduce((s: number, e: any) => s + (e.amount || 0), 0);
      setRevenue(totalRev);
      setExpenses(totalExp);

      // Monthly
      const revByMonth: number[] = [];
      const expByMonth: number[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(); d.setMonth(d.getMonth() - i);
        const mStart = new Date(d.getFullYear(), d.getMonth(), 1);
        const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        revByMonth.push((orders || []).filter((o: any) => {
          const od = new Date(o.created_at); return od >= mStart && od <= mEnd;
        }).reduce((s: number, o: any) => s + (o.total || 0), 0));
        expByMonth.push((exps || []).filter((e: any) => {
          const ed = new Date(e.created_at); return ed >= mStart && ed <= mEnd && e.status === 'approved';
        }).reduce((s: number, e: any) => s + (e.amount || 0), 0));
      }
      setMonthlyRev(revByMonth);
      setMonthlyExp(expByMonth);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }

  const monthLabels = ['', '', '', '', '', ''].map((_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - (5 - i));
    return d.toLocaleDateString('ar-EG', { month: 'short' });
  });

  const netProfit = revenue - expenses;
  const maxVal = Math.max(...monthlyRev, ...monthlyExp, 1);

  return (
    <PageTransition>
      <div className="space-y-4 md:space-y-6 max-w-7xl mx-auto px-2 md:px-4" dir="rtl">
        <div className="flex items-center flex-wrap gap-2 justify-between">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <h1 className="text-lg md:text-2xl font-bold">التقارير المالية</h1>
            </div>
            <p className="text-xs md:text-sm text-muted-foreground">تقارير مالية متكاملة</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
          {reportTypes.map((r) => {
            const Icon = r.icon;
            return (
              <button key={r.key} onClick={() => setSelected(r.key)}
                className={`p-3 md:p-4 rounded-xl border text-right transition-all hover:shadow-md ${
                  selected === r.key ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'bg-white dark:bg-slate-900'
                }`}>
                <div className={`h-8 w-8 md:h-10 md:w-10 rounded-lg flex items-center justify-center ${r.color} mb-1.5 md:mb-2`}>
                  <Icon className="h-4 w-4 md:h-5 md:w-5" />
                </div>
                <h3 className="text-[10px] md:text-sm font-medium">{r.titleAr}</h3>
                <p className="text-[8px] md:text-xs text-muted-foreground mt-0.5">{r.desc}</p>
              </button>
            );
          })}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
          <Card className="shadow-sm">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center gap-1 mb-1"><TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-emerald-500" /><span className="text-[9px] md:text-xs text-muted-foreground">الإيرادات</span></div>
              <p className="text-sm md:text-xl font-bold text-emerald-600 tabular-nums">{formatCurrency(revenue)}</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center gap-1 mb-1"><TrendingDown className="h-3 w-3 md:h-4 md:w-4 text-red-500" /><span className="text-[9px] md:text-xs text-muted-foreground">المصروفات</span></div>
              <p className="text-sm md:text-xl font-bold text-red-600 tabular-nums">{formatCurrency(expenses)}</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-r-4 border-r-emerald-500">
            <CardContent className="p-3 md:p-4">
              <span className="text-[9px] md:text-xs text-muted-foreground">صافي الربح</span>
              <p className={`text-sm md:text-xl font-bold tabular-nums ${netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatCurrency(netProfit)}</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-3 md:p-4">
              <span className="text-[9px] md:text-xs text-muted-foreground">الهامش</span>
              <p className="text-sm md:text-xl font-bold tabular-nums">{revenue > 0 ? ((netProfit / revenue) * 100).toFixed(1) : 0}%</p>
            </CardContent>
          </Card>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : (
          <Card className="shadow-sm">
            <CardHeader className="px-3 md:px-4 py-2 md:py-3">
              <CardTitle className="text-xs md:text-sm">الإيرادات vs المصروفات (آخر 6 أشهر)</CardTitle>
            </CardHeader>
            <CardContent className="px-2 md:px-4">
              <div className="flex items-end gap-2 h-32 md:h-40">
                {monthlyRev.map((rev, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex flex-col items-center justify-end" style={{ height: '100%' }}>
                      <motion.div initial={{ height: 0 }} animate={{ height: `${(rev / maxVal) * 80}%` }}
                        className="w-full max-w-[20px] md:max-w-[28px] rounded-t bg-emerald-400 mb-0.5"
                        transition={{ duration: 0.4, delay: i * 0.05 }} />
                      <motion.div initial={{ height: 0 }} animate={{ height: `${(monthlyExp[i] / maxVal) * 80}%` }}
                        className="w-full max-w-[20px] md:max-w-[28px] rounded-t bg-red-400"
                        transition={{ duration: 0.4, delay: i * 0.08 }} />
                    </div>
                    <span className="text-[8px] md:text-[10px] text-muted-foreground">{monthLabels[i]}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-3 mt-2 text-[9px] md:text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-emerald-400" /> الإيرادات</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-red-400" /> المصروفات</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Report detail */}
        <Card className="shadow-sm">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center gap-2 mb-3">
              {selected === 'income' && <TrendingUp className="h-5 w-5 text-emerald-500" />}
              {selected === 'balance' && <PieChart className="h-5 w-5 text-blue-500" />}
              {selected === 'cashflow' && <LineChart className="h-5 w-5 text-purple-500" />}
              {selected === 'trial' && <BarChart3 className="h-5 w-5 text-cyan-500" />}
              <h3 className="text-sm md:text-base font-bold">{reportTypes.find(r => r.key === selected)?.titleAr}</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <div className="rounded-xl bg-muted/30 p-4">
                <p className="text-[10px] md:text-xs text-muted-foreground mb-1">إجمالي الإيرادات</p>
                <p className="text-lg md:text-2xl font-bold text-emerald-600">{formatCurrency(revenue)}</p>
              </div>
              <div className="rounded-xl bg-muted/30 p-4">
                <p className="text-[10px] md:text-xs text-muted-foreground mb-1">إجمالي المصروفات</p>
                <p className="text-lg md:text-2xl font-bold text-red-600">{formatCurrency(expenses)}</p>
              </div>
              <div className="rounded-xl bg-gradient-to-r from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900 p-4 md:col-span-2">
                <p className="text-[10px] md:text-xs text-muted-foreground mb-1">صافي الربح / الخسارة</p>
                <p className={`text-xl md:text-3xl font-bold ${netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatCurrency(netProfit)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}
