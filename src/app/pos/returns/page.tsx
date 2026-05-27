'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, RotateCcw, ShoppingBag, CheckCircle, X, Undo2, Printer, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatDate } from '@/lib/utils';
import { usePOSStore } from '@/lib/pos/pos-store';
import { PageTransition } from '@/components/ui/page-transition';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

export default function ReturnsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [completedOrders, setCompletedOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [returnItems, setReturnItems] = useState<Record<string, number>>({});
  const [reason, setReason] = useState('');
  const [step, setStep] = useState<'select' | 'items' | 'confirm'>('select');

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('orders')
        .select('*')
        .in('status', ['completed', 'refunded'])
        .order('created_at', { ascending: false })
        .limit(50);
      if (data) setCompletedOrders(data);
      setLoading(false);
    };
    fetchOrders();

    const channel = supabase
      .channel('returns-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchOrders();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const filtered = (completedOrders || []).filter(
    (o: any) => (o.id || '').includes(search) || (o.items || []).some((i: any) => (i.nameAr || i.name || '').includes(search))
  );

  const handleSelectOrder = (order: any) => {
    setSelectedOrder(order);
    const initial: Record<string, number> = {};
    order.items.forEach((item: any, i: number) => { initial[`${item.nameAr}-${i}`] = 0; });
    setReturnItems(initial);
    setStep('items');
  };

  const handleQuantityChange = (key: string, maxQty: number, value: number) => {
    setReturnItems((prev) => ({ ...prev, [key]: Math.max(0, Math.min(value, maxQty)) }));
  };

  const totalReturn = selectedOrder
    ? Object.entries(returnItems).reduce((sum, [key, qty]) => {
        const idx = parseInt(key.split('-').pop() || '0');
        const item = selectedOrder.items[idx];
        return sum + (item?.price || 0) * qty;
      }, 0)
    : 0;

  const handleConfirmReturn = async () => {
    if (totalReturn <= 0) { toast.error('اختر منتجات للإرجاع'); return; }
    if (!reason) { toast.error('أدخل سبب الإرجاع'); return; }
    
    try {
      const { error } = await supabase.from('orders').update({ status: 'refunded' }).eq('id', selectedOrder.id);
      if (error) throw error;
      
      toast.success(`تم إرجاع ${Object.values(returnItems).reduce((a, b) => a + b, 0)} قطعة بقيمة ${formatCurrency(totalReturn)}`);
      setStep('select');
      setSelectedOrder(null);
      setReason('');
    } catch (e: any) {
      toast.error('فشل في حفظ المرتجع: ' + e.message);
    }
  };

  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">إدارة المرتجعات</h1>
            <p className="text-muted-foreground">إرجاع أو استبدال المنتجات المباعة</p>
          </div>
          <Button variant="outline" onClick={() => router.push('/pos')} className="shrink-0">
            <Undo2 className="h-4 w-4 ml-2" /> رجوع للكاشير
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card><CardContent className="p-4"><p className="text-2xl font-bold">{formatCurrency((completedOrders || []).reduce((s: number, o: any) => s + (o.total || 0), 0))}</p><p className="text-xs text-muted-foreground">قيمة المرتجعات (شهر)</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-2xl font-bold">{(completedOrders || []).length}</p><p className="text-xs text-muted-foreground">عدد طلبات الإرجاع</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-2xl font-bold">{(completedOrders || []).length > 0 ? '2.3%' : '0%'}</p><p className="text-xs text-muted-foreground">نسبة المرتجعات</p></CardContent></Card>
        </div>

        {step === 'select' && (
          <div className="space-y-3">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <p className="text-muted-foreground">جاري تحميل البيانات...</p>
              </div>
            ) : (<>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input type="text" placeholder="ابحث برقم الفاتورة أو المنتج..." className="h-11 w-full rounded-xl border border-input bg-background pr-10 pl-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>

            {filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">لا توجد بيانات</div>
            ) : filtered.map((order: any) => {
              const isRefunded = order.status === 'refunded';
              const pm = order.payment_method || order.paymentMethod || '';
              return (
                <motion.div
                  key={order.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`p-4 rounded-xl border ${isRefunded ? 'bg-muted/30 opacity-60' : 'bg-card hover:shadow-sm'} transition-all cursor-pointer`}
                  onClick={() => !isRefunded && handleSelectOrder(order)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium">{order.id}</span>
                        <Badge variant={isRefunded ? 'secondary' : 'success'}>
                          {isRefunded ? 'مسترجع' : 'مكتمل'}
                        </Badge>
                        <Badge variant="outline">{pm === 'cash' ? 'نقداً' : 'بطاقة'}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {(order.items || []).map((i: any) => i.nameAr || i.name || '').join('، ')}
                      </p>
                    </div>
                    <div className="text-left">
                      <p className="text-lg font-bold">{formatCurrency(order.total || 0)}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(order.created_at || order.createdAt)}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
            </>)}
          </div>
        )}

        {(step === 'items' || step === 'confirm') && selectedOrder && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">إرجاع الطلب {selectedOrder.id}</h2>
                <p className="text-sm text-muted-foreground">اختر الكميات المراد إرجاعها</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => { setStep('select'); setSelectedOrder(null); }}>
                <X className="h-4 w-4 ml-1" /> إلغاء
              </Button>
            </div>

            <Card>
              <CardContent className="p-0">
                {(selectedOrder.items || []).map((item: any, i: number) => {
                  const itemName = item.nameAr || item.name || '';
                  const key = `${itemName}-${i}`;
                  return (
                    <div key={key} className="flex items-center justify-between p-4 border-b last:border-0">
                      <div className="flex items-center gap-3">
                        <ShoppingBag className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{itemName}</p>
                          <p className="text-sm text-muted-foreground">{formatCurrency(item.price || 0)} × {item.quantity || 0}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">الإرجاع:</span>
                        <div className="flex items-center border rounded-lg">
                          <button
                            onClick={() => handleQuantityChange(key, item.quantity || 0, (returnItems[key] || 0) - 1)}
                            className="h-8 w-8 flex items-center justify-center hover:bg-accent"
                          >-</button>
                          <span className="h-8 w-10 flex items-center justify-center border-x text-sm font-medium tabular-nums">{returnItems[key] || 0}</span>
                          <button
                            onClick={() => handleQuantityChange(key, item.quantity || 0, (returnItems[key] || 0) + 1)}
                            className="h-8 w-8 flex items-center justify-center hover:bg-accent"
                          >+</button>
                        </div>
                        <span className="text-sm font-medium w-20 text-left">{formatCurrency((item.price || 0) * (returnItems[key] || 0))}</span>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 space-y-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">سبب الإرجاع</label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">اختر سبب الإرجاع...</option>
                    <option value="defective">منتج تالف</option>
                    <option value="expired">منتهي الصلاحية</option>
                    <option value="wrong_item">منتج خطأ</option>
                    <option value="customer_request">طلب العميل</option>
                    <option value="damaged">تلف أثناء التوصيل</option>
                  </select>
                </div>

                <div className="flex justify-between items-center pt-2 border-t">
                  <div>
                    <p className="text-sm text-muted-foreground">إجمالي الإرجاع</p>
                    <p className="text-2xl font-bold text-red-500">{formatCurrency(totalReturn)}</p>
                  </div>
                  <div className="flex gap-2">
                    {step === 'items' ? (
                      <Button onClick={() => setStep('confirm')} disabled={totalReturn <= 0}>
                        مراجعة الإرجاع
                      </Button>
                    ) : (
                      <>
                        <Button variant="outline" onClick={() => setStep('items')}>تعديل</Button>
                        <Button className="bg-red-500 hover:bg-red-600" onClick={handleConfirmReturn}>
                          <RotateCcw className="h-4 w-4 ml-1" /> تأكيد الإرجاع
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </PageTransition>
  );
}
