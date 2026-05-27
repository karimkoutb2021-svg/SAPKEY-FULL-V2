'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { formatCurrency, formatDate, generateId } from '@/lib/utils';
import {
  Users, FileText, Receipt, Calendar, TrendingUp, Plus, Search,
  Phone, Banknote, ChevronDown, ChevronUp, AlertCircle, UserPlus, Wallet, CheckCircle, Ban} from 'lucide-react';

interface WholesaleCustomer {
  id: string;
  name: string;
  phone: string;
  creditLimit: number;
  paymentTerms: number;
  balance: number;
  notes: string;
  active: boolean;
  createdAt: number;
  lastPurchaseAt: number | null;
}

interface WholesaleInvoice {
  id: string;
  customerId: string;
  customerName: string;
  invoiceNumber: string;
  date: number;
  items: { name: string; qty: number; price: number; total: number }[];
  subtotal: number;
  tax: number;
  total: number;
  paid: number;
  remaining: number;
  dueDate: number;
  status: 'paid' | 'unpaid' | 'partial' | 'overdue';
  notes: string;
}

interface PaymentReceipt {
  id: string;
  customerId: string;
  customerName: string;
  amount: number;
  date: number;
  method: 'cash' | 'bank_transfer' | 'check' | 'card';
  notes: string;
  invoiceId?: string;
}

type TabKey = 'customers' | 'invoices' | 'payments' | 'dues';

const tabs: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'customers', label: 'عملاء الجملة', icon: Users },
  { key: 'invoices', label: 'فواتير الجملة', icon: FileText },
  { key: 'payments', label: 'سندات القبض والدفع', icon: Receipt },
  { key: 'dues', label: 'مواعيد الاستحقاق', icon: Calendar },
];

const STATUS_MAP: Record<string, { label: string; variant: 'success' | 'warning' | 'destructive' | 'info' | 'secondary' }> = {
  paid: { label: 'مدفوعة', variant: 'success' },
  unpaid: { label: 'غير مدفوعة', variant: 'warning' },
  partial: { label: 'جزئية', variant: 'info' },
  overdue: { label: 'متأخرة', variant: 'destructive' },
};

function loadData<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveData<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data));
}

