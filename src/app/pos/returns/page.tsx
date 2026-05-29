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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const newOrder = (payload.new as any);
          if (newOrder.status === 'completed' || newOrder.status === 'refunded') {
            setCompletedOrders(prev => {
              const idx = prev.findIndex(o => o.id === newOrder.id);
              if (idx >= 0) {
                const updated = [...prev];
                updated[idx] = newOrder;
                return updated;
              }
              const arr = [newOrder, ...prev];
              arr.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
              return arr.slice(0, 50);
            });
          } else if (payload.eventType === 'UPDATE') {
            setCompletedOrders(prev => prev.filter(o => o.id !== payload.old.id));
          }
        } else if (payload.eventType === 'DELETE') {
          setCompletedOrders(prev => prev.filter(o => o.id !== payload.old.id));
        }
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
      <div className="min-h-screen bg-gray-50/50 dark:bg-[#0f172a] p-4 sm:p-6 lg:p-8 font-sans transition-colors" dir="rtl">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">إدارة المرتجعات</h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">إرجاع أو استبدال المنتجات المباعة</p>
            </div>
            <Button onClick={() => window.location.href = '/pos'} className="shrink-0 bg-white dark:bg-white/10 hover:bg-gray-100 dark:hover:bg-white/20 text-gray-700 dark:text-white border border-gray-200 dark:border-0 rounded-xl transition-all shadow-sm">
              <Undo2 className="h-4 w-4 ml-2" /> رجوع للكاشير
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-5 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5 dark:opacity-10 text-emerald-500"><RotateCcw className="w-16 h-16" /></div>
              <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{formatCurrency((completedOrders || []).reduce((s: number, o: any) => s + (o.total || 0), 0))}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">قيمة المرتجعات (شهر)</p>
            </div>
            <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-5 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5 dark:opacity-10 text-blue-500"><ShoppingBag className="w-16 h-16" /></div>
              <p className="text-3xl font-black text-gray-900 dark:text-white">{(completedOrders || []).length}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">عدد طلبات الإرجاع</p>
            </div>
            <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-5 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5 dark:opacity-10 text-amber-500"><AlertTriangle className="w-16 h-16" /></div>
              <p className="text-3xl font-black text-gray-900 dark:text-white">{(completedOrders || []).length > 0 ? '2.3%' : '0%'}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">نسبة المرتجعات</p>
            </div>
          </div>

          {step === 'select' && (
            <div className="space-y-4">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
                </div>
              ) : (<>
              <div className="relative group max-w-xl">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 transition-colors group-focus-within:text-emerald-500" />
                <input type="text" placeholder="ابحث برقم الفاتورة أو المنتج..." className="h-14 w-full rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 pr-12 pl-4 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all shadow-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>

              {filtered.length === 0 ? (
                <div className="text-center py-20 text-gray-500 bg-white dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/10">لا توجد طلبات مكتملة أو مسترجعة</div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {filtered.map((order: any) => {
                    const isRefunded = order.status === 'refunded';
                    const pm = order.payment_method || order.paymentMethod || '';
                    return (
                      <motion.div
                        key={order.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`p-5 rounded-2xl border ${isRefunded ? 'bg-red-50 dark:bg-red-500/5 border-red-200 dark:border-red-500/20 opacity-70' : 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10 shadow-sm cursor-pointer'} transition-all`}
                        onClick={() => !isRefunded && handleSelectOrder(order)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0 pr-2">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <span className="font-mono text-xs text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-black/40 px-2 py-1 rounded-lg">{order.id}</span>
                              <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${isRefunded ? 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400' : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'}`}>
                                {isRefunded ? 'مسترجع' : 'مكتمل'}
                              </span>
                              <span className="text-[10px] px-2 py-1 rounded-full font-bold bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">{pm === 'cash' ? 'نقداً' : 'بطاقة'}</span>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 truncate mt-2">
                              {(order.items || []).map((i: any) => i.nameAr || i.name || '').join('، ')}
                            </p>
                          </div>
                          <div className="text-left shrink-0 pl-2">
                            <p className="text-xl font-black text-gray-900 dark:text-white">{formatCurrency(order.total || 0)}</p>
                            <p className="text-[10px] text-gray-500 mt-1">{formatDate(order.created_at || order.createdAt)}</p>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
              </>)}
            </div>
          )}

          {(step === 'items' || step === 'confirm') && selectedOrder && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-3xl">
              <div className="flex items-center justify-between bg-white dark:bg-white/5 p-4 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">إرجاع الطلب <span className="font-mono text-emerald-500 dark:text-emerald-400 text-sm ml-2">{selectedOrder.id}</span></h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">اختر الكميات المراد إرجاعها</p>
                </div>
                <Button variant="ghost" onClick={() => { setStep('select'); setSelectedOrder(null); }} className="hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-gray-300">
                  <X className="h-5 w-5 ml-2" /> إلغاء
                </Button>
              </div>

              <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-2 space-y-1">
                  {(selectedOrder.items || []).map((item: any, i: number) => {
                    const itemName = item.nameAr || item.name || '';
                    const key = `${itemName}-${i}`;
                    return (
                      <div key={key} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border-b border-gray-100 dark:border-white/5 last:border-0 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors rounded-xl gap-4">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-xl bg-gray-100 dark:bg-white/10 flex items-center justify-center shrink-0">
                            <ShoppingBag className="h-6 w-6 text-emerald-500 dark:text-emerald-400" />
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 dark:text-white text-sm sm:text-base">{itemName}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">{formatCurrency(item.price || 0)} × {item.quantity || 0}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 self-end sm:self-auto bg-gray-100 dark:bg-black/40 p-1.5 rounded-xl border border-gray-200 dark:border-white/5">
                          <span className="text-xs text-gray-500 dark:text-gray-400 px-2">الإرجاع:</span>
                          <div className="flex items-center gap-1">
                            <button onClick={() => handleQuantityChange(key, item.quantity || 0, (returnItems[key] || 0) - 1)} className="h-8 w-8 rounded-lg bg-white dark:bg-white/10 hover:bg-gray-50 dark:hover:bg-white/20 flex items-center justify-center text-gray-700 dark:text-white transition-colors border border-gray-200 dark:border-0 shadow-sm">-</button>
                            <span className="h-8 w-10 flex items-center justify-center font-bold text-gray-900 dark:text-white text-sm">{returnItems[key] || 0}</span>
                            <button onClick={() => handleQuantityChange(key, item.quantity || 0, (returnItems[key] || 0) + 1)} className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-500/30 flex items-center justify-center transition-colors shadow-sm">+</button>
                          </div>
                          <span className="text-sm font-black w-24 text-left text-gray-900 dark:text-white px-2 border-r border-gray-300 dark:border-white/10">{formatCurrency((item.price || 0) * (returnItems[key] || 0))}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl shadow-sm p-6 space-y-6">
                <div>
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 block">سبب الإرجاع</label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="h-14 w-full rounded-2xl border border-gray-300 dark:border-white/10 bg-gray-50 dark:bg-black/40 px-4 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all appearance-none"
                    style={{ backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")', backgroundRepeat: 'no-repeat', backgroundPosition: 'left 1rem center', backgroundSize: '1em' }}
                  >
                    <option value="" className="text-gray-900">اختر سبب الإرجاع...</option>
                    <option value="defective" className="text-gray-900">منتج تالف</option>
                    <option value="expired" className="text-gray-900">منتهي الصلاحية</option>
                    <option value="wrong_item" className="text-gray-900">منتج خطأ</option>
                    <option value="customer_request" className="text-gray-900">طلب العميل</option>
                    <option value="damaged" className="text-gray-900">تلف أثناء التوصيل</option>
                  </select>
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pt-6 border-t border-gray-200 dark:border-white/10 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">إجمالي قيمة المرتجع</p>
                    <p className="text-3xl font-black text-red-500 dark:text-red-400 mt-1">{formatCurrency(totalReturn)}</p>
                  </div>
                  <div className="flex gap-3 w-full sm:w-auto">
                    {step === 'items' ? (
                      <Button onClick={() => setStep('confirm')} disabled={totalReturn <= 0} className="w-full sm:w-auto px-8 h-12 rounded-xl font-bold bg-gray-900 dark:bg-white/10 text-white hover:bg-gray-800 dark:hover:bg-white/20 transition-all border-0 shadow-md disabled:opacity-50">
                        مراجعة الإرجاع
                      </Button>
                    ) : (
                      <>
                        <Button variant="ghost" onClick={() => setStep('items')} className="h-12 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 px-6">تعديل</Button>
                        <Button onClick={handleConfirmReturn} className="w-full sm:w-auto h-12 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold shadow-[0_0_20px_rgba(239,68,68,0.3)] transition-all px-8 border-0">
                          <RotateCcw className="h-5 w-5 ml-2" /> تأكيد الإرجاع النهائي
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
