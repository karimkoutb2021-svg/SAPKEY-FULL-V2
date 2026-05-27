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
    <div className="space-y-6">
      {/* Pipeline */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6">
        <h2 className="text-lg font-semibold mb-4">خط سير الطلبات</h2>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {([['all', 'الكل'], ['pending', 'معلق'], ['confirmed', 'مؤكد'], ['preparing', 'تحضير'], ['ready', 'جاهز'], ['delivered', 'مسلم']] as const).map(([key, label]) => (
            <button key={key} onClick={() => setFilter(key)} className={cn('flex-shrink-0 px-4 py-2 rounded-xl text-sm transition-all duration-200',
              filter === key ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-white/[0.04] text-gray-400 hover:bg-white/[0.08] border border-transparent'
            )}>
              {label} <span className="mr-1 text-xs opacity-60">{statusCounts[key]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6">
        {loading ? (
          <div className="text-center py-8 text-gray-500">جاري التحميل...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-gray-500">لا توجد طلبات</div>
        ) : (
          <div className="space-y-4">
            {filtered.map((order) => {
              const elapsed = getElapsed(order);
              return (
                <div key={order.id} className="flex flex-col p-4 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] transition-colors gap-3">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 font-bold text-sm shrink-0">
                        #{order.id.slice(0, 4)}
                      </div>
                      <div>
                        <p className="font-medium">{order.customer_name || 'عميل غير محدد'}</p>
                        <p className="text-xs text-gray-500">{new Date(order.created_at).toLocaleString('ar-EG')}</p>
                        {order.customer_phone && (
                          <p className="text-xs text-gray-400 dir-ltr">{order.customer_phone}</p>
                        )}
                        {getItemPreview(order) && (
                          <p className="text-xs text-gray-400 mt-0.5" dir="auto">{getItemPreview(order)}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold">{order.total.toLocaleString('ar-EG')} ج.م</span>
                      <span className={cn('text-xs px-2 py-1 rounded-full border', statusColors[order.status])}>{statusLabels[order.status]}</span>
                      <span className={cn('text-xs px-2 py-1 rounded-full',
                        order.payment_status === 'paid' ? 'bg-emerald-500/20 text-emerald-400' :
                        order.payment_status === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-gray-500/20 text-gray-400'
                      )}>{paymentLabels[order.payment_status]}</span>
                      {order.payment_method && (
                        <span className="text-xs px-2 py-1 rounded-full bg-white/[0.06] text-gray-300">{order.payment_method}</span>
                      )}
                      {(() => {
                        const stageInfo = getStageInfo(order);
                        if (stageInfo) {
                          const mins = Math.floor(stageInfo.remaining / 60);
                          const secs = stageInfo.remaining % 60;
                          return (
                            <span className={cn('text-xs px-2 py-1 rounded-full flex items-center gap-1',
                              stageInfo.overdue ? 'bg-red-500/20 text-red-400 animate-pulse border border-red-500/50' :
                              stageInfo.isAlmostOverdue ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                              'bg-white/[0.06] text-gray-300'
                            )} title={stageInfo.stageInfo.ar}>
                              <span>{stageInfo.stageInfo.icon}</span>
                              <span className="font-mono tabular-nums">{String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}</span>
                            </span>
                          );
                        }
                        if (elapsed !== null && order.status === 'preparing') {
                          return (
                            <span className={cn('text-xs px-2 py-1 rounded-full', elapsed > 30 ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400')}>
                              {elapsed > 30 ? 'متأخر' : `${elapsed} د`}
                            </span>
                          );
                        }
                        return null;
                      })()}
                      {order.delivery_driver && (
                        <span className="text-xs px-2 py-1 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30">
                          مندوب: {order.delivery_driver}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Status update buttons */}
                    {order.status === 'pending' && (
                      <button onClick={() => updateStatus(order.id, 'confirmed', order)} className="px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-400 text-xs hover:bg-blue-500/30 transition-colors">تأكيد</button>
                    )}
                    {order.status === 'confirmed' && (
                      <button onClick={() => updateStatus(order.id, 'preparing', order)} className="px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-400 text-xs hover:bg-purple-500/30 transition-colors">تحضير</button>
                    )}
                    {order.status === 'preparing' && (
                      <button onClick={() => updateStatus(order.id, 'ready', order)} className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs hover:bg-emerald-500/30 transition-colors">جاهز</button>
                    )}
                    {order.status === 'ready' && (
                      <button onClick={() => updateStatus(order.id, 'delivered', order)} className="px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 text-xs hover:bg-green-500/30 transition-colors">تسليم</button>
                    )}
                    {/* WhatsApp notification button */}
                    {(order.status === 'confirmed' || order.status === 'ready' || order.status === 'delivered') && (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          dir="ltr"
                          placeholder="رقم الهاتف"
                          value={phoneInputs[order.id] || order.customer_phone || ''}
                          onChange={(e) => setPhoneInputs(prev => ({ ...prev, [order.id]: e.target.value }))}
                          className="w-28 px-2 py-1.5 rounded-lg bg-white/[0.06] border border-white/[0.1] text-xs text-gray-200 placeholder:text-gray-500 focus:outline-none focus:border-emerald-500/50"
                        />
                        <button onClick={() => sendWhatsApp(order)} className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs hover:bg-emerald-500/30 transition-colors shrink-0">إرسال إشعار</button>
                      </div>
                    )}
                    {/* Delivery assignment button */}
                    {order.status === 'ready' && (
                      <button onClick={() => setDriverModal({ open: true, orderId: order.id })} className="px-3 py-1.5 rounded-lg bg-sky-500/20 text-sky-400 text-xs hover:bg-sky-500/30 transition-colors">تعيين مندوب</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Driver Assignment Modal */}
      {driverModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setDriverModal({ open: false, orderId: '' })}>
          <div className="rounded-2xl bg-gray-900 border border-white/[0.06] p-6 w-full max-w-sm mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">تعيين مندوب توصيل</h3>
            <input
              type="text"
              placeholder="اسم المندوب"
              value={driverName}
              onChange={(e) => setDriverName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.1] text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:border-emerald-500/50 mb-4"
              onKeyDown={(e) => { if (e.key === 'Enter') assignDriver(); }}
            />
            <div className="flex gap-2">
              <button onClick={assignDriver} className="flex-1 px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 text-sm hover:bg-emerald-500/30 transition-colors">تأكيد</button>
              <button onClick={() => setDriverModal({ open: false, orderId: '' })} className="flex-1 px-4 py-2 rounded-xl bg-white/[0.06] text-gray-400 text-sm hover:bg-white/[0.1] transition-colors">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
