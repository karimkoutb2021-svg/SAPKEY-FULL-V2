'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RoleGuard } from '@/components/layout/role-guard';
import { Truck, Navigation, MapPin, Phone, User, Clock, CheckCircle, XCircle, LogOut, Package, Bell } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useAuthStore } from '@/lib/store/auth-store';
import { deliveryService, type Delivery } from '@/lib/supabase/services/deliveries';
import { logoutUser } from '@/lib/supabase/auth';
import toast from 'react-hot-toast';

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  assigned: { label: 'طلب جديد', color: 'bg-blue-500 text-white', icon: Bell },
  picked: { label: 'تم التحميل', color: 'bg-indigo-500 text-white', icon: Package },
  in_transit: { label: 'قيد التوصيل', color: 'bg-amber-500 text-white', icon: Navigation },
  delivered: { label: 'تم التوصيل', color: 'bg-emerald-500 text-white', icon: CheckCircle },
};

export default function DriverDashboard() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [driverOrders, setDriverOrders] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');

  const fetchOrders = useCallback(async () => {
    if (!user?.id) return;
    try {
      const data = await deliveryService.getByDriver(user.id);
      setDriverOrders(data || []);
    } catch {
      toast.error('فشل تحميل الطلبات');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchOrders();
    const channel = deliveryService['subscribeToAllDeliveries']?.(() => fetchOrders());
    return () => { if (channel) channel.then(fn => fn()); };
  }, [fetchOrders]);

  useEffect(() => {
    const supabase = (deliveryService as any).__supabase || null;
    if (!supabase || !user?.id) return;
    const channel = supabase.channel(`driver-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deliveries', filter: `driver_id=eq.${user.id}` }, () => fetchOrders())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, fetchOrders]);

  const handleLogout = async () => {
    await logoutUser();
    logout();
    router.push('/login');
  };

  const activeOrders = driverOrders.filter((o) => o.status !== 'delivered');
  const completedOrders = driverOrders.filter((o) => o.status === 'delivered');
  const earnings = completedOrders.reduce((s, o) => s + (o.delivery_fee || 0), 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30 max-w-lg mx-auto flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <RoleGuard roles={['delivery']}>
      <div className="min-h-screen bg-muted/30 max-w-lg mx-auto pb-24">
        <div className="bg-primary text-primary-foreground p-4 pb-8 rounded-b-3xl shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center"><Truck className="h-5 w-5" /></div>
              <div><h1 className="font-bold text-lg">مرحباً، {user?.name || 'مندوب'}</h1><p className="text-xs opacity-80">متصل • جاهز للطلبات</p></div>
            </div>
            <div className="flex gap-1">
              <button className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center"><Bell className="h-4 w-4" /></button>
              <button onClick={handleLogout} className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center"><LogOut className="h-4 w-4" /></button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white/10 rounded-xl p-2.5 text-center backdrop-blur-sm"><p className="text-2xl font-bold">{activeOrders.length}</p><p className="text-[10px] opacity-80">طلبات نشطة</p></div>
            <div className="bg-white/10 rounded-xl p-2.5 text-center backdrop-blur-sm"><p className="text-2xl font-bold">{completedOrders.length}</p><p className="text-[10px] opacity-80">تم التوصيل</p></div>
            <div className="bg-white/10 rounded-xl p-2.5 text-center backdrop-blur-sm"><p className="text-2xl font-bold">{formatCurrency(earnings)}</p><p className="text-[10px] opacity-80">أرباح اليوم</p></div>
          </div>
        </div>

        <div className="flex gap-1 mx-4 -mt-4 mb-4 bg-card rounded-xl p-1 shadow-sm border">
          <button onClick={() => setActiveTab('active')} className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'active' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground'}`}>طلباتي ({activeOrders.length})</button>
          <button onClick={() => setActiveTab('history')} className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'history' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground'}`}>السجل ({completedOrders.length})</button>
        </div>

        <div className="px-4 space-y-3">
          {(activeTab === 'active' ? activeOrders : completedOrders).map((order) => {
            const config = statusConfig[order.status] || statusConfig['assigned'];
            const Icon = config?.icon || Package;
            const eta = order.status === 'in_transit'
              ? `${Math.max(1, Math.round((order.estimated_minutes - (order.actual_minutes || 0)) / 60))} دقيقة`
              : order.status === 'delivered' ? 'تم التوصيل' : undefined;
            return (
              <motion.div key={order.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} whileTap={{ scale: 0.98 }} onClick={() => router.push(`/delivery/driver/orders/${order.id}`)}>
                <Card className="overflow-hidden cursor-pointer">
                  <CardContent className="p-0">
                    <div className={`px-4 py-1.5 text-xs font-medium flex items-center gap-1.5 ${config?.color || 'bg-muted'}`}>
                      <Icon className="h-3 w-3" />{config?.label || order.status}
                      {eta && <span className="mr-auto">{eta}</span>}
                    </div>
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2"><span className="font-semibold">{order.order_id}</span></div>
                          <p className="text-sm mt-1">{order.customer_name}</p>
                        </div>
                        <span className="text-lg font-bold text-primary">{formatCurrency(order.delivery_fee)}</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="h-3 w-3 shrink-0" /><span className="line-clamp-1">{order.customer_address}</span></div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5"><Phone className="h-3 w-3 shrink-0" />{order.customer_phone}</div>
                      {order.status === 'assigned' && (
                        <div className="flex gap-2 mt-3">
                          <Button size="sm" className="flex-1" onClick={(e) => { e.stopPropagation(); router.push(`/delivery/driver/orders/${order.id}`); }}><Navigation className="h-3 w-3 ml-1" /> بدء التوصيل</Button>
                          <Button size="sm" variant="outline" className="h-9 w-9" onClick={(e) => e.stopPropagation()}><Phone className="h-4 w-4" /></Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
          {activeTab === 'active' && activeOrders.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Truck className="h-16 w-16 mx-auto mb-3 opacity-30" />
              <p className="font-medium">لا توجد طلبات نشطة</p>
              <p className="text-sm">بإنتظار طلب جديد...</p>
            </div>
          )}
        </div>

        <div className="fixed bottom-0 left-0 right-0 bg-card border-t max-w-lg mx-auto">
          <div className="flex justify-around py-2">
            {[{ icon: Navigation, label: 'طلباتي', active: true }, { icon: MapPin, label: 'الخريطة' }, { icon: Truck, label: 'المسار' }, { icon: User, label: 'حسابي' }].map(({ icon: Icon, label, active }) => (
              <button key={label} className={`flex flex-col items-center gap-0.5 px-4 py-1 ${active ? 'text-primary' : 'text-muted-foreground'}`}>
                <Icon className="h-5 w-5" /><span className="text-[10px]">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}
