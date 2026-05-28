'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, TrendingUp, DollarSign, Package, ShoppingBag, Calendar, Activity } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store/auth-store';
import { cn } from '@/lib/utils';

const supabase = createClient();

interface ReportStats {
  totalSales: number;
  orderCount: number;
  cashSales: number;
  cardSales: number;
  topSelling: { name: string; qty: number }[];
}

export function CashierReportsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'today'|'week'|'month'>('today');

  useEffect(() => {
    if (!isOpen || !user) return;
    async function loadStats() {
      setLoading(true);
      try {
        let fromDate = new Date();
        if (period === 'today') {
          fromDate.setHours(0,0,0,0);
        } else if (period === 'week') {
          fromDate.setDate(fromDate.getDate() - 7);
        } else {
          fromDate.setMonth(fromDate.getMonth() - 1);
        }
        
        const { data: orders } = await supabase
          .from('orders')
          .select('*, order_items(*)')
          .eq('cashier_id', user!.id)
          .gte('created_at', fromDate.toISOString());

        if (orders) {
          let total = 0, cash = 0, card = 0, count = orders.length;
          const itemsMap: Record<string, number> = {};
          
          orders.forEach(o => {
            total += o.total_amount || 0;
            if (o.payment_method === 'cash' || o.payment_method === 'نقدي') cash += o.total_amount;
            else card += o.total_amount;
            
            o.order_items?.forEach((item: any) => {
              itemsMap[item.product_name] = (itemsMap[item.product_name] || 0) + item.quantity;
            });
          });

          const top = Object.entries(itemsMap)
            .map(([name, qty]) => ({ name, qty }))
            .sort((a,b) => b.qty - a.qty).slice(0, 5);

          setStats({ totalSales: total, orderCount: count, cashSales: cash, cardSales: card, topSelling: top });
        }
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, [isOpen, user, period]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[999]" onClick={onClose} />
          <motion.div initial={{opacity:0, scale:0.95, y:20}} animate={{opacity:1, scale:1, y:0}} exit={{opacity:0, scale:0.95, y:20}} 
            className="fixed inset-0 m-auto w-[95%] max-w-2xl h-fit max-h-[85vh] bg-white dark:bg-[#1C1C1E] rounded-[2rem] shadow-2xl z-[1000] overflow-hidden flex flex-col border border-white/20" dir="rtl">
            
            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-white/10 bg-gray-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <Activity className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-l from-gray-900 to-gray-600 dark:from-white dark:to-gray-300">تقارير الكاشير</h2>
                  <p className="text-sm text-gray-500">ملخص الأداء والمبيعات ({user?.nameAr || user?.name})</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex p-4 gap-2 bg-white dark:bg-[#1C1C1E] border-b border-gray-100 dark:border-white/5 overflow-x-auto scrollbar-hide">
              {[
                { id: 'today', label: 'اليوم' },
                { id: 'week', label: 'هذا الأسبوع' },
                { id: 'month', label: 'هذا الشهر' }
              ].map(p => (
                <button key={p.id} onClick={() => setPeriod(p.id as any)}
                  className={cn("px-5 py-2 rounded-full text-sm font-bold transition-all", period === p.id ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20" : "bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700")}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="p-6 overflow-y-auto flex-1 bg-gray-50/30 dark:bg-black/20">
              {loading ? (
                <div className="flex justify-center items-center py-20 text-emerald-500"><TrendingUp className="w-8 h-8 animate-bounce" /></div>
              ) : stats ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-slate-800/80 p-4 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
                      <p className="text-xs font-bold text-gray-500 mb-1 flex items-center gap-1"><DollarSign className="w-3 h-3 text-emerald-500"/> الإجمالي</p>
                      <h3 className="text-2xl font-black text-gray-900 dark:text-white">{stats.totalSales.toFixed(2)}<span className="text-sm font-normal text-gray-400 ml-1">ج.م</span></h3>
                    </div>
                    <div className="bg-white dark:bg-slate-800/80 p-4 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
                      <p className="text-xs font-bold text-gray-500 mb-1 flex items-center gap-1"><ShoppingBag className="w-3 h-3 text-blue-500"/> الطلبات</p>
                      <h3 className="text-2xl font-black text-gray-900 dark:text-white">{stats.orderCount}</h3>
                    </div>
                    <div className="bg-white dark:bg-slate-800/80 p-4 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
                      <p className="text-xs font-bold text-gray-500 mb-1 flex items-center gap-1"><DollarSign className="w-3 h-3 text-green-500"/> مبيعات نقدية</p>
                      <h3 className="text-xl font-bold text-gray-700 dark:text-gray-200">{stats.cashSales.toFixed(2)}</h3>
                    </div>
                    <div className="bg-white dark:bg-slate-800/80 p-4 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
                      <p className="text-xs font-bold text-gray-500 mb-1 flex items-center gap-1"><DollarSign className="w-3 h-3 text-purple-500"/> مبيعات بطاقة</p>
                      <h3 className="text-xl font-bold text-gray-700 dark:text-gray-200">{stats.cardSales.toFixed(2)}</h3>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-800/50 rounded-3xl p-5 border border-gray-100 dark:border-white/5 shadow-sm">
                    <h3 className="text-sm font-bold flex items-center gap-2 mb-4 text-gray-800 dark:text-gray-200"><TrendingUp className="w-4 h-4 text-emerald-500" /> الأكثر مبيعاً (من مبيعاتك)</h3>
                    <div className="space-y-3">
                      {stats.topSelling.length > 0 ? stats.topSelling.map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-900/50 rounded-xl">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">{i+1}</div>
                            <span className="font-semibold text-sm">{item.name}</span>
                          </div>
                          <span className="text-sm font-bold bg-white dark:bg-slate-800 px-3 py-1 rounded-lg border border-gray-100 dark:border-white/10 shadow-sm">{item.qty} وحدة</span>
                        </div>
                      )) : <p className="text-sm text-gray-500 text-center py-4">لا توجد مبيعات في هذه الفترة</p>}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
