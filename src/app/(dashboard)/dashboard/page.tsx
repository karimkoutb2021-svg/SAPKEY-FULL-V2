'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/store/auth-store';
import { useBrandingStore } from '@/lib/store/branding-store';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  TrendingUp, TrendingDown, ShoppingCart, Users, Package,
  Clock, ArrowUpRight, ArrowDownRight, Eye, Plus, CreditCard, BarChart3,
  Truck, Wallet, Bell, Activity, Zap, UserPlus, Receipt,
  Boxes, Settings, RefreshCw, ChevronLeft, MoreHorizontal, Star,
  Target, ShoppingBag, PieChart, Percent, CircleUser, ClipboardList, Palette,
  TrendingUp as TrendIcon, Headphones, Store} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RePieChart, Pie, Cell } from 'recharts';
import { ProfileModal } from '@/components/profile/profile-modal';

const statusMap: Record<string, { label: string; color: string; dot: string }> = {
  pending: { label: 'قيد الانتظار', color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400', dot: 'bg-amber-500' },
  processing: { label: 'قيد التحضير', color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400', dot: 'bg-blue-500' },
  completed: { label: 'مكتمل', color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400', dot: 'bg-emerald-500' },
  delivered: { label: 'تم التوصيل', color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400', dot: 'bg-emerald-500' },
  cancelled: { label: 'ملغي', color: 'text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400', dot: 'bg-red-500' },
};

function AnimatedValue({ value, prefix = '', suffix = '', decimals = 0 }: { value: number; prefix?: string; suffix?: string; decimals?: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const duration = 800;
    const step = Math.ceil(value / (duration / 16));
    const timer = setInterval(() => {
      start += step;
      if (start >= value) { setDisplay(value); clearInterval(timer); }
      else setDisplay(start);
    }, 16);
    return () => clearInterval(timer);
  }, [value]);
  return <>{prefix}{display.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}{suffix}</>;
}

const ChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border border-white/20 dark:border-white/10 p-3 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
        <p className="text-xs font-bold text-gray-900 dark:text-white mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-[11px] mb-1">
            <div className="h-2 w-2 rounded-full shadow-sm" style={{ backgroundColor: entry.color }} />
            <span className="text-gray-600 dark:text-gray-400">{entry.name}:</span>
            <span className="font-bold text-gray-900 dark:text-white">
              {entry.name === 'الإيرادات' ? `ج.م ${entry.value.toLocaleString()}` : entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

import { createClient } from '@/lib/supabase/client';
const supabase = createClient();

export default function DashboardPage() {
  const { user } = useAuthStore();
  const branding = useBrandingStore((s) => s.branding);
  const [mounted, setMounted] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Live Data States
  const [weeklySalesData, setWeeklySalesData] = useState<any[]>([]);
  const [categorySalesData, setCategorySalesData] = useState<any[]>([]);
  const [topProductsData, setTopProductsData] = useState<any[]>([]);
  const [recentOrdersData, setRecentOrdersData] = useState<any[]>([]);
  const [lowStockData, setLowStockData] = useState<any[]>([]);
  const [employeePerfData, setEmployeePerfData] = useState<any[]>([]);
  
  // High-level Stats
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [todayOrdersCount, setTodayOrdersCount] = useState(0);
  const [todayProfit, setTodayProfit] = useState(0);
  const [avgTicket, setAvgTicket] = useState(0);
  const [activeCustomers, setActiveCustomers] = useState(0);

  useEffect(() => {
    setMounted(true);
    fetchLiveStats();

    const channel = supabase.channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchLiveStats())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_items' }, () => fetchLiveStats())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => fetchLiveStats())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  async function fetchLiveStats() {
    try {
      const today = new Date();
      today.setHours(0,0,0,0);
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 6);

      // Fetch Orders
      const { data: orders } = await supabase.from('orders')
        .select('*, order_items(*, products(*, product_categories(name_ar)))')
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: false });

      // Fetch Stock
      const { data: stock } = await supabase.from('stock_items').select('*');

      if (orders) {
        // Today's Stats
        const todayOrdersList = orders.filter(o => new Date(o.created_at) >= today);
        const revenue = todayOrdersList.reduce((sum, o) => sum + (o.total || 0), 0);
        const profit = todayOrdersList.reduce((sum, o) => sum + (o.total || 0) * 0.25, 0); // Placeholder 25% profit margin logic
        
        setTodayRevenue(revenue);
        setTodayOrdersCount(todayOrdersList.length);
        setTodayProfit(profit);
        setAvgTicket(todayOrdersList.length > 0 ? revenue / todayOrdersList.length : 0);
        
        // Active Customers (Unique phones/names in last 7 days)
        const uniqueCustomers = new Set(orders.map(o => o.customer_phone || o.customer_name).filter(Boolean));
        setActiveCustomers(uniqueCustomers.size);

        // Recent Orders
        setRecentOrdersData(orders.slice(0, 5));

        // Weekly Sales Chart
        const daysArr = ['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
        const weeklyObj: Record<string, { revenue: number, orders: number }> = {};
        for(let i=6; i>=0; i--){
          const d = new Date(today);
          d.setDate(d.getDate() - i);
          const dayName = daysArr[d.getDay()];
          weeklyObj[dayName] = { revenue: 0, orders: 0 };
        }
        
        orders.forEach(o => {
          const dName = daysArr[new Date(o.created_at).getDay()];
          if(weeklyObj[dName]) {
            weeklyObj[dName].revenue += o.total || 0;
            weeklyObj[dName].orders += 1;
          }
        });
        setWeeklySalesData(Object.entries(weeklyObj).map(([day, val]) => ({ day, ...val })));

        // Top Products & Categories
        const prodCount: Record<string, { name: string, sold: number, revenue: number }> = {};
        const catCount: Record<string, number> = {};
        
        orders.forEach(o => {
          o.order_items?.forEach((item: any) => {
            const pName = item.product_name || item.products?.name_ar || 'منتج';
            const catName = item.products?.product_categories?.name_ar || 'أخرى';
            
            if(!prodCount[pName]) prodCount[pName] = { name: pName, sold: 0, revenue: 0 };
            prodCount[pName].sold += item.quantity || 1;
            prodCount[pName].revenue += item.total_price || 0;
            
            catCount[catName] = (catCount[catName] || 0) + (item.total_price || 0);
          });
        });

        const sortedProds = Object.values(prodCount).sort((a,b) => b.sold - a.sold).slice(0, 5);
        setTopProductsData(sortedProds.map(p => ({ ...p, trend: '+0%' })));

        const catColors = ['#22C55E', '#F59E0B', '#3B82F6', '#8B5CF6', '#EF4444', '#EC4899'];
        const sortedCats = Object.entries(catCount)
          .sort((a,b) => b[1] - a[1])
          .slice(0, 5)
          .map(([name, value], i) => ({ name, value, color: catColors[i % catColors.length] }));
        
        // Normalize categories to percentages
        const totalCatRev = sortedCats.reduce((sum, c) => sum + c.value, 0);
        if(totalCatRev > 0) {
          setCategorySalesData(sortedCats.map(c => ({ ...c, value: Math.round((c.value / totalCatRev) * 100) })));
        } else {
          setCategorySalesData([]);
        }

        // Employee Perf (Cashiers)
        const empCount: Record<string, { name: string, orders: number, revenue: number }> = {};
        orders.forEach(o => {
          const eName = o.cashier_name || 'الكاشير';
          if(!empCount[eName]) empCount[eName] = { name: eName, orders: 0, revenue: 0 };
          empCount[eName].orders += 1;
          empCount[eName].revenue += o.total || 0;
        });
        const sortedEmps = Object.values(empCount).sort((a,b) => b.revenue - a.revenue).slice(0,4);
        setEmployeePerfData(sortedEmps.map((e, i) => ({ ...e, rating: (5 - i*0.1).toFixed(1), badge: i === 0 ? 'الأفضل' : '' })));
      }

      if (stock) {
        setLowStockData(stock.filter(s => s.current_qty <= (s.min_qty || 5)).slice(0, 5));
      }

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (!mounted) return null;

  const managerStats = [
    { title: 'مبيعات اليوم', value: todayRevenue, change: '+12.5%', up: true, icon: Wallet, color: branding.primaryColor, isCurrency: true },
    { title: 'الطلبات', value: todayOrdersCount, change: '+8.2%', up: true, icon: ShoppingCart, color: '#3B82F6' },
    { title: 'العملاء الجدد', value: activeCustomers > 5 ? 5 : activeCustomers, change: '+22.7%', up: true, icon: UserPlus, color: '#8B5CF6' },
    { title: 'العملاء النشطون', value: activeCustomers, change: '+18.7%', up: true, icon: Users, color: '#06B6D4' },
    { title: 'متوسط الفاتورة', value: avgTicket, change: '+5.3%', up: true, icon: CreditCard, color: '#F59E0B', isCurrency: true },
    { title: 'ربح اليوم (تقديري)', value: todayProfit, change: '+15.1%', up: true, icon: TrendingUp, color: '#10B981', isCurrency: true },
  ];

  return (
    <div className="space-y-6 pb-8" dir="rtl">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Store className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">لوحة المتجر</h1>
            <p className="text-sm text-[#8E8E93]">
              {new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowProfileModal(true)} className="h-8 px-3 rounded-xl bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.08)] text-xs font-medium text-[#8E8E93] hover:text-white hover:bg-[rgba(255,255,255,0.1)] transition-all flex items-center gap-1">
            <CircleUser className="h-3 w-3" /> الملف الشخصي
          </button>
          <button onClick={() => fetchLiveStats()} className="h-8 px-3 rounded-xl bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.08)] text-xs font-medium text-[#8E8E93] hover:text-white hover:bg-[rgba(255,255,255,0.1)] transition-all flex items-center gap-1">
            <RefreshCw className={cn("h-3 w-3", loading ? "animate-spin" : "")} /> تحديث
          </button>
          <button className="h-8 px-4 rounded-lg text-white text-xs font-medium flex items-center gap-1.5 shadow-lg transition-all hover:shadow-xl hover:scale-105" style={{ background: `linear-gradient(135deg, ${branding.primaryColor}, ${branding.secondaryColor})` }}>
            <Plus className="h-3 w-3" /> طلب جديد
          </button>
        </div>
      </motion.div>

      {/* Stats - Responsive Grid */}
      <div className="stats-grid grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {managerStats.map((stat, i) => (
          <motion.div key={stat.title} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
            <Card className="relative overflow-hidden border-0 bg-[rgba(255,255,255,0.03)] backdrop-blur-[25px] border border-[rgba(255,255,255,0.08)] rounded-2xl group hover:scale-[1.02] transition-all duration-300">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400">{stat.title}</p>
                  <div className="h-8 w-8 rounded-xl flex items-center justify-center shadow-md" style={{ background: `linear-gradient(135deg, ${stat.color}, ${stat.color}dd)` }}>
                    <stat.icon className="h-4 w-4 text-white" />
                  </div>
                </div>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {stat.isCurrency ? <AnimatedValue value={stat.value} prefix="" decimals={0} /> : <AnimatedValue value={stat.value} />}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  {stat.up ? <ArrowUpRight className="h-3 w-3 text-emerald-500" /> : <ArrowDownRight className="h-3 w-3 text-red-500" />}
                  <span className={`text-[10px] font-medium ${stat.up ? 'text-emerald-500' : 'text-red-500'}`}>{stat.change}</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Main Row: Revenue Chart + Low Stock */}
      <div className="responsive-grid grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Revenue */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="lg:col-span-2">
          <Card className="border-0 shadow-lg dark:shadow-black/20 overflow-hidden">
            <div className="p-5 pb-2 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">إيرادات الأسبوع</h3>
                <p className="text-[10px] text-gray-500">الإيرادات والطلبات خلال آخر 7 أيام</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: branding.primaryColor }} />
                  <span className="text-[9px] text-gray-500">الإيرادات</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-blue-500" />
                  <span className="text-[9px] text-gray-500">الطلبات</span>
                </div>
              </div>
            </div>
            <CardContent className="p-2 h-64 md:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklySalesData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={branding.primaryColor} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={branding.primaryColor} stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="ordGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-gray-200/50 dark:text-slate-700/50" />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9CA3AF', fontWeight: 500 }} axisLine={false} tickLine={false} dy={10} />
                  <YAxis tick={{ fontSize: 11, fill: '#9CA3AF', fontWeight: 500 }} axisLine={false} tickLine={false} dx={-10} />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'rgba(156, 163, 175, 0.2)', strokeWidth: 2, strokeDasharray: '4 4' }} />
                  <Area type="monotone" dataKey="revenue" stroke={branding.primaryColor} strokeWidth={3} fill="url(#revGrad)" name="الإيرادات" activeDot={{ r: 6, strokeWidth: 0, fill: branding.primaryColor, className: 'drop-shadow-lg' }} />
                  <Area type="monotone" dataKey="orders" stroke="#3B82F6" strokeWidth={3} fill="url(#ordGrad)" name="الطلبات" activeDot={{ r: 6, strokeWidth: 0, fill: '#3B82F6', className: 'drop-shadow-lg' }} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Low Stock */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card className="border-0 shadow-lg dark:shadow-black/20 h-full">
            <div className="p-5 pb-2 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">تنبيهات المخزون</h3>
                <p className="text-[10px] text-gray-500">منتجات تحتاج لإعادة توريد</p>
              </div>
              <Badge className="text-[9px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0">{lowStockData.length}</Badge>
            </div>
            <CardContent className="p-3">
              <div className="space-y-2">
                {lowStockData.length === 0 ? (
                  <div className="text-center py-6 text-gray-500 text-xs">لا يوجد نواقص في المخزون</div>
                ) : lowStockData.map((item) => {
                  const pct = Math.round((item.current_qty / (item.min_qty || 1)) * 100);
                  return (
                    <div key={item.id} className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{item.product_name || item.sku}</p>
                        <span className="text-[10px] text-red-500 font-medium">{item.current_qty}/{item.min_qty || 5} {item.unit}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-red-500" style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <button className="w-full mt-3 text-xs font-medium text-center py-2 rounded-lg text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all">
                عرض كل المخزون
              </button>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Second Row: Categories Pie + Top Products + Employee Performance */}
      <div className="responsive-grid grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Categories */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="border-0 shadow-lg dark:shadow-black/20 h-full">
            <div className="p-5 pb-2">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">توزيع المبيعات</h3>
              <p className="text-[10px] text-gray-500">حسب الفئة</p>
            </div>
            <CardContent className="p-2 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie data={categorySalesData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value" stroke="none">
                    {categorySalesData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </RePieChart>
              </ResponsiveContainer>
            </CardContent>
            <div className="px-5 pb-4 space-y-1.5">
              {categorySalesData.length === 0 ? (
                <div className="text-center text-xs text-gray-500 py-4">لا توجد مبيعات موزعة بعد</div>
              ) : categorySalesData.map((cat) => (
                <div key={cat.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: cat.color }} />
                    <span className="text-xs text-gray-600 dark:text-gray-400">{cat.name}</span>
                  </div>
                  <span className="text-xs font-medium text-gray-900 dark:text-white">{cat.value}%</span>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* Top Products */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <Card className="border-0 shadow-lg dark:shadow-black/20 h-full">
            <div className="p-5 pb-2 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">الأكثر مبيعاً</h3>
                <p className="text-[10px] text-gray-500">الـ 5 الأوائل اليوم</p>
              </div>
              <button className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 hover:underline">عرض الكل</button>
            </div>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {topProductsData.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 text-xs">لا توجد مبيعات لعرض الأفضل</div>
                ) : topProductsData.map((p, i) => (
                  <div key={p.name} className="flex items-center justify-between px-5 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-bold w-5 text-gray-400">#{i + 1}</span>
                      <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-1 max-w-[120px]">{p.name}</p>
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-gray-900 dark:text-white">ج.م {p.revenue.toLocaleString()}</p>
                      <span className="text-[10px] text-emerald-500">{p.sold} وحدة مباعة</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Employee Performance */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="border-0 shadow-lg dark:shadow-black/20 h-full">
            <div className="p-5 pb-2 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">أداء الموظفين</h3>
                <p className="text-[10px] text-gray-500">حسب المبيعات</p>
              </div>
              <button className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 hover:underline">التقرير كامل</button>
            </div>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {employeePerfData.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 text-xs">لا توجد بيانات للموظفين</div>
                ) : employeePerfData.map((emp) => (
                  <div key={emp.name} className="flex items-center justify-between px-5 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                        {emp.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{emp.name}</p>
                          {emp.badge && <Badge className="text-[8px] bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-0 h-4">{emp.badge}</Badge>}
                        </div>
                        <p className="text-[10px] text-gray-400">{emp.orders} طلب · ج.م {emp.revenue.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                      <span className="text-xs font-medium text-gray-900 dark:text-white">{emp.rating}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Bottom: Recent Orders */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
        <Card className="border-0 shadow-lg dark:shadow-black/20">
          <div className="p-5 pb-2 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">آخر الطلبات</h3>
              <p className="text-[10px] text-gray-500">أحدث 5 طلبات</p>
            </div>
            <button className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 hover:underline">جميع الطلبات</button>
          </div>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {recentOrdersData.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-xs">لا توجد طلبات حديثة</div>
              ) : recentOrdersData.map((order) => {
                const s = statusMap[order.status] || statusMap.pending;
                return (
                  <div key={order.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={cn('h-9 w-9 rounded-xl flex items-center justify-center', s.color)}>
                        {order.status === 'completed' || order.status === 'delivered' ? <Truck className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{order.customer_name || 'عميل نقدي'}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-gray-400 font-mono">{order.order_number || order.id.slice(0, 8)}</span>
                          <span className="text-[10px] text-gray-400">{(order.order_items || []).length} أصناف</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-gray-900 dark:text-white">ج.م {(order.total || 0).toFixed(2)}</p>
                      <div className="flex items-center gap-1.5 justify-end">
                        <span className="text-[9px] text-gray-400">{order.payment_method === 'cash' ? 'كاش' : 'بطاقة'}</span>
                        <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', s.color)}>{s.label}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Actions */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
        <h3 className="text-sm font-bold text-white mb-3">الإجراءات السريعة</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {[
            { icon: ShoppingCart, label: 'فاتورة جديدة', href: '/pos', color: 'from-emerald-500 to-green-600' },
            { icon: UserPlus, label: 'عميل جديد', href: '/customers', color: 'from-blue-500 to-indigo-600' },
            { icon: Package, label: 'منتج جديد', href: '/products', color: 'from-purple-500 to-violet-600' },
            { icon: Receipt, label: 'تقرير يومي', href: '/analytics', color: 'from-amber-500 to-orange-600' },
            { icon: Boxes, label: 'المخزون', href: '/inventory', color: 'from-rose-500 to-pink-600' },
            { icon: ClipboardList, label: 'تقارير', href: '/invoices', color: 'from-cyan-500 to-teal-600' },
          { icon: Settings, label: 'الإعدادات', href: '/settings', color: 'from-slate-500 to-gray-600' },
          { icon: Palette, label: 'البراندينج', href: '/settings/branding', color: 'from-violet-500 to-purple-600' },
          ].map((act) => (
            <a key={act.label} href={act.href}
              className="group relative overflow-hidden rounded-2xl p-4 text-center transition-all duration-300 hover:scale-105 hover:shadow-xl"
              style={{ background: `linear-gradient(135deg, ${act.color})` }}>
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <act.icon className="h-5 w-5 text-white mx-auto mb-1" />
              <p className="text-[10px] font-medium text-white">{act.label}</p>
            </a>
          ))}
        </div>
      </motion.div>

      {/* Store Goal */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
        <Card className="border-0 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-gray-950 shadow-lg overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <Target className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">هدف الشهر</h3>
                  <p className="text-[10px] text-gray-500">التقدم نحو هدف المبيعات الشهري</p>
                </div>
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{todayRevenue.toLocaleString()} / 120,000 ج.م</p>
                <p className="text-[10px] text-gray-500">{Math.round((todayRevenue / 120000) * 100)}% من الهدف</p>
              </div>
            </div>
            <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-green-500" style={{ width: `${Math.min((todayRevenue / 120000) * 100, 100)}%` }} />
            </div>
          </CardContent>
        </Card>
      </motion.div>
      <ProfileModal open={showProfileModal} onClose={() => setShowProfileModal(false)} />
    </div>
  );
}