export default function WholesalePage() {
  const [activeTab, setActiveTab] = useState<TabKey>('customers');
  const [customers, setCustomers] = useState<WholesaleCustomer[]>([]);
  const [invoices, setInvoices] = useState<WholesaleInvoice[]>([]);
  const [payments, setPayments] = useState<PaymentReceipt[]>([]);
  const [search, setSearch] = useState('');
  const [customerDialog, setCustomerDialog] = useState(false);
  const [paymentDialog, setPaymentDialog] = useState(false);
  const [editCustomer, setEditCustomer] = useState<WholesaleCustomer | null>(null);
  const [expandedInvoice, setExpandedInvoice] = useState<string | null>(null);
  const [customerForm, setCustomerForm] = useState({ name: '', phone: '', creditLimit: 0, paymentTerms: 0, notes: '' });
  const [paymentForm, setPaymentForm] = useState({ customerId: '', amount: 0, date: Date.now(), method: 'cash' as PaymentReceipt['method'], notes: '', invoiceId: '' });

  useEffect(() => { setCustomers(loadData<WholesaleCustomer>('wholesale_customers')); }, []);
  useEffect(() => { setInvoices(loadData<WholesaleInvoice>('wholesale_invoices')); }, []);
  useEffect(() => { setPayments(loadData<PaymentReceipt>('wholesale_payments')); }, []);

  const persistCustomers = useCallback((data: WholesaleCustomer[]) => { saveData('wholesale_customers', data); setCustomers(data); }, []);
  const persistInvoices = useCallback((data: WholesaleInvoice[]) => { saveData('wholesale_invoices', data); setInvoices(data); }, []);
  const persistPayments = useCallback((data: PaymentReceipt[]) => { saveData('wholesale_payments', data); setPayments(data); }, []);

  const filteredCustomers = customers.filter((c) => c.name.includes(search) || c.phone.includes(search));
  const filteredInvoices = invoices.filter((inv) => inv.customerName.includes(search) || inv.invoiceNumber.includes(search));

  const totalCreditSales = invoices.filter((i) => i.status !== 'paid').reduce((s, i) => s + i.remaining, 0);
  const totalDue = invoices.filter((i) => i.status === 'overdue' || (i.status === 'unpaid')).reduce((s, i) => s + i.remaining, 0);

  function openAddCustomer() {
    setEditCustomer(null);
    setCustomerForm({ name: '', phone: '', creditLimit: 0, paymentTerms: 0, notes: '' });
    setCustomerDialog(true);
  }

  function openEditCustomer(c: WholesaleCustomer) {
    setEditCustomer(c);
    setCustomerForm({ name: c.name, phone: c.phone, creditLimit: c.creditLimit, paymentTerms: c.paymentTerms, notes: c.notes });
    setCustomerDialog(true);
  }

  function saveCustomer() {
    if (!customerForm.name.trim()) { toast.error('يرجى إدخال اسم العميل'); return; }
    if (editCustomer) {
      const updated = customers.map((c) => c.id === editCustomer.id ? { ...c, ...customerForm } : c);
      persistCustomers(updated);
      toast.success('تم تحديث العميل');
    } else {
      const newCustomer: WholesaleCustomer = {
        id: generateId(),
        ...customerForm,
        balance: 0,
        active: true,
        createdAt: Date.now(),
        lastPurchaseAt: null,
      };
      persistCustomers([...customers, newCustomer]);
      toast.success('تم إضافة العميل');
    }
    setCustomerDialog(false);
  }

  function toggleCustomerStatus(customerId: string) {
    persistCustomers(customers.map((c) => c.id === customerId ? { ...c, active: !c.active } : c));
  }

  function openAddPayment() {
    setPaymentForm({ customerId: '', amount: 0, date: Date.now(), method: 'cash', notes: '', invoiceId: '' });
    setPaymentDialog(true);
  }

  function savePayment() {
    if (!paymentForm.customerId || paymentForm.amount <= 0) { toast.error('يرجى اختيار العميل وإدخال المبلغ'); return; }
    const customer = customers.find((c) => c.id === paymentForm.customerId);
    if (!customer) { toast.error('العميل غير موجود'); return; }
    const receipt: PaymentReceipt = {
      id: generateId(),
      customerId: paymentForm.customerId,
      customerName: customer.name,
      amount: paymentForm.amount,
      date: paymentForm.date,
      method: paymentForm.method,
      notes: paymentForm.notes,
      invoiceId: paymentForm.invoiceId || undefined,
    };
    persistPayments([...payments, receipt]);
    const updatedCustomers = customers.map((c) => c.id === paymentForm.customerId ? { ...c, balance: c.balance - paymentForm.amount } : c);
    persistCustomers(updatedCustomers);
    if (paymentForm.invoiceId) {
      const updatedInvoices = invoices.map((inv) => {
        if (inv.id !== paymentForm.invoiceId) return inv;
        const newPaid = inv.paid + paymentForm.amount;
        const newRemaining = inv.total - newPaid;
        let newStatus: WholesaleInvoice['status'] = inv.status;
        if (newRemaining <= 0) newStatus = 'paid';
        else if (newPaid > 0) newStatus = 'partial';
        if (newStatus !== 'paid' && new Date(inv.dueDate) < new Date()) newStatus = 'overdue';
        return { ...inv, paid: newPaid, remaining: newRemaining, status: newStatus };
      });
      persistInvoices(updatedInvoices);
    }
    toast.success('تم تسجيل القبض');
    setPaymentDialog(false);
  }

  function getDuePayments() {
    const now = Date.now();
    const dueMap = new Map<string, { invoices: WholesaleInvoice[]; totalDue: number }>();
    invoices.filter((i) => i.status !== 'paid').forEach((inv) => {
      const key = new Date(inv.dueDate).toLocaleDateString('ar-EG');
      const existing = dueMap.get(key) || { invoices: [], totalDue: 0 };
      existing.invoices.push(inv);
      existing.totalDue += inv.remaining;
      dueMap.set(key, existing);
    });
    return Array.from(dueMap.entries()).sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime());
  }

  function getDaysOverdue(dueDate: number): number {
    const diff = Date.now() - dueDate;
    return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
  }

  const duePayments = getDuePayments();

  return (
    <div className="space-y-6" dir="rtl">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">الجملة والحسابات</h1>
          <p className="text-muted-foreground text-sm">إدارة عملاء الجملة والفواتير الآجلة والتحصيل</p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'إجمالي المبيعات الآجلة', value: formatCurrency(invoices.reduce((s, i) => s + i.total, 0)), icon: TrendingUp, color: 'from-blue-500 to-blue-600' },
          { label: 'إجمالي المستحق', value: formatCurrency(totalCreditSales), icon: Wallet, color: 'from-amber-500 to-orange-600' },
          { label: 'المتأخر', value: formatCurrency(totalDue), icon: AlertCircle, color: 'from-red-500 to-rose-600' },
          { label: 'عدد العملاء', value: customers.length.toString(), icon: Users, color: 'from-emerald-500 to-green-600' },
        ].map((stat, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="overflow-hidden border-0 shadow-md">
              <div className={`bg-gradient-to-r ${stat.color} p-4`}>
                <div className="flex items-center justify-between">
                  <p className="text-white/80 text-xs font-medium">{stat.label}</p>
                  <stat.icon className="h-5 w-5 text-white/60" />
                </div>
                <p className="text-white text-xl font-bold mt-1">{stat.value}</p>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card className="border-0 shadow-md overflow-hidden">
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-3">
          <div className="flex items-center gap-4 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                    activeTab === tab.key
                      ? 'bg-white/20 text-white shadow-sm'
                      : 'text-white/60 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="relative w-64">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="بحث..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 w-full rounded-lg border border-input bg-background pr-10 pl-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            {activeTab === 'customers' && (
              <Button onClick={openAddCustomer}><UserPlus className="h-4 w-4 ml-1" /> إضافة عميل</Button>
            )}
            {activeTab === 'payments' && (
              <Button onClick={openAddPayment}><Wallet className="h-4 w-4 ml-1" /> تسديد قبض</Button>
            )}
          </div>

          {activeTab === 'customers' && (
            <div className="space-y-2">
              {filteredCustomers.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>لا يوجد عملاء جملة</p>
                </div>
              ) : (
                filteredCustomers.map((customer, i) => (
                  <motion.div
                    key={customer.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex items-center justify-between p-4 rounded-lg border hover:border-primary/30 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{customer.name}</p>
                          <Badge variant={customer.active ? 'success' : 'secondary'} className="text-[10px] px-1.5 py-0">
                            {customer.active ? 'نشط' : 'غير نشط'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                          <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{customer.phone}</span>
                          <span>حد الائتمان: {formatCurrency(customer.creditLimit)}</span>
                          <span>شروط الدفع: {customer.paymentTerms} يوم</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-left">
                        <p className={`text-sm font-bold ${customer.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {customer.balance > 0 ? `مدين: ${formatCurrency(customer.balance)}` : `دائن: ${formatCurrency(Math.abs(customer.balance))}`}
                        </p>
                        {customer.lastPurchaseAt && (
                          <p className="text-[10px] text-muted-foreground">آخر شراء: {formatDate(new Date(customer.lastPurchaseAt))}</p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEditCustomer(customer)} className="h-8 w-8 p-0">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => toggleCustomerStatus(customer.id)} className="h-8 w-8 p-0">
                          {customer.active ? <Ban className="h-4 w-4 text-red-500" /> : <CheckCircle className="h-4 w-4 text-green-500" />}
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          )}

          {activeTab === 'invoices' && (
            <div className="space-y-2">
              {filteredInvoices.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>لا توجد فواتير جملة</p>
                </div>
              ) : (
                filteredInvoices.map((inv, i) => {
                  const expanded = expandedInvoice === inv.id;
                  const statusInfo = STATUS_MAP[inv.status] || STATUS_MAP.unpaid;
                  return (
                    <motion.div
                      key={inv.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.02 }}
                    >
                      <div
                        onClick={() => setExpandedInvoice(expanded ? null : inv.id)}
                        className="flex items-center justify-between p-4 rounded-lg border hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <FileText className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{inv.invoiceNumber}</p>
                              <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {inv.customerName} • {formatDate(new Date(inv.date))}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-left">
                            <p className="text-sm font-bold">{formatCurrency(inv.total)}</p>
                            <p className="text-[10px] text-muted-foreground">
                              المتبقي: {formatCurrency(inv.remaining)} {inv.remaining > 0 && `• تاريخ الاستحقاق: ${formatDate(inv.dueDate)}`}
                            </p>
                          </div>
                          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                        </div>
                      </div>
                      <AnimatePresence>
                        {expanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="p-4 mr-12 border-r-2 border-primary/20 space-y-3 bg-muted/30 rounded-b-lg">
                              <div className="grid grid-cols-3 gap-4 text-sm">
                                <div><span className="text-muted-foreground">المبلغ:</span> <span className="font-medium">{formatCurrency(inv.total)}</span></div>
                                <div><span className="text-muted-foreground">المدفوع:</span> <span className="font-medium">{formatCurrency(inv.paid)}</span></div>
                                <div><span className="text-muted-foreground">المتبقي:</span> <span className="font-medium">{formatCurrency(inv.remaining)}</span></div>
                                <div><span className="text-muted-foreground">تاريخ الاستحقاق:</span> <span className="font-medium">{formatDate(new Date(inv.dueDate))}</span></div>
                                <div><span className="text-muted-foreground">تاريخ الفاتورة:</span> <span className="font-medium">{formatDate(new Date(inv.date))}</span></div>
                              </div>
                              {inv.notes && <p className="text-xs text-muted-foreground">ملاحظات: {inv.notes}</p>}
                              {inv.items.length > 0 && (
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground mb-1">المنتجات:</p>
                                  <div className="space-y-1">
                                    {inv.items.map((item, idx) => (
                                      <div key={idx} className="flex items-center justify-between text-xs bg-background rounded px-2 py-1">
                                        <span>{item.name} × {item.qty}</span>
                                        <span>{formatCurrency(item.total)}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="space-y-2">
              {payments.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Receipt className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>لا توجد سندات قبض</p>
                </div>
              ) : (
                [...payments].reverse().map((p, i) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex items-center justify-between p-4 rounded-lg border hover:border-primary/30 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                        <Banknote className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-medium">{p.customerName}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <span>{formatDate(new Date(p.date))}</span>
                          <span>•</span>
                          <span>{p.method === 'cash' ? 'نقدي' : p.method === 'bank_transfer' ? 'تحويل بنكي' : p.method === 'check' ? 'شيك' : 'شبكة'}</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm font-bold text-green-600">{formatCurrency(p.amount)}</p>
                  </motion.div>
                ))
              )}
            </div>
          )}

          {activeTab === 'dues' && (
            <div className="space-y-4">
              {duePayments.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>لا توجد مواعيد استحقاق</p>
                </div>
              ) : (
                duePayments.map(([dateKey, group]) => {
                  const sampleDue = group.invoices[0].dueDate;
                  const daysOverdue = getDaysOverdue(sampleDue);
                  return (
                    <motion.div key={dateKey} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                      <div className={`rounded-lg border p-4 ${daysOverdue > 0 ? 'border-red-200 bg-red-50/50 dark:bg-red-950/10' : 'border-amber-200 bg-amber-50/50 dark:bg-amber-950/10'}`}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Calendar className={`h-4 w-4 ${daysOverdue > 0 ? 'text-red-500' : 'text-amber-500'}`} />
                            <span className="font-medium">{dateKey}</span>
                            {daysOverdue > 0 && (
                              <Badge variant="destructive" className="text-[10px]">{daysOverdue} يوم متأخر</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">الإجمالي:</span>
                            <span className={`font-bold ${daysOverdue > 0 ? 'text-red-600' : 'text-amber-600'}`}>
                              {formatCurrency(group.totalDue)}
                            </span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          {group.invoices.map((inv) => (
                            <div key={inv.id} className="flex items-center justify-between text-sm bg-background/80 rounded px-3 py-2">
                              <span>{inv.invoiceNumber} - {inv.customerName}</span>
                              <span className="font-medium">{formatCurrency(inv.remaining)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={customerDialog} onOpenChange={setCustomerDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editCustomer ? 'تعديل عميل جملة' : 'إضافة عميل جملة'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input label="الاسم" value={customerForm.name} onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })} placeholder="اسم العميل" />
            <Input label="الهاتف" value={customerForm.phone} onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })} placeholder="رقم الهاتف" />
            <Input label="حد الائتمان" type="number" value={customerForm.creditLimit || ''} onChange={(e) => setCustomerForm({ ...customerForm, creditLimit: Number(e.target.value) })} placeholder="0" />
            <Input label="شروط الدفع (أيام)" type="number" value={customerForm.paymentTerms || ''} onChange={(e) => setCustomerForm({ ...customerForm, paymentTerms: Number(e.target.value) })} placeholder="مثلاً 30 يوم" />
            <Input label="ملاحظات" value={customerForm.notes} onChange={(e) => setCustomerForm({ ...customerForm, notes: e.target.value })} placeholder="ملاحظات" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCustomerDialog(false)}>إلغاء</Button>
            <Button onClick={saveCustomer}>{editCustomer ? 'حفظ التعديلات' : 'إضافة'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={paymentDialog} onOpenChange={setPaymentDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>تسجيل سند قبض</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-foreground">العميل</label>
              <Select value={paymentForm.customerId} onValueChange={(v) => setPaymentForm({ ...paymentForm, customerId: v })}>
                <SelectTrigger><SelectValue placeholder="اختر العميل" /></SelectTrigger>
                <SelectContent>
                  {customers.filter((c) => c.active).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Input label="المبلغ" type="number" value={paymentForm.amount || ''} onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })} />
            <Input label="التاريخ" type="date" value={new Date(paymentForm.date).toISOString().split('T')[0]} onChange={(e) => setPaymentForm({ ...paymentForm, date: new Date(e.target.value).getTime() })} />
            <div>
              <label className="block text-sm font-medium mb-1 text-foreground">طريقة الدفع</label>
              <Select value={paymentForm.method} onValueChange={(v: PaymentReceipt['method']) => setPaymentForm({ ...paymentForm, method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">نقدي</SelectItem>
                  <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                  <SelectItem value="check">شيك</SelectItem>
                  <SelectItem value="card">شبكة</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-foreground">الفاتورة (اختياري)</label>
              <Select value={paymentForm.invoiceId} onValueChange={(v) => setPaymentForm({ ...paymentForm, invoiceId: v })}>
                <SelectTrigger><SelectValue placeholder="اختر الفاتورة" /></SelectTrigger>
                <SelectContent>
                  {invoices.filter((i) => i.status !== 'paid').map((inv) => (
                    <SelectItem key={inv.id} value={inv.id}>{inv.invoiceNumber} - {formatCurrency(inv.remaining)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Input label="ملاحظات" value={paymentForm.notes} onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialog(false)}>إلغاء</Button>
            <Button onClick={savePayment}><Wallet className="h-4 w-4 ml-1" /> تسجيل القبض</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
