'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { TrendingUp, Users, ShoppingCart, Package, DollarSign, Calendar, ArrowUpRight, ArrowDownRight, RefreshCw, BarChart3, Clock } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useBrandingStore } from '@/lib/store/branding-store';
import { cn } from '@/lib/utils';
import { exportToPdf, exportToExcel, ReportData } from '@/lib/services/reports-export';

const supabase = createClient();

const ChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-3xl border border-white/20 dark:border-white/5 p-4 rounded-2xl shadow-xl">
        <p className="text-xs font-bold text-gray-900 dark:text-white mb-3">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-3 text-xs mb-2 last:mb-0">
            <div className="h-2 w-2 rounded-full shadow-sm" style={{ backgroundColor: entry.color }} />
            <span className="text-gray-500 dark:text-gray-400">{entry.name}:</span>
            <span className="font-bold text-gray-900 dark:text-white">
              {entry.name.includes('الإيرادات') || entry.name.includes('مبيعات') 
                ? `ج.م ${entry.value.toLocaleString()}` 
                : entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function AnalyticsPage() {
  const { branding } = useBrandingStore();
  const primaryColor = branding.primaryColor || '#22C55E';
  
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('week');
  
  const [stats, setStats] = useState({
    revenue: 0, prevRevenue: 0,
    orders: 0, prevOrders: 0,
    avgOrder: 0, prevAvgOrder: 0,
    customers: 0, prevCustomers: 0
  });
  
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);

  useEffect(() => {
    loadData();
    const ch = supabase.channel('analytics-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => loadData())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [timeRange]);

  const loadData = async () => {
    setLoading(true);
    try {
      const now = new Date();
      let startDate = new Date();
      let prevStartDate = new Date();
      let prevEndDate = new Date();

      if (timeRange === 'week') {
        startDate.setDate(now.getDate() - 7);
        prevStartDate.setDate(startDate.getDate() - 7);
        prevEndDate = new Date(startDate);
      } else if (timeRange === 'month') {
        startDate.setMonth(now.getMonth() - 1);
        prevStartDate.setMonth(startDate.getMonth() - 1);
        prevEndDate = new Date(startDate);
      } else {
        startDate.setFullYear(now.getFullYear() - 1);
        prevStartDate.setFullYear(startDate.getFullYear() - 1);
        prevEndDate = new Date(startDate);
      }

      const { data: allOrders } = await supabase.from('orders')
        .select('*, order_items(*, products(*, product_categories(name_ar)))')
        .limit(500)
        .gte('created_at', prevStartDate.toISOString());

      if (allOrders) {
        const currentOrders = allOrders.filter(o => new Date(o.created_at) >= startDate);
        const pastOrders = allOrders.filter(o => new Date(o.created_at) >= prevStartDate && new Date(o.created_at) < prevEndDate);

        const rev = currentOrders.reduce((s, o) => s + (o.total || 0), 0);
        const prevRev = pastOrders.reduce((s, o) => s + (o.total || 0), 0);
        
        setStats({
          revenue: rev,
          prevRevenue: prevRev,
          orders: currentOrders.length,
          prevOrders: pastOrders.length,
          avgOrder: currentOrders.length ? rev / currentOrders.length : 0,
          prevAvgOrder: pastOrders.length ? prevRev / pastOrders.length : 0,
          customers: new Set(currentOrders.map(o => o.customer_phone).filter(Boolean)).size,
          prevCustomers: new Set(pastOrders.map(o => o.customer_phone).filter(Boolean)).size,
        });

        // Generate Chart Data
        const chartMap: Record<string, number> = {};
        const catMap: Record<string, number> = {};
        const prodMap: Record<string, {name: string, revenue: number, qty: number}> = {};

        currentOrders.forEach(o => {
          const d = new Date(o.created_at);
          const key = timeRange === 'week' ? d.toLocaleDateString('ar-EG', { weekday: 'long' }) : 
                     timeRange === 'month' ? `${d.getDate()} ${d.toLocaleDateString('ar-EG', { month: 'short' })}` : 
                     d.toLocaleDateString('ar-EG', { month: 'short' });
          chartMap[key] = (chartMap[key] || 0) + (o.total || 0);

          o.order_items?.forEach((item: any) => {
            const catName = item.products?.product_categories?.name_ar || 'غير مصنف';
            const prodName = item.product_name || item.products?.name_ar || 'منتج';
            catMap[catName] = (catMap[catName] || 0) + (item.total_price || 0);
            
            if(!prodMap[prodName]) prodMap[prodName] = { name: prodName, revenue: 0, qty: 0 };
            prodMap[prodName].revenue += (item.total_price || 0);
            prodMap[prodName].qty += (item.quantity || 1);
          });
        });

        setRevenueData(Object.entries(chartMap).map(([date, revenue]) => ({ date, revenue })));
        
        const catColors = [primaryColor, '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444'];
        setCategoryData(Object.entries(catMap)
          .sort((a,b) => b[1] - a[1])
          .slice(0, 5)
          .map(([name, value], i) => ({ name, value, color: catColors[i % catColors.length] })));

        setTopProducts(Object.values(prodMap).sort((a,b) => b.revenue - a.revenue).slice(0, 5));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const calculateGrowth = (current: number, prev: number) => {
    if (prev === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - prev) / prev) * 100);
  };

  const handleExportPdf = () => {
    const report: ReportData = {
      title: 'تقرير الأداء الشامل',
      titleAr: 'تقرير الأداء الشامل',
      subtitleAr: `الفترة الزمنية: ${timeRange === 'week' ? 'آخر 7 أيام' : timeRange === 'month' ? 'آخر 30 يوم' : 'آخر سنة'}`,
      columns: [
        { key: 'name', label: 'Product', labelAr: 'المنتج', width: 40 },
        { key: 'qty', label: 'Quantity', labelAr: 'الكمية المباعة', type: 'number', width: 20 },
        { key: 'revenue', label: 'Revenue', labelAr: 'الإيرادات', type: 'currency', width: 30 },
      ],
      rows: topProducts,
      totals: { revenue: stats.revenue, qty: topProducts.reduce((s, p) => s + p.qty, 0) }
    };
    exportToPdf('analytics-chart', report, `Analytics_Report_${new Date().getTime()}`);
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-10" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">التحليلات والتقارير</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">مراقبة الأداء المالي والمبيعات لحظة بلحظة</p>
        </div>
        
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
          <div className="flex bg-white dark:bg-slate-900 rounded-xl p-1 shadow-sm border border-gray-100 dark:border-slate-800">
            {[
              { id: 'week', label: 'أسبوع' },
              { id: 'month', label: 'شهر' },
              { id: 'year', label: 'سنة' }
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setTimeRange(t.id as any)}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                  timeRange === t.id ? "bg-blue-500/10 text-blue-600 dark:text-blue-400" : "text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-800"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          
          <button 
            onClick={loadData}
            disabled={loading}
            className="h-9 w-9 rounded-xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 flex items-center justify-center text-gray-500 hover:text-blue-500 shadow-sm transition-all"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </button>
          
          <button 
            onClick={handleExportPdf}
            className="h-9 px-4 rounded-xl text-white text-xs font-bold flex items-center gap-2 shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl shrink-0"
            style={{ background: `linear-gradient(135deg, ${primaryColor}, #059669)` }}
          >
            <BarChart3 className="h-4 w-4" />
            تصدير PDF
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {[
          { label: 'إجمالي الإيرادات', value: stats.revenue, prev: stats.prevRevenue, icon: DollarSign, isCurrency: true, color: primaryColor },
          { label: 'عدد الطلبات', value: stats.orders, prev: stats.prevOrders, icon: ShoppingCart, color: '#3B82F6' },
          { label: 'متوسط الطلب', value: stats.avgOrder, prev: stats.prevAvgOrder, icon: Package, isCurrency: true, color: '#F59E0B' },
          { label: 'العملاء المتفاعلين', value: stats.customers, prev: stats.prevCustomers, icon: Users, color: '#8B5CF6' },
        ].map((s, i) => {
          const Icon = s.icon;
          const growth = calculateGrowth(s.value, s.prev);
          const isPos = growth >= 0;
          return (
            <Card key={i} className="border-0 shadow-sm md:shadow-md bg-white/60 dark:bg-slate-900/40 backdrop-blur-3xl overflow-hidden hover:scale-[1.02] transition-transform duration-300">
              <CardContent className="p-4 md:p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="h-10 w-10 rounded-2xl flex items-center justify-center shadow-sm" style={{ backgroundColor: `${s.color}15`, color: s.color }}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className={cn("flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold", isPos ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-red-500/10 text-red-600 dark:text-red-400")}>
                    {isPos ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    <span dir="ltr">{Math.abs(growth)}%</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">{s.label}</p>
                <h3 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white">
                  {s.isCurrency ? `ج.م ${s.value.toLocaleString()}` : s.value.toLocaleString()}
                </h3>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        
        {/* Main Area Chart */}
        <Card className="lg:col-span-2 border-0 shadow-sm md:shadow-md bg-white/60 dark:bg-slate-900/40 backdrop-blur-3xl overflow-hidden" id="analytics-chart">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">تحليل المبيعات الزمنية</h3>
                <p className="text-[10px] text-gray-500">الإيرادات المحققة خلال الفترة المحددة</p>
              </div>
            </div>
            <div className="h-72 w-full">
              {loading ? (
                <div className="h-full w-full flex items-center justify-center">
                  <RefreshCw className="h-8 w-8 text-gray-300 animate-spin" />
                </div>
              ) : revenueData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={primaryColor} stopOpacity={0.4}/>
                        <stop offset="95%" stopColor={primaryColor} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-gray-200/50 dark:text-slate-700/50" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9CA3AF', fontWeight: 600 }} axisLine={false} tickLine={false} dy={10} />
                    <YAxis tick={{ fontSize: 10, fill: '#9CA3AF', fontWeight: 600 }} axisLine={false} tickLine={false} dx={-10} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                    <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'rgba(156, 163, 175, 0.2)', strokeWidth: 2, strokeDasharray: '4 4' }} />
                    <Area type="monotone" dataKey="revenue" name="الإيرادات" stroke={primaryColor} strokeWidth={4} fill="url(#colorRevenue)" activeDot={{ r: 6, strokeWidth: 0, fill: primaryColor, className: 'drop-shadow-xl' }} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full w-full flex items-center justify-center text-gray-400 text-sm">لا توجد بيانات متاحة</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Categories Bar Chart */}
        <Card className="border-0 shadow-sm md:shadow-md bg-white/60 dark:bg-slate-900/40 backdrop-blur-3xl overflow-hidden">
          <CardContent className="p-5">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">مبيعات الأقسام</h3>
            <p className="text-[10px] text-gray-500 mb-6">أفضل 5 أقسام تحقيقاً للإيرادات</p>
            
            <div className="h-56 w-full">
              {loading ? (
                <div className="h-full w-full flex items-center justify-center">
                  <RefreshCw className="h-6 w-6 text-gray-300 animate-spin" />
                </div>
              ) : categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData} layout="vertical" margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="currentColor" className="text-gray-200/50 dark:text-slate-700/50" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: '#6B7280', fontWeight: 600 }} axisLine={false} tickLine={false} width={70} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(156, 163, 175, 0.05)' }} />
                    <Bar dataKey="value" name="المبيعات" radius={[0, 4, 4, 0]} barSize={16}>
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full w-full flex items-center justify-center text-gray-400 text-sm">لا توجد بيانات</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Products Table */}
      <Card className="border-0 shadow-sm md:shadow-md bg-white/60 dark:bg-slate-900/40 backdrop-blur-3xl overflow-hidden">
        <CardContent className="p-0">
          <div className="p-5 border-b border-gray-100 dark:border-slate-800">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">المنتجات الأكثر مبيعاً</h3>
            <p className="text-[10px] text-gray-500">حسب الإيرادات المحققة</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-gray-50/50 dark:bg-slate-800/50 text-gray-500 dark:text-gray-400 text-[10px] uppercase">
                <tr>
                  <th className="px-5 py-3 font-bold">الترتيب</th>
                  <th className="px-5 py-3 font-bold">المنتج</th>
                  <th className="px-5 py-3 font-bold text-center">الكمية المباعة</th>
                  <th className="px-5 py-3 font-bold text-left">إجمالي الإيرادات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {loading ? (
                  <tr><td colSpan={4} className="px-5 py-8 text-center text-gray-400"><RefreshCw className="h-5 w-5 animate-spin mx-auto" /></td></tr>
                ) : topProducts.length > 0 ? (
                  topProducts.map((p, i) => (
                    <tr key={i} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-5 py-3">
                        <div className={cn("h-6 w-6 rounded-md flex items-center justify-center text-[10px] font-bold shadow-sm", i === 0 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" : i === 1 ? "bg-slate-200 text-slate-700 dark:bg-slate-700/50 dark:text-slate-300" : i === 2 ? "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400" : "bg-gray-100 text-gray-500 dark:bg-slate-800")}>
                          #{i + 1}
                        </div>
                      </td>
                      <td className="px-5 py-3 font-bold text-gray-900 dark:text-white">{p.name}</td>
                      <td className="px-5 py-3 text-center font-mono text-gray-600 dark:text-gray-300">{p.qty}</td>
                      <td className="px-5 py-3 text-left font-black text-emerald-600 dark:text-emerald-400">ج.م {p.revenue.toLocaleString()}</td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={4} className="px-5 py-8 text-center text-gray-400 text-xs">لا توجد مبيعات في هذه الفترة</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
