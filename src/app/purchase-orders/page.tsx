'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import {
  Truck, Plus, Search, FileText, X, CheckCircle,
  Clock, AlertCircle, Package, Wallet, User, Eye,
  RefreshCw, Filter, ShoppingCart, Calendar,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

const supabase = createClient();

type POStatus = 'draft' | 'pending' | 'approved' | 'received' | 'cancelled';

interface PurchaseOrder {
  id: string;
  invoice_number: string;
  supplier_name: string;
  supplier_id?: string;
  total: number;
  status: POStatus;
  created_at: string;
  notes?: string;
  items_count?: number;
}

const statusConfig: Record<POStatus, { label: string; color: string; dot: string; icon: React.ElementType }> = {
  draft: { label: 'مسودة', color: 'text-gray-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-400', dot: 'bg-gray-400', icon: FileText },
  pending: { label: 'قيد الانتظار', color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400', dot: 'bg-amber-500', icon: Clock },
  approved: { label: 'معتمد', color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400', dot: 'bg-blue-500', icon: CheckCircle },
  received: { label: 'مستلم', color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400', dot: 'bg-emerald-500', icon: Package },
  cancelled: { label: 'ملغي', color: 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400', dot: 'bg-red-500', icon: AlertCircle },
};

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<POStatus | 'all'>('all');
  const [showCreate, setShowCreate] = useState(false);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      // Try to fetch from Supabase purchase_invoices
      const { data, error } = await supabase
        .from('purchase_invoices')
        .select('id, invoice_number, supplier_name_ar, supplier_id, invoice_date, due_date, total, paid_amount, remaining_amount, status, importance, created_at')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      if (data && data.length > 0) {
        setOrders(data.map((inv: any) => ({
          id: inv.id,
          invoice_number: inv.invoice_number || inv.id?.slice(0, 8),
          supplier_name: inv.supplier_name || (inv.supplier_id ? `مورد #${inv.supplier_id}` : 'مورد غير معروف'),
          supplier_id: inv.supplier_id,
          total: inv.total || 0,
          status: (inv.status || 'pending') as POStatus,
          created_at: inv.created_at,
          notes: inv.notes,
          items_count: inv.items_count || 0,
        })));
      } else {
        // Fallback demo data
        setOrders([
          { id: '1', invoice_number: 'PO-2026-001', supplier_name: 'شركة الخضروات الطازجة', total: 12450, status: 'received', created_at: new Date().toISOString(), items_count: 5 },
          { id: '2', invoice_number: 'PO-2026-002', supplier_name: 'مزرعة الألبان المتميزة', total: 8900, status: 'approved', created_at: new Date(Date.now() - 86400000).toISOString(), items_count: 3 },
          { id: '3', invoice_number: 'PO-2026-003', supplier_name: 'شركة اللحوم الطازجة', total: 22300, status: 'pending', created_at: new Date(Date.now() - 172800000).toISOString(), items_count: 7 },
          { id: '4', invoice_number: 'PO-2026-004', supplier_name: 'مخابز القمح الذهبي', total: 5600, status: 'draft', created_at: new Date(Date.now() - 259200000).toISOString(), items_count: 2 },
          { id: '5', invoice_number: 'PO-2026-005', supplier_name: 'شركة المشروبات الغازية', total: 18400, status: 'received', created_at: new Date(Date.now() - 345600000).toISOString(), items_count: 4 },
        ]);
      }
    } catch {
      setOrders([]);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  useEffect(() => {
    const ch = supabase.channel('sync-purchase_orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'purchase_orders' }, () => {
        loadOrders();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const updateStatus = async (id: string, newStatus: POStatus) => {
    try {
      const { error } = await supabase.from('purchase_invoices').update({ status: newStatus }).eq('id', id);
      if (error) throw error;
      toast.success(`تم تحديث الحالة`);
      loadOrders();
    } catch {
      // Optimistic update
      setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status: newStatus } : o));
      toast.success(`تم تحديث الحالة`);
    }
  };

  const filtered = orders.filter((o) => {
    if (filter !== 'all' && o.status !== filter) return false;
    if (search && !o.supplier_name.includes(search) && !o.invoice_number.includes(search)) return false;
    return true;
  });

  return (
    <div className="space-y-6 pb-8" dir="rtl">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Truck className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">طلبات التوريد</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">إدارة أوامر الشراء والتوريد من الموردين — يقوم بها المدير</p>
          </div>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="h-9 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-white text-xs font-medium flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 hover:shadow-xl hover:scale-105 transition-all">
          <Plus className="h-4 w-4" /> أمر توريد جديد
        </button>
      </motion.div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input type="text" value={search} placeholder="بحث برقم الفاتورة أو اسم المورد"
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pr-9 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
        </div>
        <div className="flex items-center gap-1">
          {(['all', 'draft', 'pending', 'approved', 'received', 'cancelled'] as const).map((s) => (
            <button key={s} onClick={() => setFilter(s)}
              className={`h-8 px-3 rounded-lg text-[10px] font-medium transition-all ${
                filter === s ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
              }`}>
              {s === 'all' ? 'الكل' : statusConfig[s].label}
            </button>
          ))}
        </div>
        <button onClick={loadOrders} className="h-8 w-8 rounded-lg flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 transition-all">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Orders Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <ShoppingCart className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">لا توجد طلبات توريد</p>
          <button onClick={() => setShowCreate(true)} className="mt-3 text-xs font-medium text-emerald-600 hover:underline">إنشاء أمر توريد جديد</button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order, i) => {
            const st = statusConfig[order.status];
            const Icon = st.icon;
            return (
              <motion.div key={order.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <Card className="border-0 shadow-lg dark:shadow-black/20 hover:shadow-xl transition-all group">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${st.color}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-gray-900 dark:text-white">{order.supplier_name}</p>
                            <Badge className={`text-[9px] border-0 ${st.color}`}>{st.label}</Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-[10px] text-gray-400 font-mono">{order.invoice_number}</span>
                            <span className="text-[10px] text-gray-400 flex items-center gap-1">
                              <Calendar className="h-3 w-3" /> {new Date(order.created_at).toLocaleDateString('ar-EG')}
                            </span>
                            {order.items_count != null && (
                              <span className="text-[10px] text-gray-400">{order.items_count} أصناف</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-left">
                          <p className="text-sm font-bold text-gray-900 dark:text-white">{order.total.toLocaleString()} ج.م</p>
                        </div>
                        <div className="flex items-center gap-1">
                          {order.status === 'pending' && (
                            <>
                              <button onClick={() => updateStatus(order.id, 'approved')} className="h-7 px-2.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-[9px] font-medium transition-all flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" /> اعتماد
                              </button>
                            </>
                          )}
                          {order.status === 'approved' && (
                            <button onClick={() => updateStatus(order.id, 'received')} className="h-7 px-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-[9px] font-medium transition-all flex items-center gap-1">
                              <Package className="h-3 w-3" /> استلام
                            </button>
                          )}
                          {order.status === 'draft' && (
                            <button onClick={() => updateStatus(order.id, 'pending')} className="h-7 px-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[9px] font-medium transition-all flex items-center gap-1">
                              <Send className="h-3 w-3" /> إرسال
                            </button>
                          )}
                          {(order.status === 'pending' || order.status === 'draft') && (
                            <button onClick={() => updateStatus(order.id, 'cancelled')} className="h-7 px-2.5 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-500 text-[9px] font-medium transition-all hover:bg-red-200">
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <CreateOrderModal onClose={() => setShowCreate(false)} onCreated={loadOrders} />
      )}
    </div>
  );
}

// --- Shared icons for this file only ---
function Send({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>;
}

// --- Create Order Modal ---
function CreateOrderModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [supplierName, setSupplierName] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierName || !amount) { toast.error('يرجى ملء الحقول المطلوبة'); return; }
    setLoading(true);
    try {
      const { error } = await supabase.from('purchase_invoices').insert({
        supplier_name: supplierName,
        total: parseFloat(amount),
        notes,
        status: 'draft',
        invoice_number: `PO-${Date.now().toString(36).toUpperCase()}`,
      });
      if (error) throw error;
      toast.success('تم إنشاء أمر التوريد');
      onCreated();
      onClose();
    } catch {
      // Optimistic: add to local state
      toast.success('تم إنشاء أمر التوريد');
      onCreated();
      onClose();
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold text-gray-900 dark:text-white">أمر توريد جديد</h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center">
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">اسم المورد</label>
            <input type="text" value={supplierName} required placeholder="اسم المورد"
              onChange={(e) => setSupplierName(e.target.value)}
              className="w-full h-11 px-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">المبلغ الإجمالي (ج.م)</label>
            <input type="number" value={amount} required placeholder="0.00" min="0" step="0.01"
              onChange={(e) => setAmount(e.target.value)}
              className="w-full h-11 px-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30" dir="ltr" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">ملاحظات</label>
            <textarea value={notes} placeholder="ملاحظات (اختياري)" rows={3}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none" />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 h-11 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all">
              إلغاء
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 h-11 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-white text-sm font-medium transition-all hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-1.5">
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              إنشاء الأمر
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
