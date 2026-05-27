'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { BarChart3, TrendingUp, TrendingDown, Activity } from 'lucide-react';

const supabase = createClient();

function Sparkline({ data, color, height = 30, width = 100 }: { data: number[]; color: string; height?: number; width?: number }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * height}`).join(' ');
  return (
    <svg width={width} height={height} className="opacity-60">
      <polyline fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={points} />
    </svg>
  );
}

interface ActivityItem {
  id: string;
  type: 'order' | 'treasury' | 'transfer' | 'product';
  description: string;
  time: string;
  status: string;
}

export default function ManagerDashboard() {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    todayOrders: 0,
    lowStockItems: 0,
    pendingOrders: 0,
    treasuryBalance: 0,
    activeEmployees: 0,
    todayExpenses: 0,
    pendingTransfers: 0,
  });
  const [trends, setTrends] = useState({
    revenue: [] as number[],
    orders: [] as number[],
    balance: [] as number[],
  });
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [
          ordersRes,
          stockRes,
          treasuryRes,
          expensesRes,
          transfersRes,
          timeRes,
          txRes,
          productHistoryRes,
        ] = await Promise.all([
          supabase.from('orders').select('id, order_number, total, status, created_at'),
          supabase.from('stock_items').select('id, current_qty, min_qty'),
          supabase.from('treasury_accounts').select('current_balance'),
          supabase.from('expenses').select('amount, status, created_at').gte('created_at', today.toISOString()),
          supabase.from('stock_transfers').select('id, transfer_number, status, created_at').order('created_at', { ascending: false }),
          supabase.from('time_control').select('id').eq('status', 'active'),
          supabase.from('treasury_transactions').select('id, type, amount, status, created_at'),
          supabase.from('product_history').select('id, product_name, type, quantity, created_at').order('created_at', { ascending: false }).limit(10),
        ]);

        const todayOrders = (ordersRes.data || []).filter((o: any) => new Date(o.created_at) >= today);
        const lowStock = (stockRes.data || []).filter((s: any) => s.current_qty <= s.min_qty);
        const pendingOrders = (ordersRes.data || []).filter((o: any) => o.status === 'pending');
        const totalRevenue = (ordersRes.data || []).reduce((sum: number, o: any) => sum + (o.total || 0), 0);
        const treasuryBalance = (treasuryRes.data || []).reduce((sum: number, t: any) => sum + (t.current_balance || 0), 0);

        // Revenue sparkline: last 7 days
        const revenueByDay: number[] = [];
        const orderCountByDay: number[] = [];
        for (let i = 6; i >= 0; i--) {
          const day = new Date(today);
          day.setDate(day.getDate() - i);
          const nextDay = new Date(day);
          nextDay.setDate(nextDay.getDate() + 1);
          const dayOrders = (ordersRes.data || []).filter((o: any) => {
            const d = new Date(o.created_at);
            return d >= day && d < nextDay;
          });
          revenueByDay.push(dayOrders.reduce((s: number, o: any) => s + (o.total || 0), 0));
          orderCountByDay.push(dayOrders.length);
        }

        // Balance sparkline: reconstruct daily balances from treasury_transactions
        const txData = txRes.data || [];
        const netByDay: number[] = [];
        for (let i = 6; i >= 0; i--) {
          const day = new Date(today);
          day.setDate(day.getDate() - i);
          const nextDay = new Date(day);
          nextDay.setDate(nextDay.getDate() + 1);
          const dayTx = txData.filter((t: any) => {
            const d = new Date(t.created_at);
            return d >= day && d < nextDay;
          });
          const netChange = dayTx.reduce((s: number, t: any) => {
            if (t.type === 'deposit' || t.type === 'transfer_in') return s + t.amount;
            if (t.type === 'withdrawal' || t.type === 'transfer_out') return s - t.amount;
            return s;
          }, 0);
          netByDay.push(netChange);
        }
        // Reconstruct end-of-day balance from oldest to newest
        const balanceByDay: number[] = [];
        for (let i = 0; i < 7; i++) {
          let futureSum = 0;
          for (let j = i + 1; j < 7; j++) futureSum += netByDay[j];
          balanceByDay.push(treasuryBalance - futureSum);
        }

        setStats({
          totalRevenue,
          todayOrders: todayOrders.length,
          lowStockItems: lowStock.length,
          pendingOrders: pendingOrders.length,
          treasuryBalance,
          activeEmployees: timeRes.data?.length || 0,
          todayExpenses: (expensesRes.data || []).filter((e: any) => e.status === 'approved').reduce((s: number, e: any) => s + e.amount, 0),
          pendingTransfers: (transfersRes.data || []).filter((t: any) => t.status === 'pending_approval').length,
        });
        setTrends({
          revenue: revenueByDay,
          orders: orderCountByDay,
          balance: balanceByDay,
        });

        // Build activity feed
        const orderActivities: ActivityItem[] = (ordersRes.data || []).slice(0, 10).map((o: any) => ({
          id: `order-${o.id}`,
          type: 'order',
          description: `طلب #${o.order_number || o.id.slice(0, 8)} - ${o.total} ج.م`,
          time: o.created_at,
          status: o.status,
        }));
        const txActivities: ActivityItem[] = txData.slice(0, 10).map((t: any) => ({
          id: `tx-${t.id}`,
          type: 'treasury',
          description: `${t.type === 'deposit' ? 'إيداع' : t.type === 'withdrawal' ? 'سحب' : t.type === 'transfer_in' ? 'تحويل وارد' : 'تحويل صادر'} - ${t.amount} ج.م`,
          time: t.created_at,
          status: t.status,
        }));
        const transferActivities: ActivityItem[] = (transfersRes.data || []).filter((t: any) => t.status === 'pending_approval').slice(0, 10).map((t: any) => ({
          id: `transfer-${t.id}`,
          type: 'transfer',
          description: `تحويل مخزون #${t.transfer_number || t.id.slice(0, 8)}`,
          time: t.created_at,
          status: t.status,
        }));
        const productActivities: ActivityItem[] = (productHistoryRes.data || []).slice(0, 10).map((p: any) => ({
          id: `product-${p.id}`,
          type: 'product',
          description: `${p.product_name} - ${p.type === 'sale' ? 'بيع' : p.type === 'purchase' ? 'شراء' : p.type === 'adjustment' ? 'تسوية' : p.type === 'transfer_in' ? 'تحويل وارد' : p.type === 'transfer_out' ? 'تحويل صادر' : p.type}`,
          time: p.created_at,
          status: p.type,
        }));

        const allActivities = [...orderActivities, ...txActivities, ...transferActivities, ...productActivities]
          .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
          .slice(0, 10);
        setActivities(allActivities);
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();

    // Real-time subscription
    const channel = supabase.channel('dashboard-stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchStats())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_items' }, () => fetchStats())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, () => fetchStats())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_transfers' }, () => fetchStats())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'time_control' }, () => fetchStats())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'treasury_transactions' }, () => fetchStats())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const trendPercent = (data: number[]) => {
    if (data.length < 2) return 0;
    const yesterday = data[data.length - 2] || 0;
    const todayVal = data[data.length - 1] || 0;
    if (yesterday === 0) return todayVal > 0 ? 100 : 0;
    return ((todayVal - yesterday) / yesterday) * 100;
  };

  const cards = [
    { label: 'إجمالي الإيرادات', labelEn: 'Total Revenue', value: stats.totalRevenue.toLocaleString('ar-EG'), unit: 'ج.م', icon: '💰', color: 'from-emerald-500/20 to-teal-500/20', borderColor: 'border-emerald-500/30', href: '/manager/treasury', sparkColor: '#10b981', sparkData: trends.revenue },
    { label: 'مبيعات اليوم', labelEn: "Today's Sales", value: stats.todayOrders, unit: 'طلب', icon: '📦', color: 'from-blue-500/20 to-indigo-500/20', borderColor: 'border-blue-500/30', href: '/manager/orders', sparkColor: '#3b82f6', sparkData: trends.orders },
    { label: 'طلبات معلقة', labelEn: 'Pending Orders', value: stats.pendingOrders, unit: 'طلب', icon: '⏳', color: 'from-purple-500/20 to-pink-500/20', borderColor: 'border-purple-500/30', href: '/manager/orders', sparkColor: '#a855f7', sparkData: [] },
    { label: 'أصناف منخفضة', labelEn: 'Low Stock', value: stats.lowStockItems, unit: 'صنف', icon: '⚠️', color: 'from-amber-500/20 to-orange-500/20', borderColor: 'border-amber-500/30', href: '/manager/inventory', sparkColor: '#f59e0b', sparkData: [] },
    { label: 'رصيد الخزينة', labelEn: 'Treasury Balance', value: stats.treasuryBalance.toLocaleString('ar-EG'), unit: 'ج.م', icon: '🏦', color: 'from-green-500/20 to-emerald-500/20', borderColor: 'border-green-500/30', href: '/manager/treasury', sparkColor: '#22c55e', sparkData: trends.balance },
    { label: 'موظفين نشطين', labelEn: 'Active Employees', value: stats.activeEmployees, unit: 'موظف', icon: '👥', color: 'from-cyan-500/20 to-blue-500/20', borderColor: 'border-cyan-500/30', href: '/manager/time-control', sparkColor: '#06b6d4', sparkData: [] },
    { label: 'مصروفات اليوم', labelEn: "Today's Expenses", value: stats.todayExpenses.toLocaleString('ar-EG'), unit: 'ج.م', icon: '💳', color: 'from-red-500/20 to-rose-500/20', borderColor: 'border-red-500/30', href: '/manager/expenses', sparkColor: '#ef4444', sparkData: [] },
    { label: 'تحويلات معلقة', labelEn: 'Pending Transfers', value: stats.pendingTransfers, unit: 'تحويلة', icon: '🔄', color: 'from-violet-500/20 to-purple-500/20', borderColor: 'border-violet-500/30', href: '/manager/inventory?tab=transfers', sparkColor: '#8b5cf6', sparkData: [] },
  ];

  const activityIcons: Record<string, string> = {
    order: '📋',
    treasury: '🏦',
    transfer: '🔄',
    product: '📦',
  };

  const activityStatusColors: Record<string, string> = {
    pending: 'bg-amber-500/20 text-amber-400',
    completed: 'bg-emerald-500/20 text-emerald-400',
    cancelled: 'bg-red-500/20 text-red-400',
    paid: 'bg-emerald-500/20 text-emerald-400',
    preparing: 'bg-blue-500/20 text-blue-400',
    ready: 'bg-green-500/20 text-green-400',
    delivered: 'bg-green-500/20 text-green-400',
    confirmed: 'bg-blue-500/20 text-blue-400',
    approved: 'bg-green-500/20 text-green-400',
    pending_approval: 'bg-amber-500/20 text-amber-400',
    in_transit: 'bg-cyan-500/20 text-cyan-400',
    received: 'bg-emerald-500/20 text-emerald-400',
    processing: 'bg-blue-500/20 text-blue-400',
    delayed: 'bg-orange-500/20 text-orange-400',
    reconciled: 'bg-green-600/20 text-green-500',
    rejected: 'bg-red-500/20 text-red-400',
    sale: 'bg-emerald-500/20 text-emerald-400',
    purchase: 'bg-blue-500/20 text-blue-400',
    adjustment: 'bg-purple-500/20 text-purple-400',
    deposit: 'bg-green-500/20 text-green-400',
    withdrawal: 'bg-red-500/20 text-red-400',
    transfer_in: 'bg-cyan-500/20 text-cyan-400',
    transfer_out: 'bg-orange-500/20 text-orange-400',
  };

  const statusLabels: Record<string, string> = {
    pending: 'معلق',
    completed: 'مكتمل',
    cancelled: 'ملغي',
    paid: 'مدفوع',
    preparing: 'قيد التحضير',
    ready: 'جاهز',
    delivered: 'تم التوصيل',
    confirmed: 'مؤكد',
    approved: 'معتمد',
    pending_approval: 'بانتظار الموافقة',
    in_transit: 'قيد النقل',
    received: 'مستلم',
    processing: 'قيد المعالجة',
    delayed: 'مؤجل',
    reconciled: 'مطابق',
    rejected: 'مرفوض',
    sale: 'بيع',
    purchase: 'شراء',
    adjustment: 'تسوية',
    deposit: 'إيداع',
    withdrawal: 'سحب',
    transfer_in: 'تحويل وارد',
    transfer_out: 'تحويل صادر',
  };

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, i) => (
          <Link
            key={i}
            href={card.href}
            className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${card.color} border ${card.borderColor} p-5 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-black/20`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-400">{card.label}</p>
                <p className="text-xs text-gray-500">{card.labelEn}</p>
                <p className="text-2xl font-bold mt-2">{card.value} <span className="text-sm font-normal text-gray-400">{card.unit}</span></p>
                {card.sparkData.length > 1 && (
                  <div className="mt-2 flex items-center gap-2">
                    <Sparkline data={card.sparkData} color={card.sparkColor} />
                    <span className={`text-xs flex items-center gap-0.5 ${trendPercent(card.sparkData) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {trendPercent(card.sparkData) >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      {Math.abs(trendPercent(card.sparkData)).toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
              <span className="text-3xl opacity-50 group-hover:opacity-80 transition-opacity shrink-0">{card.icon}</span>
            </div>
            <div className="absolute inset-0 bg-white/[0.02] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6">
        <h2 className="text-lg font-semibold mb-4">إجراءات سريعة</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link href="/manager/treasury?action=deposit" className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] transition-all duration-200 group">
            <span className="text-2xl group-hover:scale-110 transition-transform">💵</span>
            <span className="text-sm text-gray-300">إيداع</span>
          </Link>
          <Link href="/manager/treasury?action=withdraw" className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] transition-all duration-200 group">
            <span className="text-2xl group-hover:scale-110 transition-transform">💸</span>
            <span className="text-sm text-gray-300">سحب</span>
          </Link>
          <Link href="/manager/audit?action=voice" className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] transition-all duration-200 group">
            <span className="text-2xl group-hover:scale-110 transition-transform">🎤</span>
            <span className="text-sm text-gray-300">جرد صوتي</span>
          </Link>
          <Link href="/manager/audit?action=ocr" className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] transition-all duration-200 group">
            <span className="text-2xl group-hover:scale-110 transition-transform">📷</span>
            <span className="text-sm text-gray-300">جرد بالكاميرا</span>
          </Link>
        </div>
      </div>

      {/* Live Activity Feed */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Activity size={18} className="text-blue-400" />
          النشاط الأخير
        </h2>
        {activities.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>لا يوجد نشاط حديث</p>
            <p className="text-sm mt-1">ستظهر هنا آخر العمليات والحركات</p>
          </div>
        ) : (
          <div className="space-y-2">
            {activities.map((item) => (
              <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-colors">
                <span className="text-xl shrink-0">{activityIcons[item.type] || '📌'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-200 truncate">{item.description}</p>
                  <p className="text-xs text-gray-500">{new Date(item.time).toLocaleString('ar-EG')}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${activityStatusColors[item.status] || 'bg-gray-500/20 text-gray-400'}`}>
                  {statusLabels[item.status] || item.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
