'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, getOrderStatusConfig } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { Search, Eye, Loader2 } from 'lucide-react';

const supabase = createClient();

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchOrders();
    const channel = supabase.channel('orders-list-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          setOrders(prev => {
            const idx = prev.findIndex(o => o.id === (payload.new as any).id);
            if (idx >= 0) {
              const updated = [...prev];
              updated[idx] = (payload.new as any);
              return updated;
            }
            return [(payload.new as any), ...prev].sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 50);
          });
        } else if (payload.eventType === 'DELETE') {
          setOrders(prev => prev.filter(o => o.id !== payload.old.id));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchOrders = async () => {
    try {
      const { data } = await supabase.from('orders').select('id, order_number, customer_name, customer_phone, total, status, payment_status, payment_method, created_at, items, notes').order('created_at', { ascending: false }).limit(50);
      if (data) setOrders(data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  const filtered = orders.filter((o) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (o.order_number || '').toLowerCase().includes(q) || (o.customer_name || '').toLowerCase().includes(q) || (o.id || '').toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4 md:space-y-6 max-w-7xl mx-auto px-2 md:px-4" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-lg md:text-2xl font-bold">الطلبات</h1>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <>
          <div className="relative max-w-xs">
            <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
            <input type="text" placeholder="بحث..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full h-8 md:h-10 rounded-lg border pr-8 pl-2.5 text-[10px] md:text-sm" />
          </div>

          <Card className="shadow-sm">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-[10px] md:text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-right p-2 md:p-3 font-medium text-muted-foreground">رقم الطلب</th>
                      <th className="text-right p-2 md:p-3 font-medium text-muted-foreground">العميل</th>
                      <th className="text-left p-2 md:p-3 font-medium text-muted-foreground">الإجمالي</th>
                      <th className="text-center p-2 md:p-3 font-medium text-muted-foreground">الحالة</th>
                      <th className="text-center p-2 md:p-3 font-medium text-muted-foreground">الدفع</th>
                      <th className="text-center p-2 md:p-3 font-medium text-muted-foreground">التاريخ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((order) => {
                      const statusConfig = getOrderStatusConfig(order.status);
                      return (
                        <tr key={order.id} className="border-b hover:bg-accent/50 transition-colors">
                          <td className="p-2 md:p-3 font-mono">{order.order_number || order.id?.substring(0, 8) || '---'}</td>
                          <td className="p-2 md:p-3">{order.customer_name || 'ضيف'}</td>
                          <td className="p-2 md:p-3 text-left font-bold tabular-nums">{formatCurrency(order.total)}</td>
                          <td className="p-2 md:p-3 text-center">
                            <Badge className={`${statusConfig.color} border-0 text-[9px] md:text-xs`}>{statusConfig.labelAr}</Badge>
                          </td>
                          <td className="p-2 md:p-3 text-center text-muted-foreground">{order.payment_method}</td>
                          <td className="p-2 md:p-3 text-center text-muted-foreground">{new Date(order.created_at).toLocaleDateString('ar-EG')}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {filtered.length === 0 && <div className="text-center py-8 text-muted-foreground">لا توجد طلبات</div>}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
