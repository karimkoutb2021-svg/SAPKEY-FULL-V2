'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { PageTransition } from '@/components/ui/page-transition';
import { BackButton } from '@/components/layout/back-button';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { formatCurrency, formatDate } from '@/lib/utils';
import { motion } from 'framer-motion';
import * as XLSX from 'xlsx';
import {
  TrendingDown, Plus, Search, Download, Wallet,
  Building2, Zap, Package, Truck, Users,
  RefreshCw, Trash2, ImageIcon, X, Save, Camera, Loader2,
} from 'lucide-react';

const supabase = createClient();

interface Expense {
  id: string; date: string; category: string; description: string;
  amount: number; payment_method: string; status: 'paid' | 'pending' | 'cancelled';
  user_name: string; receipt?: string; notes?: string; created_at: string;
}

const PREDEFINED_CATEGORIES = [
  'إيجار', 'رواتب', 'كهرباء', 'مياه', 'صيانة', 'تسويق',
  'مواصلات', 'قرطاسية', 'صيانة معدات', 'نظافة', 'تأمينات', 'أخرى',
];

const PAYMENT_METHODS = ['نقداً', 'بنك', 'بطاقة', 'شيك', 'محفظة'];

const categoryIcons: Record<string, React.ElementType> = {
  إيجار: Building2, رواتب: Users, كهرباء: Zap, مياه: Zap,
  صيانة: Package, تسويق: Download, مواصلات: Truck,
  'صيانة معدات': Package, نظافة: Zap, قرطاسية: Download,
  تأمينات: Download, أخرى: Wallet,
};

