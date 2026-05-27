'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RoleGuard } from '@/components/layout/role-guard';
import { Truck, Package, Clock, TrendingUp, Wallet, LogOut } from 'lucide-react';
import { useAuthStore } from '@/lib/store/auth-store';
import { formatCurrency } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { logoutUser } from '@/lib/supabase/auth';
import { purchaseOrderService } from '@/lib/supabase/services/procurement';
import { productService } from '@/lib/supabase/services/products';
import toast from 'react-hot-toast';

export default function SupplierDashboard() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [productCount, setProductCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [posRes, productsRes] = await Promise.all([
        purchaseOrderService.getAll(),
        productService.getAll({ limit: 1 }),
      ]);
      setPurchaseOrders(posRes?.data || []);
      setProductCount(productsRes?.count || 0);
    } catch {
      toast.error('فشل تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    logout();
    router.push('/login');
  };

  const totalSales = purchaseOrders
    .filter((po) => po.status === 'delivered')
    .reduce((s, po) => s + (po.total || 0), 0);

  const pendingOrders = purchaseOrders.filter((po) => po.status === 'pending').length;

  const statusVariant = (status: string) => {
    if (status === 'delivered') return 'success' as const;
    if (status === 'approved') return 'info' as const;
    return 'warning' as const;
  };
  const statusLabel = (status: string) => {
    if (status === 'delivered') return 'تم التوصيل';
    if (status === 'approved') return 'تمت الموافقة';
    return 'قيد الانتظار';
  };

  if (loading) {
    return (
      <RoleGuard roles={['supplier']}>
        <div className="min-h-screen bg-background max-w-4xl mx-auto p-6 flex items-center justify-center">
          <div className="animate-spin h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
        </div>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard roles={['supplier']}>
      <div className="min-h-screen bg-background max-w-4xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                <Truck className="h-6 w-6 text-indigo-600 dark:text-indigo-300" />
              </div>
              <div>
                <h1 className="text-xl font-bold">بوابة المورد</h1>
                <p className="text-sm text-muted-foreground">{user?.name} • {user?.email}</p>
              </div>
            </div>
          </div>
          <Button variant="ghost" onClick={handleLogout}><LogOut className="h-4 w-4 ml-1" /> تسجيل خروج</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card><CardContent className="p-4"><div className="flex items-center gap-3"><Package className="h-5 w-5 text-primary" /><div><p className="text-lg font-bold">{productCount}</p><p className="text-xs text-muted-foreground">منتجات موردّة</p></div></div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="flex items-center gap-3"><TrendingUp className="h-5 w-5 text-emerald-500" /><div><p className="text-lg font-bold">{formatCurrency(totalSales)}</p><p className="text-xs text-muted-foreground">إجمالي المبيعات</p></div></div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="flex items-center gap-3"><Clock className="h-5 w-5 text-amber-500" /><div><p className="text-lg font-bold">{pendingOrders}</p><p className="text-xs text-muted-foreground">طلبات معلقة</p></div></div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="flex items-center gap-3"><Wallet className="h-5 w-5 text-blue-500" /><div><p className="text-lg font-bold">{formatCurrency(totalSales * 0.2)}</p><p className="text-xs text-muted-foreground">مستحقات (تقديرية)</p></div></div></CardContent></Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-base">طلبات التوريد</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {purchaseOrders.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">لا توجد طلبات توريد</p>
              )}
              {purchaseOrders.slice(0, 10).map((po) => (
                <div key={po.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div><p className="text-sm font-medium">{po.order_number || po.id}</p><p className="text-xs text-muted-foreground">{po.created_at?.slice(0, 10)} • {po.items_count || 0} منتج</p></div>
                  <div className="text-left"><p className="text-sm font-semibold">{formatCurrency(po.total || 0)}</p>
                    <Badge variant={statusVariant(po.status)}>{statusLabel(po.status)}</Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">منتجاتي</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center py-4">لديك {productCount} منتج مسجل في المنصة</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </RoleGuard>
  );
}
