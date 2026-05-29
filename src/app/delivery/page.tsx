'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageTransition } from '@/components/ui/page-transition';
import { motion } from 'framer-motion';
import { Truck, MapPin, Phone, User, Clock, CheckCircle, XCircle, Navigation, Search } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useAuthStore } from '@/lib/store/auth-store';
import { deliveryService, type Delivery } from '@/lib/supabase/services/deliveries';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: 'في الانتظار', color: 'bg-slate-100 text-slate-800', icon: Clock },
  assigned: { label: 'تم التعيين', color: 'bg-blue-100 text-blue-800', icon: User },
  picked: { label: 'تم التحميل', color: 'bg-indigo-100 text-indigo-800', icon: Truck },
  in_transit: { label: 'قيد التوصيل', color: 'bg-amber-100 text-amber-800', icon: Navigation },
  delivered: { label: 'تم التوصيل', color: 'bg-emerald-100 text-emerald-800', icon: CheckCircle },
  failed: { label: 'فشل', color: 'bg-red-100 text-red-800', icon: XCircle },
};

const statusSteps = ['pending', 'assigned', 'picked', 'in_transit', 'delivered'];

export default function DeliveryPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const fetchDeliveries = useCallback(async () => {
    try {
      const { data } = await deliveryService.getAll();
      setDeliveries(data || []);
    } catch {
      toast.error('فشل تحميل التوصيلات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) { router.replace('/login'); return; }
    const allowedRoles = ['delivery', 'manager', 'admin'];
    if (!allowedRoles.includes(user?.role || '')) {
      toast.error('هذه الصفحة متاحة لمندوبي التوصيل والإدارة فقط');
      const roleRoutes: Record<string, string> = {
        cashier: '/pos', customer: '/shop', accountant: '/accounting',
        warehouse: '/inventory', sales: '/pos', supplier: '/supplier-dashboard', purchase: '/purchase-orders',
      };
      router.replace(roleRoutes[user?.role || ''] || '/dashboard');
    }
  }, [isAuthenticated, user, router]);

  useEffect(() => {
    fetchDeliveries();
    const supabase = createClient();
    if (!supabase) {
       // Just fallback to polling if supabase is completely unavailable somehow
       return;
    }
    const channel = supabase.channel('delivery-manager-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deliveries' }, (payload: any) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          setDeliveries((prev: any[]) => {
            const idx = prev.findIndex(d => d.id === (payload.new as any).id);
            if (idx >= 0) {
              const updated = [...prev];
              updated[idx] = { ...updated[idx], ...(payload.new as any) };
              return updated;
            }
            return [(payload.new as any), ...prev].slice(0, 50);
          });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchDeliveries]);

  if (!isAuthenticated || !['delivery', 'manager', 'admin'].includes(user?.role || '')) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="animate-spin h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="animate-spin h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const filtered = deliveries.filter((d) => {
    const ms = d.order_id?.includes(search) || d.customer_name?.includes(search) || d.customer_address?.includes(search);
    const ms2 = statusFilter === 'all' || d.status === statusFilter;
    return ms && ms2;
  });

  const activeCount = deliveries.filter((d) => d.status !== 'delivered').length;
  const todayDelivered = deliveries.filter((d) => d.status === 'delivered').length;
  const pendingCount = deliveries.filter((d) => d.status === 'pending').length;

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2"><Truck className="h-6 w-6 text-primary" /><h1 className="text-2xl font-bold">إدارة التوصيل</h1></div>
            <p className="text-muted-foreground">تتبع وإدارة طلبات التوصيل في الوقت الفعلي</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card><CardContent className="p-4"><p className="text-2xl font-bold text-emerald-600">{activeCount}</p><p className="text-xs text-muted-foreground">قيد التوصيل</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-2xl font-bold">{todayDelivered}</p><p className="text-xs text-muted-foreground">تم التوصيل اليوم</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-2xl font-bold text-amber-600">{pendingCount}</p><p className="text-xs text-muted-foreground">في الانتظار</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-2xl font-bold">{deliveries.length}</p><p className="text-xs text-muted-foreground">إجمالي التوصيلات</p></CardContent></Card>
        </div>

        <div className="flex gap-2 flex-wrap">
          <div className="flex-1 relative min-w-[200px]">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input type="text" placeholder="بحث برقم الطلب أو العميل..." className="h-10 w-full rounded-lg border border-input bg-background pr-10 pl-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        <div className="space-y-3">
          {filtered.map((d) => {
            const config = statusConfig[d.status];
            const Icon = config?.icon || Clock;
            const stepIndex = statusSteps.indexOf(d.status);

            return (
              <motion.div key={d.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Card className="hover:shadow-md transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold">{d.order_id}</span>
                          <Badge className={config?.color}><Icon className="h-3 w-3 ml-1" />{config?.label}</Badge>
                        </div>
                        <div className="flex items-center gap-1 text-sm"><User className="h-3 w-3 text-muted-foreground" /> {d.customer_name}</div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5"><MapPin className="h-3 w-3" /> {d.customer_address}</div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground"><Phone className="h-3 w-3" /> {d.customer_phone}</div>
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          <span className="font-medium">{formatCurrency(d.delivery_fee)}</span>
                          <span className="text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> ~{d.estimated_minutes} دقيقة</span>
                        </div>
                        <div className="flex items-center gap-1 mt-3">
                          {statusSteps.map((step, i) => (
                            <div key={step} className="flex items-center">
                              <div className={`h-2.5 w-2.5 rounded-full ${i <= stepIndex ? 'bg-primary' : 'bg-muted'}`} />
                              {i < statusSteps.length - 1 && <div className={`h-0.5 w-8 ${i < stepIndex ? 'bg-primary' : 'bg-muted'}`} />}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5 mr-4">
                        <Button variant="outline" size="sm"><Phone className="h-3 w-3 ml-1" /> اتصال</Button>
                        <Button variant="outline" size="sm"><MapPin className="h-3 w-3 ml-1" /> تتبع</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Truck className="h-16 w-16 mx-auto mb-3 opacity-30" />
              <p>لا توجد توصيلات</p>
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
