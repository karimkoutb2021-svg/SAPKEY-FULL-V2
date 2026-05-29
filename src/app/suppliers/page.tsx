'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { 
  Truck, Plus, Search, Phone, Mail, FileText, Download, 
  Upload, X, ChevronLeft, ChevronRight, Wallet,
  Calendar, Building2, CreditCard, AlertCircle, CheckCircle,
  Mic, Camera, FileSpreadsheet, Eye, Edit, Trash2, Star,
  Send, Clock, Bell, Settings, Users, Package
} from 'lucide-react';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { SupplierAddModal } from '@/components/suppliers/supplier-add-modal';

const supabase = createClient();

type SupplierStatus = 'active' | 'inactive' | 'blocked' | 'pending';
type InvoiceStatus = 'draft' | 'pending' | 'approved' | 'paid' | 'cancelled' | 'overdue';
type TabType = 'suppliers' | 'invoices' | 'payments' | 'analytics';

interface Supplier {
  id: string;
  code: string;
  name_ar: string;
  name_en: string | null;
  category_id: string | null;
  contact_person: string | null;
  phone: string | null;
  phone_2: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  tax_number: string | null;
  commercial_registration: string | null;
  bank_name: string | null;
  bank_account: string | null;
  iban: string | null;
  opening_balance: number;
  current_balance: number;
  credit_limit: number;
  payment_terms: number;
  status: SupplierStatus;
  notes: string | null;
  rating: number;
  tags: string[] | null;
  created_at: string;
}

interface Category {
  id: string;
  name_ar: string;
  name_en: string | null;
  code: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  supplier_id: string | null;
  supplier_name_ar: string | null;
  invoice_date: string;
  due_date: string | null;
  status: InvoiceStatus;
  subtotal?: number;
  total: number;
  paid_amount: number;
  remaining_amount: number;
}

const STATUS_COLORS: Record<SupplierStatus, { bg: string; text: string; label: string }> = {
  active: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', label: 'نشط' },
  inactive: { bg: 'bg-gray-100 dark:bg-gray-900/30', text: 'text-gray-700 dark:text-gray-400', label: 'غير نشط' },
  blocked: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', label: 'محظور' },
  pending: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400', label: 'معلق' }
};

const INVOICE_STATUS_COLORS: Record<InvoiceStatus, { bg: string; text: string; label: string }> = {
  draft: { bg: 'bg-gray-100 dark:bg-gray-900/30', text: 'text-gray-700 dark:text-gray-400', label: 'مسودة' },
  pending: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400', label: 'معلق' },
  approved: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', label: 'معتمد' },
  paid: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', label: 'مدفوع' },
  cancelled: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', label: 'ملغي' },
  overdue: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400', label: 'متأخر' }
};

