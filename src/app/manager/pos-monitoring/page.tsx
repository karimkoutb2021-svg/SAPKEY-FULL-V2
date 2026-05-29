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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const newOrder = payload.new as POSOrder;
          
          setRecentOrders(prev => {
            const idx = prev.findIndex(o => o.id === newOrder.id);
            let updated = [...prev];
            if (idx >= 0) {
              updated[idx] = newOrder;
            } else {
              updated = [newOrder, ...prev].sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 50);
            }
            
            // Recalculate totals based on updated array (using the same logic as fetchData)
            const completed = updated.filter(o => o.status === 'completed');
            setTodayTotal(completed.reduce((s, o) => s + (o.grand_total || 0), 0));
            setTodayCount(completed.length);
            setCashTotal(completed.filter(o => o.payment_method === 'cash').reduce((s, o) => s + (o.grand_total || 0), 0));
            setCardTotal(completed.filter(o => o.payment_method === 'card').reduce((s, o) => s + (o.grand_total || 0), 0));
            setWalletTotal(completed.filter(o => o.payment_method === 'wallet').reduce((s, o) => s + (o.grand_total || 0), 0));
            setCreditTotal(completed.filter(o => o.payment_method === 'credit').reduce((s, o) => s + (o.grand_total || 0), 0));
            
            return updated.slice(0, 20); // Keep only 20 for recentOrders display if they used slice(0,20) before, wait, they used it
          });
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shifts' }, (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          setActiveShifts(prev => {
             const shift = payload.new as Shift;
             if (shift.status !== 'open') return prev.filter(s => s.id !== shift.id);
             const idx = prev.findIndex(s => s.id === shift.id);
             if (idx >= 0) {
               const upd = [...prev];
               upd[idx] = { ...upd[idx], ...shift };
               return upd;
             }
             return [shift, ...prev];
          });
        }
      })
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'إجمالي مبيعات اليوم', value: todayTotal.toLocaleString('ar-EG'), unit: 'ج.م', color: 'text-emerald-400', bg: 'bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border-emerald-500/20 shadow-emerald-500/5', icon: '💰' },
          { label: 'عدد الفواتير', value: todayCount.toLocaleString('ar-EG'), unit: 'فاتورة', color: 'text-blue-400', bg: 'bg-gradient-to-br from-blue-500/10 to-indigo-500/5 border-blue-500/20 shadow-blue-500/5', icon: '🧾' },
          { label: 'الكاشيرات النشطة', value: activeShifts.length.toLocaleString('ar-EG'), unit: 'كاشيرة', color: 'text-amber-400', bg: 'bg-gradient-to-br from-amber-500/10 to-orange-500/5 border-amber-500/20 shadow-amber-500/5', icon: '👩‍💻' },
          { label: 'متوسط الفاتورة', value: avgOrder.toLocaleString('ar-EG', { maximumFractionDigits: 2 }), unit: 'ج.م', color: 'text-purple-400', bg: 'bg-gradient-to-br from-purple-500/10 to-fuchsia-500/5 border-purple-500/20 shadow-purple-500/5', icon: '📈' },
        ].map((card, i) => (
          <div key={i} className={`rounded-[2rem] border p-6 shadow-2xl backdrop-blur-3xl transition-transform hover:-translate-y-1 duration-300 ${card.bg}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-3xl">{card.icon}</span>
              <p className={`text-4xl font-black ${card.color}`}>{card.value}</p>
            </div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-sm font-bold text-gray-300">{card.label}</p>
              <span className="text-xs font-bold text-gray-500 bg-[#111114] px-2 py-1 rounded-lg border border-white/[0.04]">{card.unit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Daily Cash Flow */}
      <div className="rounded-[2rem] bg-[#111114]/90 backdrop-blur-3xl border border-white/[0.06] p-8 shadow-2xl overflow-hidden">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center text-xl">
            💳
          </div>
          <div>
            <h2 className="text-xl font-black text-white">حركة النقدية وطرق الدفع</h2>
            <p className="text-sm text-gray-400 mt-1 font-medium">تحليل مبيعات اليوم حسب طريقة الدفع</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl bg-white/[0.02] border border-white/[0.04] p-5 hover:bg-white/[0.04] transition-colors group">
            <div className="flex items-center gap-3 mb-3">
              <span className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">💵</span>
              <p className="text-sm font-bold text-gray-400 group-hover:text-gray-300 transition-colors">نقدي (كاش)</p>
            </div>
            <p className="text-2xl font-black text-emerald-400">{cashTotal.toLocaleString('ar-EG')} <span className="text-xs font-bold text-gray-500">ج.م</span></p>
          </div>
          <div className="rounded-2xl bg-white/[0.02] border border-white/[0.04] p-5 hover:bg-white/[0.04] transition-colors group">
            <div className="flex items-center gap-3 mb-3">
              <span className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">💳</span>
              <p className="text-sm font-bold text-gray-400 group-hover:text-gray-300 transition-colors">بطاقة بنكية (فيزا)</p>
            </div>
            <p className="text-2xl font-black text-blue-400">{cardTotal.toLocaleString('ar-EG')} <span className="text-xs font-bold text-gray-500">ج.م</span></p>
          </div>
          <div className="rounded-2xl bg-white/[0.02] border border-white/[0.04] p-5 hover:bg-white/[0.04] transition-colors group">
            <div className="flex items-center gap-3 mb-3">
              <span className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20">📱</span>
              <p className="text-sm font-bold text-gray-400 group-hover:text-gray-300 transition-colors">محفظة إلكترونية</p>
            </div>
            <p className="text-2xl font-black text-purple-400">{walletTotal.toLocaleString('ar-EG')} <span className="text-xs font-bold text-gray-500">ج.م</span></p>
          </div>
          <div className="rounded-2xl bg-white/[0.02] border border-white/[0.04] p-5 hover:bg-white/[0.04] transition-colors group">
            <div className="flex items-center gap-3 mb-3">
              <span className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">📝</span>
              <p className="text-sm font-bold text-gray-400 group-hover:text-gray-300 transition-colors">مبيعات آجلة</p>
            </div>
            <p className="text-2xl font-black text-amber-400">{creditTotal.toLocaleString('ar-EG')} <span className="text-xs font-bold text-gray-500">ج.م</span></p>
          </div>
        </div>
      </div>

      {/* Active Cashiers */}
      <div className="rounded-[2rem] bg-[#111114]/90 backdrop-blur-3xl border border-white/[0.06] p-8 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center text-xl">
              👩‍💻
            </div>
            <div>
              <h2 className="text-xl font-black text-white">الكاشيرات النشطين الآن</h2>
              <p className="text-sm text-gray-400 mt-1 font-medium">متابعة حية لأداء نقاط البيع المفتوحة</p>
            </div>
          </div>
          <span className="px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold animate-pulse">مباشر</span>
        </div>
        
        {activeShifts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-500">
            <span className="text-5xl mb-4">💤</span>
            <p className="text-lg font-bold text-white mb-2">جميع نقاط البيع مغلقة</p>
            <p className="text-sm">لا توجد أي شفتات مفتوحة حالياً</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-8 px-8">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-white/[0.06]">
                  <th className="text-right py-4 px-4 font-bold whitespace-nowrap">اسم الكاشير</th>
                  <th className="text-right py-4 px-4 font-bold whitespace-nowrap">وقت الفتح</th>
                  <th className="text-right py-4 px-4 font-bold whitespace-nowrap">رصيد العهدة</th>
                  <th className="text-right py-4 px-4 font-bold whitespace-nowrap">مبيعات الشفت</th>
                  <th className="text-center py-4 px-4 font-bold whitespace-nowrap">الفواتير</th>
                  <th className="text-right py-4 px-4 font-bold whitespace-nowrap">كاش</th>
                  <th className="text-right py-4 px-4 font-bold whitespace-nowrap">فيزا</th>
                  <th className="text-left py-4 px-4 font-bold whitespace-nowrap">مدة العمل</th>
                </tr>
              </thead>
              <tbody>
                {activeShifts.map((shift) => (
                  <tr key={shift.id} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors group">
                    <td className="py-4 px-4 font-bold text-white whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-xs text-white/50 border border-white/[0.1]">
                          {shift.users?.full_name_ar?.substring(0, 2) || 'ك'}
                        </div>
                        {shift.users?.full_name_ar || 'غير محدد'}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-gray-400 font-mono whitespace-nowrap">
                      <span className="bg-white/[0.04] px-3 py-1.5 rounded-lg border border-white/[0.06]">{new Date(shift.started_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                    </td>
                    <td className="py-4 px-4 font-mono font-medium text-gray-300 whitespace-nowrap">{shift.starting_cash.toLocaleString('ar-EG')}</td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className="font-black text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">{shiftSales(shift.user_id).toLocaleString('ar-EG')}</span>
                    </td>
                    <td className="py-4 px-4 text-center whitespace-nowrap">
                      <span className="font-black text-white">{shiftOrdersCount(shift.user_id)}</span>
                    </td>
                    <td className="py-4 px-4 font-mono text-gray-300 whitespace-nowrap">{shiftCashTotalFor(shift.user_id).toLocaleString('ar-EG')}</td>
                    <td className="py-4 px-4 font-mono text-gray-300 whitespace-nowrap">{shiftCardTotalFor(shift.user_id).toLocaleString('ar-EG')}</td>
                    <td className="py-4 px-4 text-left font-bold text-amber-400 whitespace-nowrap">{shiftDuration(shift.started_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Latest POS Transactions */}
      <div className="rounded-[2rem] bg-[#111114]/90 backdrop-blur-3xl border border-white/[0.06] p-8 shadow-2xl overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center text-xl">
              🧾
            </div>
            <div>
              <h2 className="text-xl font-black text-white">أحدث الفواتير المصدرة</h2>
              <p className="text-sm text-gray-400 mt-1 font-medium">قائمة بآخر 20 فاتورة من جميع نقاط البيع</p>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto -mx-8 px-8">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 border-b border-white/[0.06]">
                <th className="text-right py-4 px-4 font-bold whitespace-nowrap">رقم الفاتورة</th>
                <th className="text-right py-4 px-4 font-bold whitespace-nowrap">نقطة البيع (الكاشير)</th>
                <th className="text-right py-4 px-4 font-bold whitespace-nowrap">قيمة الفاتورة</th>
                <th className="text-right py-4 px-4 font-bold whitespace-nowrap">طريقة الدفع</th>
                <th className="text-center py-4 px-4 font-bold whitespace-nowrap">حالة الطلب</th>
                <th className="text-left py-4 px-4 font-bold whitespace-nowrap">وقت الإصدار</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-16 text-gray-500 font-medium">لا توجد أي فواتير مسجلة لليوم</td></tr>
              ) : (
                recentOrders.map((order) => {
                  const cashier = activeShifts.find((s) => s.user_id === order.cashier_id);
                  return (
                    <tr key={order.id} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors group">
                      <td className="py-4 px-4 font-black text-white whitespace-nowrap">#{order.order_number || '—'}</td>
                      <td className="py-4 px-4 font-bold text-gray-300 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                           <span className="text-lg">🧑‍💻</span>
                          {cashier?.users?.full_name_ar || '—'}
                        </div>
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="font-black text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">{(order.grand_total || 0).toLocaleString('ar-EG')} <span className="text-xs font-normal">ج.م</span></span>
                      </td>
                      <td className="py-4 px-4 font-bold text-gray-300 whitespace-nowrap">
                         <div className="flex items-center gap-2">
                           <span className="text-lg opacity-50">
                             {order.payment_method === 'cash' ? '💵' : order.payment_method === 'card' ? '💳' : order.payment_method === 'wallet' ? '📱' : '📝'}
                           </span>
                          {payMethodLabel[order.payment_method || ''] || order.payment_method || '—'}
                         </div>
                      </td>
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        <span className={cn('text-xs px-4 py-1.5 rounded-xl font-bold border inline-block min-w-[100px]', statusBadge(order.status))}>
                          {order.status === 'completed' ? 'مكتمل وسلم' : order.status === 'pending' ? 'بانتظار الدفع' : order.status === 'cancelled' ? 'ملغي' : order.status === 'preparing' ? 'جاري التحضير' : order.status === 'ready' ? 'جاهز للتسليم' : order.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-left font-mono text-gray-400 whitespace-nowrap">{formatTime(order.created_at)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