const EMPTY_FORM = {
  date: new Date().toISOString().split('T')[0],
  category: '', description: '', amount: '',
  payment_method: 'نقداً', status: 'paid' as 'paid' | 'pending' | 'cancelled',
  user_name: '', notes: '', receipt: '',
};

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [viewReceipt, setViewReceipt] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    const ch = supabase.channel('acct-expenses')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, () => {
        loadData();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  async function loadData() {
    try {
      const { data } = await supabase.from('expenses').select('*').order('created_at', { ascending: false });
      if (data) setExpenses(data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }

  const allCategories = useMemo(() => {
    const cats = new Set(PREDEFINED_CATEGORIES);
    expenses.forEach((e) => cats.add(e.category));
    return [...cats];
  }, [expenses]);

  const filtered = useMemo(() => {
    return expenses.filter((e) => {
      const ms = !search || (e.description || '').includes(search) || (e.category || '').includes(search);
      const mc = catFilter === 'all' || e.category === catFilter;
      return ms && mc;
    });
  }, [expenses, search, catFilter]);

  const totalExpenses = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses]);
  const thisMonthExpenses = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    return expenses.filter((e) => new Date(e.date).getTime() >= startOfMonth && e.status !== 'cancelled').reduce((s, e) => s + e.amount, 0);
  }, [expenses]);
  const pendingExpenses = useMemo(() => expenses.filter((e) => e.status === 'pending').reduce((s, e) => s + e.amount, 0), [expenses]);
  const dailyAvg = useMemo(() => {
    if (expenses.length === 0) return 0;
    const oldest = Math.min(...expenses.map((e) => new Date(e.date).getTime()));
    const days = Math.max(1, (Date.now() - oldest) / 86400000);
    return Math.round(totalExpenses / days);
  }, [expenses, totalExpenses]);
  const categoryTotals = useMemo(() => {
    const ct: Record<string, number> = {};
    expenses.forEach((e) => { ct[e.category] = (ct[e.category] || 0) + e.amount; });
    return ct;
  }, [expenses]);

  function handleChange(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) setFormErrors((prev) => ({ ...prev, [field]: '' }));
  }

  function openAddDialog() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, date: new Date().toISOString().split('T')[0] });
    setFormErrors({});
    setDialogOpen(true);
  }

  function openEditDialog(exp: Expense) {
    setEditingId(exp.id);
    setForm({
      date: new Date(exp.date).toISOString().split('T')[0],
      category: exp.category,
      description: exp.description,
      amount: String(exp.amount),
      payment_method: exp.payment_method,
      status: exp.status,
      user_name: exp.user_name,
      notes: exp.notes || '',
      receipt: exp.receipt || '',
    });
    setFormErrors({});
    setDialogOpen(true);
  }

  function handleReceiptUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('حجم الصورة يجب أن لا يتجاوز 2 ميجابايت'); return; }
    const reader = new FileReader();
    reader.onload = () => setForm((prev) => ({ ...prev, receipt: reader.result as string }));
    reader.readAsDataURL(file);
  }

  function validate(): boolean {
    const errors: Record<string, string> = {};
    if (!form.description.trim()) errors.description = 'البيان مطلوب';
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0) errors.amount = 'المبلغ يجب أن يكون رقماً صحيحاً';
    if (!form.category) errors.category = 'التصنيف مطلوب';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload = {
        date: new Date(form.date).toISOString(),
        category: form.category,
        description: form.description.trim(),
        amount: Number(form.amount),
        payment_method: form.payment_method,
        status: form.status,
        user_name: form.user_name || 'المستخدم',
        notes: form.notes || null,
      };

      if (editingId) {
        const { error } = await supabase.from('expenses').update(payload).eq('id', editingId);
        if (error) { toast.error(error.message); return; }
        toast.success('تم تحديث المصروف');
      } else {
        const { error } = await supabase.from('expenses').insert(payload);
        if (error) { toast.error(error.message); return; }
        toast.success('تم إضافة المصروف');
      }
      setDialogOpen(false);
      loadData();
    } catch { toast.error('فشل الحفظ'); }
    finally { setSubmitting(false); }
  }

  async function handleDelete(id: string) {
    try {
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) { toast.error(error.message); return; }
      setDeleteConfirm(null);
      toast.success('تم حذف المصروف');
      loadData();
    } catch { toast.error('فشل الحذف'); }
  }

  function handleExport() {
    if (expenses.length === 0) { toast.error('لا توجد مصروفات للتصدير'); return; }
    const data = expenses.map((e, i) => ({
      '#': i + 1, 'التاريخ': formatDate(new Date(e.date), 'long'), 'البيان': e.description,
      'التصنيف': e.category, 'المبلغ': e.amount, 'طريقة الدفع': e.payment_method,
      'الحالة': e.status === 'paid' ? 'مدفوع' : e.status === 'pending' ? 'معلق' : 'ملغي',
      'المستخدم': e.user_name,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'المصروفات');
    XLSX.writeFile(wb, `مصروفات_${new Date().toLocaleDateString('ar-EG').replace(/\//g, '-')}.xlsx`);
    toast.success('تم تصدير الملف');
  }

  return (
    <PageTransition>
      <div className="space-y-4 md:space-y-6 max-w-7xl mx-auto px-2 md:px-4" dir="rtl">
        <div className="flex items-center flex-wrap gap-2 justify-between">
          <div>
            <div className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-red-500" />
              <BackButton href="/accounting" label="المحاسبة" />
              <h1 className="text-lg md:text-2xl font-bold">المصروفات</h1>
            </div>
            <p className="text-xs md:text-sm text-muted-foreground">تسجيل وتتبع جميع مصروفات المتجر</p>
          </div>
          <div className="flex gap-1.5 md:gap-2">
            <button onClick={handleExport}
              className="h-8 md:h-9 px-2.5 md:px-3 rounded-lg border text-[10px] md:text-xs flex items-center gap-1 hover:bg-accent transition-colors">
              <Download className="h-3 w-3 md:h-3.5 md:w-3.5" /> تصدير
            </button>
            <button onClick={openAddDialog}
              className="h-8 md:h-9 px-2.5 md:px-3 rounded-lg text-white text-[10px] md:text-xs flex items-center gap-1"
              style={{ backgroundColor: 'var(--primary, #22C55E)' }}>
              <Plus className="h-3 w-3 md:h-3.5 md:w-3.5" /> إضافة مصروف
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
              <Card className="shadow-sm"><CardContent className="p-3 md:p-4"><p className="text-[9px] md:text-xs text-muted-foreground">إجمالي المصروفات</p><p className="text-xs md:text-2xl font-bold text-red-600 tabular-nums">{formatCurrency(totalExpenses)}</p></CardContent></Card>
              <Card className="shadow-sm"><CardContent className="p-3 md:p-4"><p className="text-[9px] md:text-xs text-muted-foreground">هذا الشهر</p><p className="text-xs md:text-2xl font-bold tabular-nums">{formatCurrency(thisMonthExpenses)}</p></CardContent></Card>
              <Card className="shadow-sm"><CardContent className="p-3 md:p-4"><p className="text-[9px] md:text-xs text-muted-foreground">غير مدفوعة</p><p className="text-xs md:text-2xl font-bold text-amber-600 tabular-nums">{formatCurrency(pendingExpenses)}</p></CardContent></Card>
              <Card className="shadow-sm"><CardContent className="p-3 md:p-4"><p className="text-[9px] md:text-xs text-muted-foreground">معدل يومي</p><p className="text-xs md:text-2xl font-bold tabular-nums">{formatCurrency(dailyAvg)}</p></CardContent></Card>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
              {allCategories.map((cat) => {
                const Icon = categoryIcons[cat] || Wallet;
                return (
                  <button key={cat} onClick={() => setCatFilter(catFilter === cat ? 'all' : cat)}
                    className={`p-2.5 md:p-3 rounded-xl border text-right transition-all ${catFilter === cat ? 'border-primary bg-primary/5' : 'hover:bg-accent'}`}>
                    <div className="flex items-center gap-1.5 md:gap-2 mb-0.5 md:mb-1">
                      <Icon className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
                      <span className="text-[10px] md:text-sm font-medium">{cat}</span>
                    </div>
                    <p className="text-xs md:text-lg font-bold tabular-nums">{formatCurrency(categoryTotals[cat] || 0)}</p>
                  </button>
                );
              })}
            </div>

            <Card className="shadow-sm">
              <CardContent className="p-0">
                <div className="p-2 md:p-3 border-b">
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
                    <input type="text" placeholder="بحث عن بيان أو تصنيف..."
                      className="w-full h-8 md:h-10 rounded-lg border pr-10 pl-3 text-[10px] md:text-sm"
                      value={search} onChange={(e) => setSearch(e.target.value)} />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[10px] md:text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-right p-2 md:p-3 font-medium text-muted-foreground">التاريخ</th>
                        <th className="text-right p-2 md:p-3 font-medium text-muted-foreground">البيان</th>
                        <th className="text-right p-2 md:p-3 font-medium text-muted-foreground">التصنيف</th>
                        <th className="text-left p-2 md:p-3 font-medium text-muted-foreground">المبلغ</th>
                        <th className="text-center p-2 md:p-3 font-medium text-muted-foreground">الحالة</th>
                        <th className="text-center p-2 md:p-3 font-medium text-muted-foreground" />
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.length === 0 ? (
                        <tr><td colSpan={6} className="text-center p-6 md:p-8 text-muted-foreground">لا توجد مصروفات</td></tr>
                      ) : (
                        filtered.map((exp) => (
                          <tr key={exp.id} className="border-b hover:bg-accent/50 cursor-pointer" onClick={() => openEditDialog(exp)}>
                            <td className="p-2 md:p-3">{formatDate(new Date(exp.date))}</td>
                            <td className="p-2 md:p-3 font-medium">{exp.description}</td>
                            <td className="p-2 md:p-3"><Badge variant="outline" className="text-[9px] md:text-xs">{exp.category}</Badge></td>
                            <td className="p-2 md:p-3 text-left font-bold tabular-nums text-red-600">{formatCurrency(exp.amount)}</td>
                            <td className="p-2 md:p-3 text-center">
                              <Badge variant={exp.status === 'paid' ? 'success' : exp.status === 'pending' ? 'warning' : 'destructive'} className="text-[9px] md:text-xs">
                                {exp.status === 'paid' ? 'مدفوع' : exp.status === 'pending' ? 'معلق' : 'ملغي'}
                              </Badge>
                            </td>
                            <td className="p-2 md:p-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                {exp.receipt && (
                                  <button onClick={(e) => { e.stopPropagation(); setViewReceipt(exp.receipt!); }} className="text-primary hover:text-primary/80">
                                    <ImageIcon className="h-3 w-3 md:h-4 md:w-4" />
                                  </button>
                                )}
                                <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm(exp.id); }} className="text-destructive hover:text-destructive/80">
                                  <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 bg-muted/30">
                        <td colSpan={3} className="p-2 md:p-3 text-left font-bold">الإجمالي</td>
                        <td className="p-2 md:p-3 text-left font-bold text-red-600 tabular-nums">{formatCurrency(filtered.reduce((s, e) => s + e.amount, 0))}</td>
                        <td colSpan={2} />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle>{editingId ? 'تعديل مصروف' : 'إضافة مصروف جديد'}</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] md:text-sm font-medium">التصنيف</label>
                  <Select value={form.category} onValueChange={(v) => handleChange('category', v)}>
                    <SelectTrigger className="h-8 md:h-9 text-[10px] md:text-sm"><SelectValue placeholder="اختر التصنيف" /></SelectTrigger>
                    <SelectContent>
                      {PREDEFINED_CATEGORIES.map((cat) => (<SelectItem key={cat} value={cat} className="text-[10px] md:text-sm">{cat}</SelectItem>))}
                    </SelectContent>
                  </Select>
                  {formErrors.category && <p className="text-[9px] md:text-xs text-destructive">{formErrors.category}</p>}
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] md:text-sm font-medium">المبلغ</label>
                  <input type="number" placeholder="0.00"
                    className="w-full h-8 md:h-9 rounded-lg border px-3 text-[10px] md:text-sm"
                    value={form.amount} onChange={(e) => handleChange('amount', e.target.value)} />
                  {formErrors.amount && <p className="text-[9px] md:text-xs text-destructive">{formErrors.amount}</p>}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] md:text-sm font-medium">البيان</label>
                <input type="text" placeholder="وصف المصروف"
                  className="w-full h-8 md:h-9 rounded-lg border px-3 text-[10px] md:text-sm"
                  value={form.description} onChange={(e) => handleChange('description', e.target.value)} />
                {formErrors.description && <p className="text-[9px] md:text-xs text-destructive">{formErrors.description}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] md:text-sm font-medium">طريقة الدفع</label>
                  <Select value={form.payment_method} onValueChange={(v) => handleChange('payment_method', v)}>
                    <SelectTrigger className="h-8 md:h-9 text-[10px] md:text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map((m) => (<SelectItem key={m} value={m} className="text-[10px] md:text-sm">{m}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] md:text-sm font-medium">الحالة</label>
                  <Select value={form.status} onValueChange={(v: any) => handleChange('status', v)}>
                    <SelectTrigger className="h-8 md:h-9 text-[10px] md:text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paid" className="text-[10px] md:text-sm">مدفوع</SelectItem>
                      <SelectItem value="pending" className="text-[10px] md:text-sm">معلق</SelectItem>
                      <SelectItem value="cancelled" className="text-[10px] md:text-sm">ملغي</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] md:text-sm font-medium">التاريخ</label>
                  <input type="date" value={form.date} onChange={(e) => handleChange('date', e.target.value)}
                    className="w-full h-8 md:h-9 rounded-lg border px-3 text-[10px] md:text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] md:text-sm font-medium">المستخدم</label>
                  <input type="text" placeholder="اسم المسجل" value={form.user_name} onChange={(e) => handleChange('user_name', e.target.value)}
                    className="w-full h-8 md:h-9 rounded-lg border px-3 text-[10px] md:text-sm" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] md:text-sm font-medium">ملاحظات</label>
                <textarea className="flex min-h-[60px] md:min-h-[80px] w-full rounded-lg border px-3 py-2 text-[10px] md:text-sm"
                  placeholder="ملاحظات إضافية..." value={form.notes} onChange={(e) => handleChange('notes', e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] md:text-sm font-medium">إرفاق إيصال</label>
                <div className="flex items-center gap-3">
                  <button type="button" className="h-8 md:h-9 px-2.5 md:px-3 rounded-lg border text-[10px] md:text-xs flex items-center gap-1" onClick={() => document.getElementById('receipt-upload')?.click()}>
                    <Camera className="h-3 w-3 md:h-4 md:w-4" /> {form.receipt ? 'تغيير الصورة' : 'اختيار صورة'}
                  </button>
                  <input id="receipt-upload" type="file" accept="image/*" className="hidden" onChange={handleReceiptUpload} />
                  {form.receipt && <span className="text-[9px] md:text-xs text-muted-foreground">تم الرفع ✓</span>}
                </div>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <button className="h-8 md:h-9 px-3 rounded-lg border text-[10px] md:text-xs" onClick={() => setDialogOpen(false)}>إلغاء</button>
              <button onClick={handleSave} disabled={submitting}
                className="h-8 md:h-9 px-3 rounded-lg text-white text-[10px] md:text-xs flex items-center gap-1"
                style={{ backgroundColor: 'var(--primary, #22C55E)' }}>
                <Save className="h-3 w-3 md:h-4 md:w-4" /> {submitting ? 'جاري الحفظ...' : 'حفظ'}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader><DialogTitle>تأكيد الحذف</DialogTitle></DialogHeader>
            <p className="text-[10px] md:text-sm text-muted-foreground">هل أنت متأكد من حذف هذا المصروف؟ لا يمكن التراجع عن هذا الإجراء.</p>
            <DialogFooter className="gap-2">
              <button className="h-8 md:h-9 px-3 rounded-lg border text-[10px] md:text-xs" onClick={() => setDeleteConfirm(null)}>إلغاء</button>
              <button className="h-8 md:h-9 px-3 rounded-lg text-white text-[10px] md:text-xs bg-red-500" onClick={() => handleDelete(deleteConfirm!)}>
                <Trash2 className="h-3 w-3 md:h-4 md:w-4 ml-1" /> حذف
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!viewReceipt} onOpenChange={() => setViewReceipt(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>عرض الإيصال</DialogTitle></DialogHeader>
            {viewReceipt && <div className="flex justify-center"><img src={viewReceipt} alt="إيصال" className="max-w-full rounded-lg max-h-[60vh] object-contain" /></div>}
            <DialogFooter className="gap-2">
              <button className="h-8 md:h-9 px-3 rounded-lg border text-[10px] md:text-xs" onClick={() => setViewReceipt(null)}>إغلاق</button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  );
}