export default function SuppliersPage() {
  const [activeTab, setActiveTab] = useState<TabType>('suppliers');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name_ar: '',
    name_en: '',
    contact_person: '',
    phone: '',
    phone_2: '',
    email: '',
    address: '',
    city: '',
    tax_number: '',
    commercial_registration: '',
    bank_name: '',
    bank_account: '',
    iban: '',
    opening_balance: 0,
    credit_limit: 0,
    payment_terms: 30,
    notes: '',
    category_id: ''
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from('suppliers').select('id, code, name_ar, name_en, category_id, contact_person, phone, phone_2, email, address, city, country, tax_number, commercial_registration, bank_name, bank_account, opening_balance, current_balance, credit_limit, payment_terms, status, rating, created_at').order('created_at', { ascending: false });
      
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      if (categoryFilter !== 'all') {
        query = query.eq('category_id', categoryFilter);
      }
      if (searchQuery) {
        query = query.or(`name_ar.ilike.%${searchQuery}%,code.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`);
      }

      const { data: suppliersData } = await query;
      if (suppliersData) setSuppliers(suppliersData as Supplier[]);

      const { data: categoriesData } = await supabase
        .from('supplier_categories')
        .select('id, name_ar, name_en, code, description')
        .eq('is_active', true)
        .order('name_ar');
      if (categoriesData) setCategories(categoriesData as Category[]);

      const { data: invoicesData } = await supabase
        .from('purchase_invoices')
        .select('id, invoice_number, supplier_name_ar, supplier_id, invoice_date, due_date, total, paid_amount, remaining_amount, status, importance, notes, created_at')
        .order('created_at', { ascending: false })
        .limit(50);
      if (invoicesData) setInvoices(invoicesData as Invoice[]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter, searchQuery]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const ch = supabase.channel('sync-product_suppliers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_suppliers' }, () => {
        fetchData();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const handleAddSupplier = async (data: any) => {
    const { data: result, error } = await supabase
      .from('suppliers')
      .insert({
        ...data,
        code: `SUP${Date.now()}`,
        status: 'active',
        current_balance: data.opening_balance
      })
      .select()
      .single();

    if (error) throw error;
    fetchData();
  };

  const handleDeleteSupplier = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المورد؟')) return;
    try {
      const { error } = await supabase.from('suppliers').delete().eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Error deleting supplier:', error);
    }
  };

  const stats = {
    totalSuppliers: suppliers.length,
    activeSuppliers: suppliers.filter(s => s.status === 'active').length,
    totalBalance: suppliers.reduce((sum, s) => sum + s.current_balance, 0),
    totalInvoices: invoices.length,
    pendingInvoices: invoices.filter(i => i.status === 'pending').length,
    overdueInvoices: invoices.filter(i => i.status === 'overdue').length
  };

  return (
    <div className="space-y-4 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">الموردين والمشتريات</h1>
          <p className="text-xs text-muted-foreground mt-1">إدارة الموردين وفواتير البضائع المشتراة</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowAddModal(true)} className="px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 text-sm font-medium hover:bg-emerald-500/30 transition-colors flex items-center gap-2 border border-emerald-500/20">
            <Plus className="h-4 w-4" /> إضافة مورد
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] transition-colors">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <Users className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-gray-400">إجمالي الموردين</p>
              <p className="text-lg font-bold text-gray-100">{stats.totalSuppliers}</p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] transition-colors">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-gray-400">نشط</p>
              <p className="text-lg font-bold text-gray-100">{stats.activeSuppliers}</p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] transition-colors">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
              <Clock className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-gray-400">فواتير معلقة</p>
              <p className="text-lg font-bold text-gray-100">{stats.pendingInvoices}</p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] transition-colors">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <p className="text-xs text-gray-400">فواتير متأخرة</p>
              <p className="text-lg font-bold text-gray-100">{stats.overdueInvoices}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {[
          { id: 'suppliers', label: 'الموردين', icon: Users },
          { id: 'invoices', label: 'فواتير المشتريات', icon: FileText },
          { id: 'payments', label: 'المدفوعات', icon: Wallet },
          { id: 'analytics', label: 'التحليلات', icon: Package }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors",
              activeTab === tab.id 
                ? "bg-emerald-500/20 text-emerald-400" 
                : "bg-white/[0.04] text-gray-400 hover:bg-white/[0.08]"
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'suppliers' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input 
                placeholder="بحث عن مورد..." 
                className="w-full h-11 bg-white/[0.04] border border-white/[0.08] rounded-xl pr-10 pl-4 text-gray-100 text-sm outline-none focus:border-emerald-500/50 transition-colors"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-[140px] h-11 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 text-gray-300 text-sm outline-none focus:border-emerald-500/50 transition-colors"
            >
              <option value="all" className="bg-gray-900">كل الحالات</option>
              <option value="active" className="bg-gray-900">نشط</option>
              <option value="inactive" className="bg-gray-900">غير نشط</option>
              <option value="blocked" className="bg-gray-900">محظور</option>
              <option value="pending" className="bg-gray-900">معلق</option>
            </select>
            <select 
              value={categoryFilter} 
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full sm:w-[160px] h-11 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 text-gray-300 text-sm outline-none focus:border-emerald-500/50 transition-colors"
            >
              <option value="all" className="bg-gray-900">كل الفئات</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id} className="bg-gray-900">{cat.name_ar}</option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
            </div>
          ) : suppliers.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-white/[0.02] border border-white/[0.04]">
              <Truck className="h-12 w-12 mx-auto text-gray-600 mb-3" />
              <p className="text-gray-400">لا يوجد موردين</p>
              <button className="mt-4 px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 text-sm hover:bg-emerald-500/30 transition-colors inline-flex items-center gap-2" onClick={() => setShowAddModal(true)}>
                <Plus className="h-4 w-4" /> إضافة أول مورد
              </button>
            </div>
          ) : (
            <div className="grid gap-3">
              {suppliers.map((supplier) => (
                <div key={supplier.id} className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] transition-all duration-300 cursor-pointer" onClick={() => {
                  setSelectedSupplier(supplier);
                  setShowDetailsModal(true);
                }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-500/20">
                        <Truck className="h-6 w-6 text-white" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-gray-100 truncate">{supplier.name_ar}</p>
                        <p className="text-xs text-gray-400 mt-0.5 font-mono">{supplier.code}</p>
                        <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                          {supplier.phone && (
                            <span className="flex items-center gap-1.5 font-mono">
                              <Phone className="h-3 w-3" /> {supplier.phone}
                            </span>
                          )}
                          {supplier.email && (
                            <span className="flex items-center gap-1.5 hidden sm:flex">
                              <Mail className="h-3 w-3" /> {supplier.email}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <span className={cn("text-xs px-2.5 py-1 rounded-full bg-white/[0.06]", STATUS_COLORS[supplier.status].text)}>
                        {STATUS_COLORS[supplier.status].label}
                      </span>
                      <div className="text-left">
                        <p className="text-xs text-gray-400">الرصيد</p>
                        <p className={cn("font-bold", supplier.current_balance > 0 ? "text-red-400" : "text-emerald-400")}>
                          {formatCurrency(supplier.current_balance)}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.04]">
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={cn("h-3 w-3", i < supplier.rating ? "text-amber-500 fill-amber-500" : "text-white/[0.1]")} />
                      ))}
                    </div>
                    <div className="flex gap-1">
                      <button className="h-8 w-8 rounded-full bg-white/[0.06] hover:bg-white/[0.1] text-gray-400 transition-colors flex items-center justify-center" onClick={(e) => { e.stopPropagation(); }}>
                        <Edit className="h-4 w-4" />
                      </button>
                      <button className="h-8 w-8 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors flex items-center justify-center" onClick={(e) => { e.stopPropagation(); handleDeleteSupplier(supplier.id); }}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'invoices' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input 
                placeholder="بحث عن فاتورة..." 
                className="w-full h-11 bg-white/[0.04] border border-white/[0.08] rounded-xl pr-10 pl-4 text-gray-100 text-sm outline-none focus:border-emerald-500/50 transition-colors" 
              />
            </div>
            <button className="px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 text-sm font-medium hover:bg-emerald-500/30 transition-colors flex items-center gap-2 border border-emerald-500/20 mr-2">
              <Plus className="h-4 w-4" /> إضافة فاتورة
            </button>
          </div>

          <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right text-gray-300">
                <thead className="text-xs text-gray-400 bg-white/[0.04] border-b border-white/[0.06]">
                  <tr>
                    <th className="px-4 py-3 font-medium">رقم الفاتورة</th>
                    <th className="px-4 py-3 font-medium">المورد</th>
                    <th className="px-4 py-3 font-medium">التاريخ</th>
                    <th className="px-4 py-3 font-medium">المبلغ</th>
                    <th className="px-4 py-3 font-medium">الحالة</th>
                    <th className="px-4 py-3 font-medium">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3 font-mono text-gray-100">{invoice.invoice_number}</td>
                      <td className="px-4 py-3 text-gray-200">{invoice.supplier_name_ar || '-'}</td>
                      <td className="px-4 py-3">{new Date(invoice.invoice_date).toLocaleDateString('ar-EG')}</td>
                      <td className="px-4 py-3 font-bold text-gray-100">{formatCurrency(invoice.total)}</td>
                      <td className="px-4 py-3">
                        <span className={cn("text-xs px-2.5 py-1 rounded-full bg-white/[0.06]", INVOICE_STATUS_COLORS[invoice.status].text)}>
                          {INVOICE_STATUS_COLORS[invoice.status].label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button className="h-8 w-8 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-gray-400 transition-colors flex items-center justify-center">
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'payments' && (
        <div className="p-12 text-center rounded-2xl bg-white/[0.02] border border-white/[0.04]">
          <Wallet className="h-16 w-16 mx-auto text-emerald-500/30 mb-4" />
          <p className="text-lg font-medium text-gray-200">المدفوعات</p>
          <p className="text-sm text-gray-400 mt-2">ستظهر هنا قائمة المدفوعات قريباً</p>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
            <h3 className="text-sm font-bold text-gray-200 mb-5 flex items-center gap-2">
              <Star className="h-4 w-4 text-emerald-500" /> أعلى الموردين حسب الرصيد
            </h3>
            <div className="space-y-4">
              {suppliers.sort((a, b) => b.current_balance - a.current_balance).slice(0, 5).map((s, i) => (
                <div key={s.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-6 h-6 rounded-md bg-white/[0.06] text-xs font-mono text-gray-400">{i + 1}</span>
                    <span className="text-sm text-gray-200 truncate">{s.name_ar}</span>
                  </div>
                  <span className="text-sm font-bold text-red-400">{formatCurrency(s.current_balance)}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
            <h3 className="text-sm font-bold text-gray-200 mb-5 flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-500" /> فواتير حسب الحالة
            </h3>
            <div className="space-y-4">
              {Object.entries(INVOICE_STATUS_COLORS).map(([status, config]) => {
                const count = invoices.filter(i => i.status === status).length;
                return (
                  <div key={status} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-6 h-6 rounded-md bg-white/[0.06]">
                        <div className={cn("w-2 h-2 rounded-full", config.bg.replace('bg-', 'bg-').replace('/30', ''))} />
                      </div>
                      <span className="text-sm text-gray-300">{config.label}</span>
                    </div>
                    <span className="text-sm font-bold text-gray-100">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <SupplierAddModal 
        isOpen={showAddModal} 
        onClose={() => setShowAddModal(false)} 
        categories={categories} 
        onSave={handleAddSupplier} 
      />

      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto p-0 border border-white/[0.08] rounded-2xl shadow-2xl bg-[#0A0A0C]/95 backdrop-blur-xl">
          {selectedSupplier && (
            <>
              <DialogHeader className="px-5 pt-5 pb-4 border-b border-white/[0.06] bg-gradient-to-b from-white/[0.04] to-transparent">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                    <Truck className="h-7 w-7 text-white" />
                  </div>
                  <div className="text-right flex-1">
                    <DialogTitle className="text-xl font-bold text-white mb-1">{selectedSupplier.name_ar}</DialogTitle>
                    <p className="text-xs text-gray-400 font-mono">{selectedSupplier.code}</p>
                  </div>
                </div>
              </DialogHeader>
              
              <div className="space-y-5 p-5">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex flex-col items-center justify-center text-center">
                    <p className="text-xs text-gray-400 mb-1">الرصيد الحالي</p>
                    <p className={cn("text-xl font-bold", selectedSupplier.current_balance > 0 ? "text-red-400" : "text-emerald-400")}>
                      {formatCurrency(selectedSupplier.current_balance)}
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex flex-col items-center justify-center text-center">
                    <p className="text-xs text-gray-400 mb-1">حد الائتمان</p>
                    <p className="text-xl font-bold text-gray-200">{formatCurrency(selectedSupplier.credit_limit)}</p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                  <h4 className="font-semibold text-sm text-gray-200 mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-500" /> معلومات الاتصال
                  </h4>
                  <div className="grid gap-3 text-sm">
                    {selectedSupplier.phone && (
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center">
                          <Phone className="h-4 w-4 text-gray-400" />
                        </div>
                        <span className="text-gray-300 font-mono" dir="ltr">{selectedSupplier.phone}</span>
                      </div>
                    )}
                    {selectedSupplier.email && (
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center">
                          <Mail className="h-4 w-4 text-gray-400" />
                        </div>
                        <span className="text-gray-300" dir="ltr">{selectedSupplier.email}</span>
                      </div>
                    )}
                    {selectedSupplier.address && (
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center shrink-0">
                          <Building2 className="h-4 w-4 text-gray-400" />
                        </div>
                        <span className="text-gray-300 line-clamp-2 leading-relaxed">{selectedSupplier.address}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button className="flex-1 h-12 rounded-xl bg-white/[0.06] text-gray-200 text-sm font-medium hover:bg-white/[0.1] transition-colors flex items-center justify-center gap-2 border border-white/[0.04]">
                    <FileText className="h-4 w-4" /> الفواتير
                  </button>
                  <button className="flex-1 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 text-sm font-medium hover:bg-emerald-500/30 transition-colors flex items-center justify-center gap-2 border border-emerald-500/20">
                    <Wallet className="h-4 w-4" /> تسديد دفعة
                  </button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}