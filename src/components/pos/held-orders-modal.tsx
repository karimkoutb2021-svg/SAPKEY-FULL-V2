'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, Play, Trash2, ShoppingCart, RefreshCw } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { heldOrderService } from '@/lib/supabase/services/held-orders';
import toast from 'react-hot-toast';

interface HeldOrder {
  id: string;
  cashier_id: string;
  customer_name: string;
  items: any[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  notes: string;
  created_at: string;
}

interface HeldOrdersProps {
  isOpen: boolean;
  onClose: () => void;
  onResume: (order: HeldOrder) => void;
  cashierId: string;
  refreshKey?: number;
}

export function HeldOrdersModal({ isOpen, onClose, onResume, cashierId, refreshKey }: HeldOrdersProps) {
  const [heldOrders, setHeldOrders] = useState<HeldOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) loadHeldOrders();
  }, [isOpen, refreshKey]);

  async function loadHeldOrders() {
    setLoading(true);
    try {
      const orders = await heldOrderService.getAll(cashierId);
      setHeldOrders(orders);
    } catch (e) {
      console.error('Failed to load held orders:', e);
    }
    setLoading(false);
  }

  async function deleteHeldOrder(id: string) {
    try {
      await heldOrderService.delete(id, cashierId);
      setHeldOrders(prev => prev.filter(o => o.id !== id));
      toast.success('تم حذف الفاتورة المعلقة');
    } catch (e: any) {
      toast.error(e.message || 'فشل حذف الفاتورة');
    }
  }

  async function resumeOrder(order: HeldOrder) {
    try {
      await heldOrderService.delete(order.id, cashierId);
    } catch {
      // Already deleted from localStorage in service
    }
    onResume(order);
    onClose();
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={onClose} />
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-950 rounded-t-3xl shadow-2xl max-h-[80vh] overflow-y-auto max-w-lg mx-auto" dir="rtl">
            <div className="flex justify-center pt-3 pb-1"><div className="h-1 w-12 rounded-full bg-gray-300 dark:bg-slate-600" /></div>
            <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-gray-900 dark:text-white">الفواتير المعلقة</h3>
                <p className="text-xs text-gray-400">{heldOrders.length} فاتورة</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={loadHeldOrders} className="h-9 w-9 rounded-xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center">
                  <RefreshCw className="h-4 w-4 text-gray-500" />
                </button>
                <button onClick={onClose} className="h-9 w-9 rounded-xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center">
                  <X className="h-4 w-4 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="p-4 space-y-3">
              {loading ? (
                <div className="text-center py-8 text-gray-400">جاري التحميل...</div>
              ) : heldOrders.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="h-12 w-12 mx-auto mb-3 text-gray-300 dark:text-slate-600" />
                  <p className="text-sm text-gray-400">لا توجد فواتير معلقة</p>
                </div>
              ) : (
                heldOrders.map(order => (
                  <motion.div key={order.id} layout
                    className="bg-gray-50 dark:bg-slate-900 rounded-xl p-4 border border-gray-100 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-amber-500" />
                        <span className="text-xs text-gray-400">
                          {new Date(order.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <button onClick={() => deleteHeldOrder(order.id)} className="h-7 w-7 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                      </button>
                    </div>
                    {order.customer_name && (
                      <p className="text-sm font-bold text-gray-900 dark:text-white mb-1">{order.customer_name}</p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
                      <ShoppingCart className="h-3 w-3" />
                      <span>{order.items?.length || 0} صنف</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-black text-emerald-600">{formatCurrency(order.total)}</span>
                      <button onClick={() => resumeOrder(order)}
                        className="h-9 px-4 rounded-xl bg-emerald-500 text-white text-sm font-bold flex items-center gap-1.5">
                        <Play className="h-3.5 w-3.5" /> استئناف
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
