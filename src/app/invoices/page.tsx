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
  FileText, Plus, Search, Eye, Download, Trash2,
  Calendar, Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';

const supabase = createClient();

interface Invoice {
  id: string; invoice_number: string; customer_name: string;
  date: string; items: any[]; subtotal: number; tax: number;
  total: number; paid: number; remaining: number;
  status: string; payment_method: string; notes?: string;
}

const STATUS_MAP: Record<string, { label: string; variant: string }> = {
  paid: { label: 'مدفوع', variant: 'success' },
  unpaid: { label: 'غير مدفوع', variant: 'destructive' },
  partial: { label: 'جزئي', variant: 'warning' },
  overdue: { label: 'متأخر', variant: 'destructive' },
  cancelled: { label: 'ملغي', variant: 'secondary' },
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    loadData();
    const ch = supabase.channel('invoices-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, () => loadData())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  async function loadData() {
    try {
      const { data } = await supabase.from('invoices').select('*').order('created_at', { ascending: false });
      if (data) setInvoices(data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }

  const filtered = invoices.filter((inv) => {
    const ms = !search || (inv.customer_name || '').includes(search) || (inv.invoice_number || '').includes(search);
    const mst = statusFilter === 'all' || inv.status === statusFilter;
    return ms && mst;
  });

  const totals = useMemo(() => ({
    total: filtered.reduce((s, i) => s + i.total, 0),
    paid: filtered.reduce((s, i) => s + (i.status === 'paid' ? i.total : i.paid), 0),
    unpaid: filtered.reduce((s, i) => s + (i.status !== 'paid' && i.status !== 'cancelled' ? i.remaining : 0), 0),
  }), [filtered]);

  function handleExport() {
    const data = filtered.map((inv, i) => ({
      '#': i + 1, 'رقم الفاتورة': inv.invoice_number, 'العميل': inv.customer_name,
      'التاريخ': formatDate(new Date(inv.date)), 'الإجمالي': inv.total, 'المدفوع': inv.paid,
      'المتبقي': inv.remaining, 'الحالة': STATUS_MAP[inv.status]?.label || inv.status,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'الفواتير');
    XLSX.writeFile(wb, `فواتير_${new Date().toLocaleDateString('ar-EG').replace(/\//g, '-')}.xlsx`);
    toast.success('تم التصدير');
  }

  async function handleDelete(id: string) {
    try {
      const { error } = await supabase.from('invoices').delete().eq('id', id);
      if (error) { toast.error(error.message); return; }
      toast.success('تم حذف الفاتورة');
      loadData();
    } catch { toast.error('فشل الحذف'); }
  }

  return (
    <PageTransition>
      <div className="space-y-4 md:space-y-6 max-w-7xl mx-auto px-2 md:px-4" dir="rtl">
        <div className="flex items-center flex-wrap gap-2 justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <h1 className="text-lg md:text-2xl font-bold">الفواتير</h1>
          </div>
          <div className="flex gap-1.5 md:gap-2">
            <button onClick={handleExport}
              className="h-8 md:h-9 px-2.5 md:px-3 rounded-lg border text-[10px] md:text-xs flex items-center gap-1 hover:bg-accent">
              <Download className="h-3 w-3 md:h-3.5 md:w-3.5" /> تصدير
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4">
              <Card className="shadow-sm"><CardContent className="p-3 md:p-4"><p className="text-[9px] md:text-xs text-muted-foreground">إجمالي الفواتير</p><p className="text-xs md:text-2xl font-bold tabular-nums">{formatCurrency(totals.total)}</p></CardContent></Card>
              <Card className="shadow-sm"><CardContent className="p-3 md:p-4"><p className="text-[9px] md:text-xs text-muted-foreground">المدفوع</p><p className="text-xs md:text-2xl font-bold text-emerald-600 tabular-nums">{formatCurrency(totals.paid)}</p></CardContent></Card>
              <Card className="shadow-sm"><CardContent className="p-3 md:p-4"><p className="text-[9px] md:text-xs text-muted-foreground">المتبقي</p><p className="text-xs md:text-2xl font-bold text-red-600 tabular-nums">{formatCurrency(totals.unpaid)}</p></CardContent></Card>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[120px]">
                <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
                <input type="text" placeholder="بحث..." value={search} onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-8 md:h-10 rounded-lg border pr-8 pl-2.5 text-[10px] md:text-sm" />
              </div>
              <div className="flex gap-1 overflow-x-auto">
                {[{ key: 'all', label: 'الكل' }, { key: 'paid', label: 'مدفوع' }, { key: 'unpaid', label: 'غير مدفوع' }, { key: 'partial', label: 'جزئي' }, { key: 'overdue', label: 'متأخر' }].map((opt) => (
                  <button key={opt.key} onClick={() => setStatusFilter(opt.key)}
                    className={`h-7 md:h-9 px-2 md:px-3 rounded-lg text-[9px] md:text-xs border shrink-0 transition-all ${statusFilter === opt.key ? 'bg-foreground text-background' : 'hover:bg-accent'}`}>{opt.label}</button>
                ))}
              </div>
            </div>

            <Card className="shadow-sm">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-[10px] md:text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-right p-2 md:p-3 font-medium text-muted-foreground">رقم الفاتورة</th>
                        <th className="text-right p-2 md:p-3 font-medium text-muted-foreground">العميل</th>
                        <th className="text-left p-2 md:p-3 font-medium text-muted-foreground">الإجمالي</th>
                        <th className="text-left p-2 md:p-3 font-medium text-muted-foreground">المدفوع</th>
                        <th className="text-center p-2 md:p-3 font-medium text-muted-foreground">الحالة</th>
                        <th className="text-center p-2 md:p-3 font-medium text-muted-foreground">التاريخ</th>
                        <th className="text-center p-2 md:p-3 font-medium text-muted-foreground">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((inv) => {
                        const st = STATUS_MAP[inv.status] || { label: inv.status, variant: 'secondary' };
                        return (
                          <tr key={inv.id} className="border-b hover:bg-accent/50 transition-colors">
                            <td className="p-2 md:p-3 font-mono">{inv.invoice_number}</td>
                            <td className="p-2 md:p-3">{inv.customer_name || '—'}</td>
                            <td className="p-2 md:p-3 text-left font-bold tabular-nums">{formatCurrency(inv.total)}</td>
                            <td className="p-2 md:p-3 text-left tabular-nums">{formatCurrency(inv.paid)}</td>
                            <td className="p-2 md:p-3 text-center">
                              <Badge variant={st.variant as any} className="text-[9px] md:text-xs">{st.label}</Badge>
                            </td>
                            <td className="p-2 md:p-3 text-center text-muted-foreground">{formatDate(new Date(inv.date))}</td>
                            <td className="p-2 md:p-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button onClick={() => setViewInvoice(inv)}
                                  className="p-1 rounded-md hover:bg-accent"><Eye className="h-3 w-3 md:h-4 md:w-4" /></button>
                                <button onClick={() => handleDelete(inv.id)}
                                  className="p-1 rounded-md hover:bg-accent text-destructive"><Trash2 className="h-3 w-3 md:h-4 md:w-4" /></button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 bg-muted/30">
                        <td colSpan={2} className="p-2 md:p-3 text-left font-bold">الإجمالي</td>
                        <td className="p-2 md:p-3 text-left font-bold tabular-nums">{formatCurrency(totals.total)}</td>
                        <td className="p-2 md:p-3 text-left font-bold tabular-nums text-emerald-600">{formatCurrency(totals.paid)}</td>
                        <td colSpan={3} />
                      </tr>
                    </tfoot>
                  </table>
                  {filtered.length === 0 && <div className="text-center py-8 text-muted-foreground">لا توجد فواتير</div>}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* View Invoice Detail */}
        {viewInvoice && typeof viewInvoice === 'object' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setViewInvoice(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-slate-900 rounded-2xl p-4 md:p-6 max-w-lg w-full mx-4 shadow-2xl border max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm md:text-base font-bold">فاتورة: {viewInvoice.invoice_number}</h3>
                <button onClick={() => setViewInvoice(null)}><span className="text-gray-400">✕</span></button>
              </div>
              <div className="space-y-3">
                <p className="text-xs md:text-sm"><span className="text-muted-foreground">العميل:</span> {viewInvoice.customer_name || '—'}</p>
                <p className="text-[10px] md:text-xs text-muted-foreground">{formatDate(new Date(viewInvoice.date))}</p>
                <div className="border-t pt-3">
                  <table className="w-full text-[10px] md:text-xs">
                    <thead>
                      <tr className="text-muted-foreground">
                        <th className="text-right pb-2">المنتج</th>
                        <th className="text-center pb-2">الكمية</th>
                        <th className="text-left pb-2">السعر</th>
                        <th className="text-left pb-2">الإجمالي</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(viewInvoice.items || []).map((item: any, i: number) => (
                        <tr key={i} className="border-t border-gray-50">
                          <td className="py-2 font-medium">{item.name || '?'}</td>
                          <td className="py-2 text-center">{item.qty || item.quantity || 0}</td>
                          <td className="py-2 text-left tabular-nums">{formatCurrency(item.price || 0)}</td>
                          <td className="py-2 text-left tabular-nums">{formatCurrency(item.total || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 font-bold">
                        <td colSpan={3} className="py-2 text-left">الإجمالي</td>
                        <td className="py-2 text-left tabular-nums">{formatCurrency(viewInvoice.total)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <div className="flex justify-between text-[10px] md:text-xs">
                  <span>طريقة الدفع: {viewInvoice.payment_method || '—'}</span>
                  <Badge variant={(STATUS_MAP[viewInvoice.status]?.variant || 'secondary') as any} className="text-[9px] md:text-xs">
                    {STATUS_MAP[viewInvoice.status]?.label || viewInvoice.status}
                  </Badge>
                </div>
                {viewInvoice.notes && <p className="text-[10px] md:text-xs text-muted-foreground">ملاحظات: {viewInvoice.notes}</p>}
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
