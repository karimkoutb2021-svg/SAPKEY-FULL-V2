'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageTransition } from '@/components/ui/page-transition';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, formatDate } from '@/lib/utils';
import { motion } from 'framer-motion';
import * as XLSX from 'xlsx';
import {
  Users, Plus, Search, Phone, Mail, MapPin, Trash2, Download, Loader2,
  CreditCard, Package, X,
} from 'lucide-react';
import toast from 'react-hot-toast';

const supabase = createClient();

interface Customer {
  id: string; name: string; phone: string; email?: string;
  address?: string; type: string; total_spent: number;
  total_orders: number; is_active: boolean; created_at: string;
}

const typeLabels: Record<string, string> = {
  regular: 'عادي', wholesale: 'جملة', vip: 'VIP', new: 'جديد',
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', email: '', address: '', type: 'regular' });

  useEffect(() => {
    loadData();
    const ch = supabase.channel('customers-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, () => loadData())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  async function loadData() {
    try {
      const { data } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
      if (data) setCustomers(data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }

  const filtered = customers.filter((c) => {
    const ms = !search || (c.name || '').includes(search) || (c.phone || '').includes(search) || (c.email || '').includes(search);
    return ms;
  });

  const totalSpent = filtered.reduce((s, c) => s + (c.total_spent || 0), 0);
  const totalOrders = filtered.reduce((s, c) => s + (c.total_orders || 0), 0);

  async function handleAddCustomer() {
    if (!newCustomer.name || !newCustomer.phone) {
      toast.error('الاسم والهاتف مطلوبان');
      return;
    }
    try {
      const { error } = await supabase.from('customers').insert({
        name: newCustomer.name, phone: newCustomer.phone, email: newCustomer.email || null,
        address: newCustomer.address || null, type: newCustomer.type, total_spent: 0,
        total_orders: 0, is_active: true,
      });
      if (error) { toast.error(error.message); return; }
      toast.success('تم إضافة العميل');
      setShowAddModal(false);
      setNewCustomer({ name: '', phone: '', email: '', address: '', type: 'regular' });
      loadData();
    } catch { toast.error('فشل الإضافة'); }
  }

  function handleExport() {
    const data = filtered.map((c, i) => ({
      '#': i + 1, 'الاسم': c.name, 'الهاتف': c.phone, 'البريد': c.email || '-',
      'النوع': typeLabels[c.type] || c.type, 'إجمالي المشتريات': c.total_spent || 0,
      'عدد الطلبات': c.total_orders || 0, 'تاريخ التسجيل': formatDate(new Date(c.created_at)),
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'العملاء');
    XLSX.writeFile(wb, `عملاء_${new Date().toLocaleDateString('ar-EG').replace(/\//g, '-')}.xlsx`);
    toast.success('تم التصدير');
  }

  return (
    <PageTransition>
      <div className="space-y-4 md:space-y-6 max-w-7xl mx-auto px-2 md:px-4" dir="rtl">
        <div className="flex items-center flex-wrap gap-2 justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h1 className="text-lg md:text-2xl font-bold">العملاء</h1>
          </div>
          <div className="flex gap-1.5 md:gap-2">
            <button onClick={handleExport}
              className="h-8 md:h-9 px-2.5 md:px-3 rounded-lg border text-[10px] md:text-xs flex items-center gap-1 hover:bg-accent">
              <Download className="h-3 w-3 md:h-3.5 md:w-3.5" /> تصدير
            </button>
            <button onClick={() => setShowAddModal(true)}
              className="h-8 md:h-9 px-2.5 md:px-3 rounded-lg text-white text-[10px] md:text-xs flex items-center gap-1"
              style={{ backgroundColor: 'var(--primary, #22C55E)' }}>
              <Plus className="h-3 w-3 md:h-3.5 md:w-3.5" /> إضافة عميل
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 md:gap-4">
              <Card className="shadow-sm"><CardContent className="p-3 md:p-4"><p className="text-[9px] md:text-xs text-muted-foreground">إجمالي العملاء</p><p className="text-xs md:text-2xl font-bold">{customers.length}</p></CardContent></Card>
              <Card className="shadow-sm"><CardContent className="p-3 md:p-4"><p className="text-[9px] md:text-xs text-muted-foreground">النشطون</p><p className="text-xs md:text-2xl font-bold text-emerald-600">{customers.filter((c) => c.is_active).length}</p></CardContent></Card>
              <Card className="shadow-sm"><CardContent className="p-3 md:p-4"><p className="text-[9px] md:text-xs text-muted-foreground">إجمالي المشتريات</p><p className="text-xs md:text-2xl font-bold tabular-nums">{formatCurrency(totalSpent)}</p></CardContent></Card>
              <Card className="shadow-sm"><CardContent className="p-3 md:p-4"><p className="text-[9px] md:text-xs text-muted-foreground">إجمالي الطلبات</p><p className="text-xs md:text-2xl font-bold">{totalOrders}</p></CardContent></Card>
            </div>

            <div className="relative max-w-xs">
              <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
              <input type="text" placeholder="بحث باسم أو هاتف..." value={search} onChange={(e) => setSearch(e.target.value)}
                className="w-full h-8 md:h-10 rounded-lg border pr-8 pl-2.5 text-[10px] md:text-sm" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-4">
              {filtered.map((customer) => (
                <motion.div key={customer.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-white dark:bg-slate-900 rounded-xl border shadow-sm p-3 md:p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-xs md:text-sm font-bold">{customer.name}</h3>
                      <div className="flex items-center gap-1.5 md:gap-3 text-[9px] md:text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-0.5"><Phone className="h-2.5 w-2.5 md:h-3 md:w-3" /> {customer.phone}</span>
                        {customer.email && <span className="flex items-center gap-0.5"><Mail className="h-2.5 w-2.5 md:h-3 md:w-3" /> {customer.email}</span>}
                      </div>
                    </div>
                    <Badge variant={customer.is_active ? 'success' : 'secondary'} className="text-[9px] md:text-xs">
                      {customer.is_active ? 'نشط' : 'غير نشط'}
                    </Badge>
                  </div>
                  {customer.address && (
                    <p className="text-[9px] md:text-xs text-muted-foreground flex items-center gap-0.5 mb-2">
                      <MapPin className="h-2.5 w-2.5 md:h-3 md:w-3" /> {customer.address}
                    </p>
                  )}
                  <div className="flex items-center gap-2 md:gap-3 text-[10px] md:text-xs">
                    <Badge variant="outline" className="text-[9px] md:text-xs">{typeLabels[customer.type] || customer.type}</Badge>
                    <span className="tabular-nums">{formatCurrency(customer.total_spent || 0)}</span>
                    <span className="flex items-center gap-0.5"><Package className="h-2.5 w-2.5" /> {customer.total_orders || 0}</span>
                  </div>
                </motion.div>
              ))}
              {filtered.length === 0 && <div className="col-span-full text-center py-8 text-muted-foreground">لا يوجد عملاء</div>}
            </div>
          </>
        )}

        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowAddModal(false)}>
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 md:p-6 max-w-sm w-full mx-4 shadow-2xl border" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm md:text-base font-bold">إضافة عميل جديد</h3>
                <button onClick={() => setShowAddModal(false)}><span className="text-gray-400">✕</span></button>
              </div>
              <div className="space-y-2.5 md:space-y-3">
                <div className="grid grid-cols-2 gap-2 md:gap-3">
                  <div><label className="text-[10px] md:text-xs font-medium text-muted-foreground block mb-1">الاسم</label>
                    <input type="text" value={newCustomer.name} onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                      className="w-full h-8 md:h-9 rounded-lg border text-[10px] md:text-sm px-3" placeholder="اسم العميل" /></div>
                  <div><label className="text-[10px] md:text-xs font-medium text-muted-foreground block mb-1">الهاتف</label>
                    <input type="text" value={newCustomer.phone} onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                      className="w-full h-8 md:h-9 rounded-lg border text-[10px] md:text-sm px-3" placeholder="01X..." /></div>
                </div>
                <div className="grid grid-cols-2 gap-2 md:gap-3">
                  <div><label className="text-[10px] md:text-xs font-medium text-muted-foreground block mb-1">البريد</label>
                    <input type="email" value={newCustomer.email} onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                      className="w-full h-8 md:h-9 rounded-lg border text-[10px] md:text-sm px-3" placeholder="email..." /></div>
                  <div><label className="text-[10px] md:text-xs font-medium text-muted-foreground block mb-1">النوع</label>
                    <select value={newCustomer.type} onChange={(e) => setNewCustomer({ ...newCustomer, type: e.target.value })}
                      className="w-full h-8 md:h-9 rounded-lg border text-[10px] md:text-sm px-3">
                      <option value="regular">عادي</option><option value="wholesale">جملة</option>
                      <option value="vip">VIP</option><option value="new">جديد</option>
                    </select></div>
                </div>
                <div><label className="text-[10px] md:text-xs font-medium text-muted-foreground block mb-1">العنوان</label>
                  <input type="text" value={newCustomer.address} onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                    className="w-full h-8 md:h-9 rounded-lg border text-[10px] md:text-sm px-3" placeholder="العنوان" /></div>
                <div className="flex gap-2 pt-2">
                  <button onClick={() => setShowAddModal(false)}
                    className="flex-1 h-8 md:h-9 rounded-lg border text-[10px] md:text-xs font-medium hover:bg-accent">إلغاء</button>
                  <button onClick={handleAddCustomer}
                    className="flex-1 h-8 md:h-9 rounded-lg text-white text-[10px] md:text-xs font-medium"
                    style={{ backgroundColor: 'var(--primary, #22C55E)' }}>إضافة</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
