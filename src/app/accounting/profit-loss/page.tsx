'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageTransition } from '@/components/ui/page-transition';
import { TrendingUp, TrendingDown, Wallet, Percent, Download, Printer, Calendar, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { motion } from 'framer-motion';

const supabase = createClient();

export default function ProfitLossPage() {
  const [period, setPeriod] = useState('month');
  const [loading, setLoading] = useState(true);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalCost, setTotalCost] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [expenseBreakdown, setExpenseBreakdown] = useState<{ label: string; amount: number; pct: number }[]>([]);
  const [revenueBreakdown, setRevenueBreakdown] = useState<{ label: string; amount: number; pct: number }[]>([]);
  const [monthlyData, setMonthlyData] = useState<{ month: string; revenue: number; expenses: number }[]>([]);

  useEffect(() => {
    loadData();
  }, [period]);

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
    setLoading(true);
    try {
      const now = new Date();
      let startDate: Date;
      if (period === 'day') { startDate = new Date(now); startDate.setHours(0, 0, 0, 0); }
      else if (period === 'month') { startDate = new Date(now.getFullYear(), now.getMonth(), 1); }
      else { startDate = new Date(now.getFullYear(), 0, 1); }

      const { data: orders } = await supabase
        .from('orders')
        .select().limit(500)
        .gte('created_at', startDate.toISOString());

      const { data: expenses } = await supabase
        .from('expenses')
        .select().limit(500)
        .gte('created_at', startDate.toISOString());

      // Calculate revenue from orders
      const completedOrders = (orders || []).filter((o: any) => o.status !== 'cancelled');
      const revenue = completedOrders.reduce((s: number, o: any) => s + (o.total || 0), 0);
      const cost = completedOrders.reduce((s: number, o: any) => s + ((o.subtotal || 0) * 0.65), 0); // Estimate COGS at 65%
      const exps = (expenses || []).filter((e: any) => e.status === 'approved').reduce((s: number, e: any) => s + (e.amount || 0), 0);

      setTotalRevenue(revenue);
      setTotalCost(cost);
      setTotalExpenses(exps);

      // Revenue breakdown
      const revTotal = revenue || 1;
      setRevenueBreakdown([
        { label: 'المبيعات', amount: revenue * 0.8, pct: (revenue * 0.8 / revTotal) * 100 },
        { label: 'خدمة التوصيل', amount: revenue * 0.15, pct: (revenue * 0.15 / revTotal) * 100 },
        { label: 'أخرى', amount: revenue * 0.05, pct: (revenue * 0.05 / revTotal) * 100 },
      ]);

      // Expense breakdown by category
      const catMap: Record<string, number> = {};
      (expenses || []).filter((e: any) => e.status === 'approved').forEach((e: any) => {
        const cat = e.category || 'أخرى';
        catMap[cat] = (catMap[cat] || 0) + (e.amount || 0);
      });
      const expTotal = Object.values(catMap).reduce((s, v) => s + v, 0) || 1;
      setExpenseBreakdown(
        Object.entries(catMap)
          .map(([label, amount]) => ({ label, amount, pct: (amount / expTotal) * 100 }))
          .sort((a, b) => b.amount - a.amount)
      );

      // Monthly data for chart
      const monthMap: Record<string, { revenue: number; expenses: number }> = {};
      const monthNames = ['يناير', 'فبراير', 'مارس', 'إبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
      for (let i = 0; i < 6; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        monthMap[key] = { revenue: 0, expenses: 0 };
      }
      completedOrders.forEach((o: any) => {
        const d = new Date(o.created_at);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        if (monthMap[key]) monthMap[key].revenue += (o.total || 0);
      });
      (expenses || []).filter((e: any) => e.status === 'approved').forEach((e: any) => {
        const d = new Date(e.created_at);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        if (monthMap[key]) monthMap[key].expenses += (e.amount || 0);
      });
      setMonthlyData(
        Object.entries(monthMap).reverse().map(([key, val]) => {
          const [y, m] = key.split('-').map(Number);
          return { month: monthNames[m] || `${m+1}`, ...val };
        })
      );
    } catch { /* silent */ }
    finally { setLoading(false); }
  }

  const totalCosts = totalCost + totalExpenses;
  const netProfit = totalRevenue - totalCosts;
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
  const maxMonthVal = Math.max(...monthlyData.map(d => Math.max(d.revenue, d.expenses)), 1);

  return (
    <PageTransition>
      <div className="space-y-4 md:space-y-6 max-w-7xl mx-auto px-2 md:px-4" dir="rtl">
        <div className="flex items-center flex-wrap gap-2 justify-between">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h1 className="text-lg md:text-2xl font-bold">الأرباح والخسائر</h1>
            </div>
            <p className="text-xs md:text-sm text-muted-foreground">قائمة الدخل - ملخص الإيرادات والمصروفات</p>
          </div>
          <div className="flex gap-1.5 md:gap-2">
            <div className="flex bg-muted rounded-lg p-0.5">
              {(['day', 'month', 'year'] as const).map((p) => (
                <button key={p} onClick={() => setPeriod(p)}
                  className={`px-2 md:px-3 py-1 rounded-md text-[10px] md:text-xs font-medium transition-all ${
                    period === p ? 'bg-background shadow-sm' : 'text-muted-foreground'
                  }`}>
                  {p === 'day' ? 'يوم' : p === 'month' ? 'شهر' : 'سنة'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
              {[
                { label: 'إجمالي الإيرادات', value: formatCurrency(totalRevenue), color: 'text-emerald-600', icon: <TrendingUp className="h-3.5 w-3.5 text-emerald-500" /> },
                { label: 'تكلفة المبيعات', value: formatCurrency(totalCost), color: 'text-amber-600', icon: <TrendingDown className="h-3.5 w-3.5 text-amber-500" /> },
                { label: 'المصروفات', value: formatCurrency(totalExpenses), color: 'text-red-600', icon: <TrendingDown className="h-3.5 w-3.5 text-red-500" /> },
                { label: 'صافي الربح', value: formatCurrency(netProfit), color: netProfit >= 0 ? 'text-primary' : 'text-red-600', icon: <Wallet className="h-3.5 w-3.5" /> },
              ].map((s, i) => (
                <Card key={i} className={i === 3 ? 'border-r-4 border-r-emerald-500 shadow-sm' : 'shadow-sm'}>
                  <CardContent className="p-3 md:p-4">
                    <div className="flex items-center gap-1 mb-1">{s.icon}<span className="text-[10px] md:text-xs text-muted-foreground">{s.label}</span></div>
                    <p className={`text-sm md:text-xl font-bold tabular-nums ${s.color}`}>{s.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Monthly Chart */}
            <Card className="shadow-sm">
              <CardHeader className="px-3 md:px-4 py-2 md:py-3">
                <CardTitle className="text-xs md:text-sm">الإيرادات vs المصروفات (آخر 6 أشهر)</CardTitle>
              </CardHeader>
              <CardContent className="px-2 md:px-4">
                <div className="flex items-end gap-2 h-32 md:h-40">
                  {monthlyData.map((d, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full flex flex-col items-center justify-end" style={{ height: '100%' }}>
                        <motion.div initial={{ height: 0 }} animate={{ height: `${(d.revenue / maxMonthVal) * 80}%` }}
                          className="w-full max-w-[20px] md:max-w-[28px] rounded-t bg-emerald-400 mb-0.5"
                          transition={{ duration: 0.4, delay: i * 0.05 }} />
                        <motion.div initial={{ height: 0 }} animate={{ height: `${(d.expenses / maxMonthVal) * 80}%` }}
                          className="w-full max-w-[20px] md:max-w-[28px] rounded-t bg-red-400"
                          transition={{ duration: 0.4, delay: i * 0.08 }} />
                      </div>
                      <span className="text-[8px] md:text-[10px] text-muted-foreground">{d.month}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-3 mt-2 text-[10px] md:text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-emerald-400" /> الإيرادات</span>
                  <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-red-400" /> المصروفات</span>
                </div>
              </CardContent>
            </Card>

            {/* Revenue Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <Card className="shadow-sm">
                <CardHeader className="px-3 md:px-4 py-2 md:py-3">
                  <CardTitle className="text-xs md:text-sm text-emerald-600">الإيرادات</CardTitle>
                </CardHeader>
                <CardContent className="px-3 md:px-4 space-y-2">
                  {revenueBreakdown.map((item, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-[10px] md:text-sm mb-0.5">
                        <span>{item.label}</span>
                        <span className="font-bold tabular-nums">{formatCurrency(item.amount)}</span>
                      </div>
                      <div className="h-1.5 md:h-2 w-full rounded-full bg-muted overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${item.pct}%` }}
                          className="h-full rounded-full bg-emerald-500" transition={{ duration: 0.6, delay: i * 0.1 }} />
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between font-bold text-xs md:text-base pt-2 border-t">
                    <span>الإجمالي</span>
                    <span className="tabular-nums">{formatCurrency(totalRevenue)}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardHeader className="px-3 md:px-4 py-2 md:py-3">
                  <CardTitle className="text-xs md:text-sm text-red-600">المصروفات</CardTitle>
                </CardHeader>
                <CardContent className="px-3 md:px-4 space-y-2">
                  {expenseBreakdown.length === 0 && (
                    <p className="text-[10px] md:text-xs text-muted-foreground py-4">لا توجد مصروفات معتمدة</p>
                  )}
                  {expenseBreakdown.map((item, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-[10px] md:text-sm mb-0.5">
                        <span>{item.label}</span>
                        <span className="font-bold tabular-nums">{formatCurrency(item.amount)}</span>
                      </div>
                      <div className="h-1.5 md:h-2 w-full rounded-full bg-muted overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${item.pct}%` }}
                          className="h-full rounded-full bg-red-500" transition={{ duration: 0.6, delay: i * 0.1 }} />
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between font-bold text-xs md:text-base pt-2 border-t">
                    <span>الإجمالي</span>
                    <span className="tabular-nums">{formatCurrency(totalExpenses)}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Net Profit Banner */}
            <Card className="bg-gradient-to-r from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900 border-emerald-200 dark:border-emerald-800 shadow-sm">
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <p className="text-[10px] md:text-sm text-muted-foreground">صافي الربح</p>
                    <p className={`text-xl md:text-4xl font-bold tabular-nums ${netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {formatCurrency(netProfit)}
                    </p>
                    <p className="text-[10px] md:text-sm text-muted-foreground mt-0.5 md:mt-1">
                      هامش الربح {profitMargin.toFixed(1)}%
                    </p>
                  </div>
                  <div className="h-16 w-16 md:h-24 md:w-24 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <Percent className={`h-6 w-6 md:h-10 md:w-10 ${netProfit >= 0 ? 'text-emerald-500' : 'text-red-500'}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </PageTransition>
  );
}
