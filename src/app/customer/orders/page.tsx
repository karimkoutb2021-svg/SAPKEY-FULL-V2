'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { customerOrderService } from '@/lib/customer-services/customer-orders';
import Link from 'next/link';
import toast from 'react-hot-toast';

const supabase = createClient();

  import { useAuthStore } from '@/lib/store/auth-store';
  import { useRouter } from 'next/navigation';

  export default function OrdersPage() {
    const { user, isAuthenticated } = useAuthStore();
    const router = useRouter();
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>('all');

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!isAuthenticated) {
      router.replace('/shop?login=true');
      return;
    }
    loadOrders();
    const channel = supabase.channel('customer-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => loadOrders())
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [isAuthenticated, router]);

  async function loadOrders() {
    if (!user?.id) return;
    const data = await customerOrderService.getOrderHistory(user.id);
    setOrders(data);
    setLoading(false);
  }

  async function handleReorder(orderId: string) {
    try {
      const result = await customerOrderService.quickReorder(orderId);
      toast.success(`تم نسخ ${result.items?.length || 0} منتج من الطلب السابق 🛒`);
    } catch {
      toast.error('فشل إعادة الطلب');
    }
  }

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter);

  if (!mounted || !isAuthenticated) {
    return <div className="h-dvh flex items-center justify-center"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-xl font-bold">طلباتي 📦</h1>
        <Link href="/customer" className="text-xs text-white/50 hover:text-white">رجوع</Link>
      </div>

      {/* Filter Pills */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          { key: 'all', label: 'الكل', icon: '📋' },
          { key: 'pending', label: 'معلق', icon: '⏳' },
          { key: 'confirmed', label: 'مؤكد', icon: '✅' },
          { key: 'preparing', label: 'تحضير', icon: '⚙️' },
          { key: 'ready', label: 'جاهز', icon: '📦' },
          { key: 'delivered', label: 'تم', icon: '🎉' },
        ].map(tab => (
          <button key={tab.key} onClick={() => setFilter(tab.key)}
            className={`px-4 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors ${
              filter === tab.key ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-white/[0.04] text-white/60 border border-white/[0.06]'
            }`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse bg-white/[0.03] rounded-xl h-20 border border-white/[0.06]" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <span className="text-3xl">📭</span>
          <p className="text-sm text-white/40 mt-2">لا توجد طلبات</p>
          <Link href="/customer/catalog" className="inline-block mt-3 px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 text-sm hover:bg-emerald-500/30">
            ابدأ التسوق
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((order: any) => (
            <Link key={order.id} href={`/customer/orders/${order.id}`}
              className="block bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 hover:bg-white/[0.06] transition-colors">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">#{order.order_number || order.id.slice(0, 8)}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                    order.status === 'delivered' ? 'bg-emerald-500/20 text-emerald-400' :
                    order.status === 'preparing' ? 'bg-blue-500/20 text-blue-400' :
                    order.status === 'ready' ? 'bg-amber-500/20 text-amber-400' :
                    order.status === 'confirmed' ? 'bg-violet-500/20 text-violet-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {order.status === 'delivered' ? 'تم التسليم' :
                     order.status === 'preparing' ? 'قيد التحضير' :
                     order.status === 'ready' ? 'جاهز' :
                     order.status === 'confirmed' ? 'مؤكد' : order.status}
                  </span>
                </div>
                <span className="text-sm font-bold">{order.total?.toLocaleString('ar-EG')} ج.م</span>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-white/40">{new Date(order.created_at).toLocaleString('ar-EG')}</p>
                <button onClick={e => { e.preventDefault(); handleReorder(order.id); }}
                  className="text-[10px] px-2 py-1 rounded-lg bg-white/[0.06] text-emerald-400 hover:bg-white/[0.1]">
                  🔄 إعادة الطلب
                </button>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
