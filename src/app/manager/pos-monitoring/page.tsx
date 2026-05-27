'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

const supabase = createClient();

interface POSOrder {
  id: string; order_number?: string; cashier_id?: string; customer_name?: string;
  grand_total: number; payment_method?: string; status: string; payment_status?: string;
  shift_id?: string; created_at: string; paymentDetails?: any;
}

interface Shift {
  id: string; user_id: string; started_at: string; starting_cash: number; ending_cash?: number;
  status: string; notes?: string; users?: { full_name_ar?: string };
}

export default function POSMonitoringPage() {
  const [todayTotal, setTodayTotal] = useState(0);
  const [todayCount, setTodayCount] = useState(0);
  const [activeShifts, setActiveShifts] = useState<Shift[]>([]);
  const [recentOrders, setRecentOrders] = useState<POSOrder[]>([]);
  const [cardTotal, setCardTotal] = useState(0);
  const [cashTotal, setCashTotal] = useState(0);
  const [walletTotal, setWalletTotal] = useState(0);
  const [creditTotal, setCreditTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  async function fetchData() {
    try {
      const [ordersRes, shiftsRes] = await Promise.all([
        supabase.from('orders')
          .select('*')
          .gte('created_at', todayStart.toISOString())
          .order('created_at', { ascending: false })
          .limit(50),
        supabase.from('shifts')
          .select('*, users(full_name_ar)')
          .eq('status', 'open'),
      ]);

      const orders = (ordersRes.data || []) as POSOrder[];
      const completed = orders.filter((o) => o.status === 'completed');
      const total = completed.reduce((s, o) => s + (o.grand_total || 0), 0);
      const cash = completed.filter((o) => o.payment_method === 'cash').reduce((s, o) => s + (o.grand_total || 0), 0);
      const card = completed.filter((o) => o.payment_method === 'card').reduce((s, o) => s + (o.grand_total || 0), 0);
      const wallet = completed.filter((o) => o.payment_method === 'wallet').reduce((s, o) => s + (o.grand_total || 0), 0);
      const credit = completed.filter((o) => o.payment_method === 'credit').reduce((s, o) => s + (o.grand_total || 0), 0);

      setTodayTotal(total);
      setTodayCount(completed.length);
      setActiveShifts(shiftsRes.data || []);
      setRecentOrders(orders.slice(0, 20));
      setCashTotal(cash);
      setCardTotal(card);
      setWalletTotal(wallet);
      setCreditTotal(credit);
    } catch (error) {
      console.error('Error fetching POS data:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();

    const channel = supabase.channel('pos-monitor')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shifts' }, () => fetchData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const avgOrder = todayCount > 0 ? todayTotal / todayCount : 0;

  const summaryCards = [
    { label: 'إجمالي مبيعات اليوم', value: todayTotal.toLocaleString('ar-EG'), unit: 'ج.م' },
    { label: 'عدد الفواتير', value: todayCount.toLocaleString('ar-EG'), unit: 'فاتورة' },
    { label: 'الكاشيرات النشطة', value: activeShifts.length.toLocaleString('ar-EG'), unit: 'كاشيرة' },
    { label: 'متوسط قيمة الفاتورة', value: avgOrder.toLocaleString('ar-EG', { maximumFractionDigits: 2 }), unit: 'ج.م' },
  ];

  function shiftDuration(startedAt: string) {
    const start = new Date(startedAt);
    const now = new Date();
    const diff = Math.floor((now.getTime() - start.getTime()) / 1000);
    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    return `${h} س ${m} د`;
  }

  function shiftOrdersCount(cashierId: string) {
    return recentOrders.filter((o) => o.cashier_id === cashierId && o.status === 'completed').length;
  }

  function shiftSales(cashierId: string) {
    return recentOrders
      .filter((o) => o.cashier_id === cashierId && o.status === 'completed')
      .reduce((s, o) => s + (o.grand_total || 0), 0);
  }

  function shiftCashTotalFor(cashierId: string) {
    return recentOrders
      .filter((o) => o.cashier_id === cashierId && o.payment_method === 'cash')
      .reduce((s, o) => s + (o.grand_total || 0), 0);
  }

  function shiftCardTotalFor(cashierId: string) {
    return recentOrders
      .filter((o) => o.cashier_id === cashierId && o.payment_method === 'card')
      .reduce((s, o) => s + (o.grand_total || 0), 0);
  }

  function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleString('ar-EG');
  }

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      completed: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      pending: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
      refunded: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
      preparing: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      ready: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    };
    return colors[status] || 'bg-white/[0.04] text-gray-400 border-white/[0.08]';
  };

  const payMethodLabel: Record<string, string> = {
    cash: 'نقدي', card: 'بطاقة', wallet: 'محفظة', credit: 'آجل',
  };

  return (
    <div dir="rtl" className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {summaryCards.map((card, i) => (
          <div key={i} className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6">
            <p className="text-sm text-gray-400">{card.label}</p>
            <p className="text-2xl font-bold mt-2">
              {card.value} <span className="text-sm font-normal text-gray-400">{card.unit}</span>
            </p>
          </div>
        ))}
      </div>

      {/* Active Cashiers */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6">
        <h2 className="text-lg font-semibold mb-4">الكاشيرات النشطين</h2>
        {activeShifts.length === 0 ? (
          <p className="text-gray-500 text-center py-8">لا يوجد كاشيرات نشطين حالياً</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-white/[0.06]">
                  <th className="text-right p-3">الكاشيرة</th>
                  <th className="text-right p-3">وقت البدء</th>
                  <th className="text-right p-3">رصيد البداية</th>
                  <th className="text-right p-3">مبيعات الشفت</th>
                  <th className="text-right p-3">عدد الفواتير</th>
                  <th className="text-right p-3">نقدي</th>
                  <th className="text-right p-3">بطاقة</th>
                  <th className="text-right p-3">المدة</th>
                </tr>
              </thead>
              <tbody>
                {activeShifts.map((shift) => (
                  <tr key={shift.id} className="border-b border-white/[0.04] last:border-0">
                    <td className="p-3 rounded-r-xl bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                      {shift.users?.full_name_ar || 'غير محدد'}
                    </td>
                    <td className="p-3 bg-white/[0.02] hover:bg-white/[0.04] transition-colors">{formatTime(shift.started_at)}</td>
                    <td className="p-3 bg-white/[0.02] hover:bg-white/[0.04] transition-colors">{shift.starting_cash.toLocaleString('ar-EG')}</td>
                    <td className="p-3 bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                      {shiftSales(shift.user_id).toLocaleString('ar-EG')}
                    </td>
                    <td className="p-3 bg-white/[0.02] hover:bg-white/[0.04] transition-colors">{shiftOrdersCount(shift.user_id)}</td>
                    <td className="p-3 bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                      {shiftCashTotalFor(shift.user_id).toLocaleString('ar-EG')}
                    </td>
                    <td className="p-3 bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                      {shiftCardTotalFor(shift.user_id).toLocaleString('ar-EG')}
                    </td>
                    <td className="p-3 rounded-l-xl bg-white/[0.02] hover:bg-white/[0.04] transition-colors">{shiftDuration(shift.started_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Latest POS Transactions */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6">
        <h2 className="text-lg font-semibold mb-4">آخر فواتير نقاط البيع</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 border-b border-white/[0.06]">
                <th className="text-right p-3">رقم الفاتورة</th>
                <th className="text-right p-3">الكاشيرة</th>
                <th className="text-right p-3">الإجمالي</th>
                <th className="text-right p-3">طريقة الدفع</th>
                <th className="text-right p-3">الحالة</th>
                <th className="text-right p-3">الوقت</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-gray-500">لا توجد فواتير اليوم</td></tr>
              ) : (
                recentOrders.map((order) => {
                  const cashier = activeShifts.find((s) => s.user_id === order.cashier_id);
                  return (
                    <tr key={order.id} className="border-b border-white/[0.04] last:border-0">
                      <td className="p-3 rounded-r-xl bg-white/[0.02] hover:bg-white/[0.04] transition-colors">{order.order_number || '—'}</td>
                      <td className="p-3 bg-white/[0.02] hover:bg-white/[0.04] transition-colors">{cashier?.users?.full_name_ar || '—'}</td>
                      <td className="p-3 bg-white/[0.02] hover:bg-white/[0.04] transition-colors">{order.grand_total.toLocaleString('ar-EG')}</td>
                      <td className="p-3 bg-white/[0.02] hover:bg-white/[0.04] transition-colors">{payMethodLabel[order.payment_method || ''] || order.payment_method || '—'}</td>
                      <td className="p-3 bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                        <span className={cn('text-xs px-2 py-0.5 rounded-full border', statusBadge(order.status))}>
                          {order.status === 'completed' ? 'مكتمل' : order.status === 'pending' ? 'معلق' : order.status === 'cancelled' ? 'ملغي' : order.status === 'preparing' ? 'قيد التحضير' : order.status === 'ready' ? 'جاهز' : order.status}
                        </span>
                      </td>
                      <td className="p-3 rounded-l-xl bg-white/[0.02] hover:bg-white/[0.04] transition-colors">{formatTime(order.created_at)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Daily Cash Flow */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6">
        <h2 className="text-lg font-semibold mb-4">حركة النقدية اليومية</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="rounded-xl bg-white/[0.04] p-4">
            <p className="text-sm text-gray-400 mb-1">إجمالي النقدي</p>
            <p className="text-xl font-bold text-emerald-400">{cashTotal.toLocaleString('ar-EG')} ج.م</p>
          </div>
          <div className="rounded-xl bg-white/[0.04] p-4">
            <p className="text-sm text-gray-400 mb-1">إجمالي البطاقة</p>
            <p className="text-xl font-bold text-blue-400">{cardTotal.toLocaleString('ar-EG')} ج.م</p>
          </div>
          <div className="rounded-xl bg-white/[0.04] p-4">
            <p className="text-sm text-gray-400 mb-1">المحفظة الإلكترونية</p>
            <p className="text-xl font-bold text-purple-400">{walletTotal.toLocaleString('ar-EG')} ج.م</p>
          </div>
          <div className="rounded-xl bg-white/[0.04] p-4">
            <p className="text-sm text-gray-400 mb-1">المبيعات الآجلة</p>
            <p className="text-xl font-bold text-amber-400">{creditTotal.toLocaleString('ar-EG')} ج.م</p>
          </div>
        </div>
      </div>
    </div>
  );
}
