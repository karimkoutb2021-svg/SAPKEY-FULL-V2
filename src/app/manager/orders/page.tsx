'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { timeAutoEngine, timeControlSettingsService, stageTimerService, STAGE_LABELS, type TimeControlSettings } from '@/lib/time-engine/time-control-engine';
import toast from 'react-hot-toast';

const supabase = createClient();

interface Order {
  id: string;
  customer_name?: string;
  customer_phone?: string;
  total: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  payment_status: 'pending' | 'paid' | 'partial' | 'refunded';
  payment_method?: string;
  payment_details?: any;
  created_at: string;
  updated_at: string;
  delivery_driver?: string;
  preparing_started_at?: string;
  items?: any[];
  notes?: string;
}

const statusLabels: Record<string, string> = {
  pending: 'معلق',
  confirmed: 'مؤكد',
  preparing: 'قيد التحضير',
  ready: 'جاهز',
  delivered: 'تم التسليم',
  cancelled: 'ملغي',
};

const statusColors: Record<string, string> = {
  pending: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  confirmed: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  preparing: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  ready: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  delivered: 'bg-green-500/20 text-green-400 border-green-500/30',
  cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const paymentLabels: Record<string, string> = {
  pending: 'معلق',
  paid: 'مدفوع',
  partial: 'جزئي',
  refunded: 'مرتجع',
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [driverModal, setDriverModal] = useState<{ open: boolean; orderId: string }>({ open: false, orderId: '' });
  const [driverName, setDriverName] = useState('');
  const [phoneInputs, setPhoneInputs] = useState<Record<string, string>>({});
  const [now, setNow] = useState(Date.now());
  const [timeSettings, setTimeSettings] = useState<TimeControlSettings | null>(null);
  const [stageTimers, setStageTimers] = useState<Record<string, any[]>>({});

  useEffect(() => {
    fetchOrders();
    timeControlSettingsService.get().then(setTimeSettings);

    const channel = supabase.channel('orders-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchOrders())
      .subscribe();

    const timerChannel = supabase.channel('orders-timers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_stage_timers' }, () => fetchOrders())
      .subscribe();

    return () => { supabase.removeChannel(channel); supabase.removeChannel(timerChannel); };
  }, []);

  useEffect(() => {
    const hasTimedOrders = orders.some(o => ['pending', 'confirmed', 'preparing', 'ready'].includes(o.status));
    if (!hasTimedOrders) return;
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [orders]);

  // Fetch stage timers for active orders
  useEffect(() => {
    async function loadTimers() {
      const activeStatuses = ['pending', 'confirmed', 'preparing', 'ready'];
      const activeOrders = orders.filter(o => activeStatuses.includes(o.status));
      const timerMap: Record<string, any[]> = {};
      for (const order of activeOrders) {
        const timers = await stageTimerService.getByOrder(order.id);
        if (timers.length > 0) timerMap[order.id] = timers;
      }
      setStageTimers(timerMap);
    }
    if (orders.length > 0) loadTimers();
  }, [orders]);

  async function fetchOrders() {
    const res = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (res.data) setOrders(res.data);
    setLoading(false);
  }

  async function updateStatus(id: string, status: Order['status'], order?: Order) {
    const updates: Record<string, any> = { status, updated_at: new Date().toISOString() };
    if (status === 'preparing' && order?.status === 'confirmed') {
      updates.preparing_started_at = new Date().toISOString();
    }
    await supabase.from('orders').update(updates).eq('id', id);

    // Record time engine stage transition
    if (timeSettings) {
      await timeAutoEngine.processOrderStatusChange(id, status, timeSettings);
    }

    fetchOrders();
  }

  async function sendWhatsApp(order: Order) {
    const phone = phoneInputs[order.id] || order.customer_phone || '';
    if (!phone) {
      toast.error('يرجى إدخال رقم الهاتف');
      return;
    }
    const statusMsg: Record<string, string> = {
      confirmed: 'تم تأكيد طلبك وسيتم تجهيزه قريباً',
      ready: 'طلبك جاهز للتسليم',
      delivered: 'تم تسليم طلبك بنجاح',
    };
    const message = statusMsg[order.status] || `حالة طلبك: ${statusLabels[order.status]}`;
    const { error } = await supabase.from('notifications').insert({
      type: 'whatsapp',
      order_id: order.id,
      customer_phone: phone,
      message,
    });
    if (error) {
      toast.error('فشل إرسال الإشعار');
    } else {
      toast.success('تم إرسال الإشعار');
    }
  }

  async function assignDriver() {
    if (!driverName.trim()) {
      toast.error('يرجى إدخال اسم المندوب');
      return;
    }
    await supabase.from('orders').update({
      delivery_driver: driverName.trim(),
      notes: `مندوب التوصيل: ${driverName.trim()}`,
      updated_at: new Date().toISOString(),
    }).eq('id', driverModal.orderId);
    setDriverModal({ open: false, orderId: '' });
    setDriverName('');
    toast.success('تم تعيين المندوب');
    fetchOrders();
  }

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter);
  const statusCounts = {
    all: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    confirmed: orders.filter(o => o.status === 'confirmed').length,
    preparing: orders.filter(o => o.status === 'preparing').length,
    ready: orders.filter(o => o.status === 'ready').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
  };

  function getStageInfo(order: Order) {
    const timers = stageTimers[order.id];
    if (!timers || timers.length === 0) return null;
    const activeTimer = timers.find(t => !t.completed_at);
    if (!activeTimer) return null;

    const startedAt = new Date(activeTimer.started_at).getTime();
    const elapsed = Math.floor((now - startedAt) / 1000);
    const sla = activeTimer.sla_seconds;
    const remaining = Math.max(0, sla - elapsed);
    const overdue = elapsed > sla;
    const isAlmostOverdue = !overdue && remaining <= (timeSettings?.alert_blink_threshold_seconds || 30);
    const info = STAGE_LABELS[activeTimer.stage] || { ar: activeTimer.stage, icon: '⏱️' };

    return { ...activeTimer, elapsed, remaining, overdue, isAlmostOverdue, stageInfo: info };
  }

  function getElapsed(order: Order): number | null {
    if (!order.preparing_started_at) return null;
    return Math.floor((now - new Date(order.preparing_started_at).getTime()) / 60000);
  }

  function getItemPreview(order: Order): string {
    if (!order.items || !Array.isArray(order.items) || order.items.length === 0) return '';
    const names = order.items.slice(0, 3).map((item: any) => item.name || item.product_name || JSON.stringify(item));
    const suffix = order.items.length > 3 ? ', ...' : '';
    return names.join(', ') + suffix;
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Pipeline */}
      <div className="rounded-[2rem] bg-[#111114]/90 backdrop-blur-3xl border border-white/[0.06] p-8 shadow-2xl">
        <h2 className="text-xl font-bold text-white mb-6">خط سير الطلبات</h2>
        <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
          {([['all', 'الكل'], ['pending', 'معلق'], ['confirmed', 'مؤكد'], ['preparing', 'تحضير'], ['ready', 'جاهز'], ['delivered', 'مسلم']] as const).map(([key, label]) => (
            <button key={key} onClick={() => setFilter(key)} className={cn('flex-shrink-0 px-6 py-3 rounded-2xl text-sm font-bold transition-all duration-300 flex items-center gap-2',
              filter === key ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-white/[0.02] text-gray-400 hover:text-white hover:bg-white/[0.06] border border-white/[0.04]'
            )}>
              {label} 
              <span className={cn('px-2 py-0.5 rounded-lg text-xs font-mono', filter === key ? 'bg-white/20 text-white' : 'bg-white/[0.06] text-gray-400')}>{statusCounts[key]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      <div className="rounded-[2rem] bg-[#111114]/90 backdrop-blur-3xl border border-white/[0.06] p-8 shadow-2xl">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-emerald-500/50">
            <span className="w-10 h-10 border-4 border-current border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-gray-400 font-medium">جاري تحميل الطلبات...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-500">
            <p className="text-lg font-medium">لا توجد طلبات</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((order) => {
              const elapsed = getElapsed(order);
              return (
                <div key={order.id} className="flex flex-col xl:flex-row xl:items-center justify-between p-6 rounded-[2rem] bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-all duration-300 gap-6">
                  <div className="flex items-start gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 flex items-center justify-center text-emerald-400 font-black text-lg shrink-0 shadow-inner border border-emerald-500/20">
                      #{order.id.slice(0, 4)}
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-lg mb-1">{order.customer_name || 'عميل غير محدد'}</h3>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400 mb-2">
                        <span className="flex items-center gap-1.5"><span className="text-emerald-500">•</span>{new Date(order.created_at).toLocaleString('ar-EG')}</span>
                        {order.customer_phone && (
                          <span className="flex items-center gap-1.5 dir-ltr"><span className="text-emerald-500">•</span>{order.customer_phone}</span>
                        )}
                      </div>
                      {getItemPreview(order) && (
                        <p className="text-sm text-gray-400 max-w-2xl bg-white/[0.02] px-4 py-2 rounded-xl border border-white/[0.02] line-clamp-1" dir="auto">{getItemPreview(order)}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-start xl:items-end gap-4 shrink-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xl font-black text-white ml-4">{order.total.toLocaleString('ar-EG')} <span className="text-sm text-emerald-500">ج.م</span></span>
                      
                      <span className={cn('text-xs px-3 py-1.5 rounded-xl font-bold border', statusColors[order.status])}>{statusLabels[order.status]}</span>
                      
                      <span className={cn('text-xs px-3 py-1.5 rounded-xl font-bold',
                        order.payment_status === 'paid' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                        order.payment_status === 'pending' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                        'bg-white/[0.06] text-gray-300 border border-white/[0.1]'
                      )}>{paymentLabels[order.payment_status]}</span>
                      
                      {order.payment_method && (
                        <span className="text-xs px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-gray-300 font-bold">{order.payment_method}</span>
                      )}
                      
                      {(() => {
                        const stageInfo = getStageInfo(order);
                        if (stageInfo) {
                          const mins = Math.floor(stageInfo.remaining / 60);
                          const secs = stageInfo.remaining % 60;
                          return (
                            <span className={cn('text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5 font-bold',
                              stageInfo.overdue ? 'bg-red-500/20 text-red-400 animate-pulse border border-red-500/50' :
                              stageInfo.isAlmostOverdue ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                              'bg-white/[0.04] border border-white/[0.06] text-gray-300'
                            )} title={stageInfo.stageInfo.ar}>
                              <span className="text-base">{stageInfo.stageInfo.icon}</span>
                              <span className="font-mono tabular-nums tracking-widest">{String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}</span>
                            </span>
                          );
                        }
                        if (elapsed !== null && order.status === 'preparing') {
                          return (
                            <span className={cn('text-xs px-3 py-1.5 rounded-xl font-bold', elapsed > 30 ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30')}>
                              {elapsed > 30 ? 'متأخر' : `${elapsed} دقيقة`}
                            </span>
                          );
                        }
                        return null;
                      })()}
                      
                      {order.delivery_driver && (
                        <span className="text-xs px-3 py-1.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 font-bold">
                          المندوب: {order.delivery_driver}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Status update buttons */}
                      {order.status === 'pending' && (
                        <button onClick={() => updateStatus(order.id, 'confirmed', order)} className="px-5 py-2.5 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 text-sm font-bold hover:bg-blue-500 text-white transition-all shadow-lg shadow-transparent hover:shadow-blue-500/25">تأكيد الطلب</button>
                      )}
                      {order.status === 'confirmed' && (
                        <button onClick={() => updateStatus(order.id, 'preparing', order)} className="px-5 py-2.5 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 text-sm font-bold hover:bg-purple-500 text-white transition-all shadow-lg shadow-transparent hover:shadow-purple-500/25">بدء التحضير</button>
                      )}
                      {order.status === 'preparing' && (
                        <button onClick={() => updateStatus(order.id, 'ready', order)} className="px-5 py-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-sm font-bold hover:bg-emerald-500 text-white transition-all shadow-lg shadow-transparent hover:shadow-emerald-500/25">طلب جاهز</button>
                      )}
                      {order.status === 'ready' && (
                        <button onClick={() => updateStatus(order.id, 'delivered', order)} className="px-5 py-2.5 rounded-xl bg-green-500/20 text-green-400 border border-green-500/30 text-sm font-bold hover:bg-green-500 text-white transition-all shadow-lg shadow-transparent hover:shadow-green-500/25">تم التسليم</button>
                      )}
                      
                      {/* WhatsApp notification button */}
                      {(order.status === 'confirmed' || order.status === 'ready' || order.status === 'delivered') && (
                        <div className="flex items-center gap-2 bg-white/[0.02] p-1.5 rounded-xl border border-white/[0.04]">
                          <input
                            type="text"
                            dir="ltr"
                            placeholder="رقم الهاتف"
                            value={phoneInputs[order.id] || order.customer_phone || ''}
                            onChange={(e) => setPhoneInputs(prev => ({ ...prev, [order.id]: e.target.value }))}
                            className="w-32 px-3 py-2 rounded-lg bg-[#111114] border border-white/[0.08] text-sm text-white font-mono focus:outline-none focus:border-emerald-500/50"
                          />
                          <button onClick={() => sendWhatsApp(order)} className="px-4 py-2 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white text-sm font-bold transition-all">إشعار 💬</button>
                        </div>
                      )}
                      
                      {/* Delivery assignment button */}
                      {order.status === 'ready' && (
                        <button onClick={() => setDriverModal({ open: true, orderId: order.id })} className="px-5 py-2.5 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30 text-sm font-bold hover:bg-sky-500 text-white transition-all shadow-lg shadow-transparent hover:shadow-sky-500/25">تعيين مندوب 🛵</button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Driver Assignment Modal */}
      {driverModal.open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A0A0C]/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-[2rem] bg-[#111114]/95 backdrop-blur-3xl border border-white/[0.08] p-8 shadow-2xl shadow-sky-500/10" dir="rtl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-white mb-6">تعيين مندوب توصيل</h3>
            <input
              type="text"
              placeholder="اسم المندوب"
              value={driverName}
              onChange={(e) => setDriverName(e.target.value)}
              className="w-full px-4 py-4 rounded-2xl bg-white/[0.02] border border-white/[0.08] text-base text-white focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500/50 transition-all placeholder-gray-500 mb-6"
              onKeyDown={(e) => { if (e.key === 'Enter') assignDriver(); }}
              autoFocus
            />
            <div className="flex gap-3">
              <button onClick={() => setDriverModal({ open: false, orderId: '' })} className="flex-1 py-4 rounded-2xl bg-white/[0.04] border border-white/[0.04] text-gray-400 hover:text-white hover:bg-white/[0.08] transition-colors font-bold">إلغاء</button>
              <button onClick={assignDriver} className="flex-[2] py-4 rounded-2xl bg-gradient-to-l from-sky-600 to-sky-500 text-white font-bold hover:from-sky-500 hover:to-sky-400 transition-all shadow-lg shadow-sky-500/25">تأكيد التعيين</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
