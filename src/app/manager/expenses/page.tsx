'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

const supabase = createClient();

interface Expense {
  id: string;
  amount: number;
  description: string;
  category: string;
  responsible: string;
  attachment_url?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

const categoryOptions = ['مخازن', 'مبيعات', 'نظافة', 'صيانة', 'إداري', 'أخرى'];

const statusLabels: Record<string, string> = {
  pending: 'معلق',
  approved: 'معتمد',
  rejected: 'مرفوض',
};

const statusColors: Record<string, string> = {
  pending: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  approved: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
};

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [responsible, setResponsible] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [custodianBalance, setCustodianBalance] = useState({ limit: 50000, spent: 0, remaining: 50000 });
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();

    const channel = supabase.channel('expenses-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, () => fetchData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  async function fetchData() {
    const [expensesRes, balanceRes] = await Promise.all([
      supabase.from('expenses').select('id, amount, description, category, responsible, attachment_url, status, created_at').order('created_at', { ascending: false }),
      supabase.from('custodian_settings').select('id, limit').single(),
    ]);

    if (expensesRes.data) setExpenses(expensesRes.data);
    if (balanceRes.data) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const monthlyExpenses = expensesRes.data?.filter((e: Expense) =>
        e.status === 'approved' && new Date(e.created_at) >= today
      ) || [];
      const spent = monthlyExpenses.reduce((sum: number, e: Expense) => sum + e.amount, 0);
      const limit = balanceRes.data.limit || 50000;
      setCustodianBalance({ limit, spent, remaining: limit - spent });
    }
    setLoading(false);
  }

  async function handleCreate() {
    if (!amount || !description || !category || !responsible) return;
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    await supabase.from('expenses').insert({
      amount: numAmount,
      description,
      category,
      responsible,
      attachment_url: attachmentUrl || null,
      status: 'pending',
    });

    setShowModal(false);
    setAmount('');
    setDescription('');
    setCategory('');
    setResponsible('');
    setAttachmentUrl('');
    fetchData();
  }

  async function handleStatusChange(id: string, status: 'approved' | 'rejected') {
    await supabase.from('expenses').update({ status }).eq('id', id);
    fetchData();
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setAttachmentUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  }

  const remainingPercent = custodianBalance.limit > 0 ? (custodianBalance.remaining / custodianBalance.limit) * 100 : 0;
  const progressColor = remainingPercent > 30 ? 'bg-emerald-500' : remainingPercent > 10 ? 'bg-amber-500' : 'bg-red-500';
  const isWarning = custodianBalance.remaining < 500;

  const filteredExpenses = statusFilter === 'all' ? expenses : expenses.filter(e => e.status === statusFilter);

  return (
    <div className="space-y-6" dir="rtl">
      {/* Smart Custodian Card */}
      <div className="rounded-[2rem] bg-[#111114]/90 backdrop-blur-3xl border border-emerald-500/20 p-8 shadow-2xl shadow-emerald-500/5 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 pointer-events-none" />
        <div className="relative">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-sm font-bold text-emerald-500 mb-1">عهدة المصروفات النثرية</p>
              <p className="text-3xl font-black text-white">{custodianBalance.remaining.toLocaleString('ar-EG')} <span className="text-base text-gray-400 font-bold">ج.م</span></p>
            </div>
            {isWarning && (
              <span className="text-xs px-4 py-2 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 font-bold flex items-center gap-2 animate-pulse">
                <span>⚠️</span>
                تنبيه: العهدة تقترب من الحد الأدنى
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="rounded-2xl bg-white/[0.02] border border-white/[0.04] p-5">
              <p className="text-xs font-bold text-gray-500 mb-2">الحد الأقصى للعهدة</p>
              <p className="text-lg font-black text-white">{custodianBalance.limit.toLocaleString('ar-EG')} <span className="text-sm text-gray-400">ج.م</span></p>
            </div>
            <div className="rounded-2xl bg-white/[0.02] border border-white/[0.04] p-5">
              <p className="text-xs font-bold text-gray-500 mb-2">إجمالي المصروفات</p>
              <p className="text-lg font-black text-amber-400">{custodianBalance.spent.toLocaleString('ar-EG')} <span className="text-sm opacity-50">ج.م</span></p>
            </div>
            <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-5">
              <p className="text-xs font-bold text-emerald-500/80 mb-2">الرصيد المتاح</p>
              <p className="text-lg font-black text-emerald-400">{custodianBalance.remaining.toLocaleString('ar-EG')} <span className="text-sm opacity-50">ج.م</span></p>
            </div>
          </div>
          <div className="w-full h-3 rounded-full bg-white/[0.04] overflow-hidden border border-white/[0.02] shadow-inner">
            <div className={cn('h-full rounded-full transition-all duration-1000 shadow-lg', progressColor, 
              progressColor === 'bg-emerald-500' ? 'shadow-emerald-500/50' : 
              progressColor === 'bg-amber-500' ? 'shadow-amber-500/50' : 'shadow-red-500/50'
            )} style={{ width: `${Math.max(0, remainingPercent)}%` }} />
          </div>
        </div>
      </div>

      {/* Add Expense Button + Filter */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-[#111114]/90 backdrop-blur-3xl border border-white/[0.06] p-4 rounded-[2rem] shadow-xl">
        <button onClick={() => setShowModal(true)} className="w-full md:w-auto px-6 py-3 rounded-xl bg-gradient-to-l from-emerald-600 to-emerald-500 text-white hover:from-emerald-500 hover:to-emerald-400 transition-all font-bold shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2">
          <span>+</span>
          إضافة مصروف جديد
        </button>
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
          {[
            { key: 'all', label: 'الكل' },
            { key: 'pending', label: 'معلق' },
            { key: 'approved', label: 'معتمد' },
            { key: 'rejected', label: 'مرفوض' },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={cn('flex-shrink-0 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300',
                statusFilter === f.key
                  ? 'bg-white/10 text-white shadow-inner'
                  : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Expenses Table */}
      <div className="rounded-[2rem] bg-[#111114]/90 backdrop-blur-3xl border border-white/[0.06] p-8 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">سجل المصروفات</h2>
        </div>
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-emerald-500/50">
            <span className="w-10 h-10 border-4 border-current border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-gray-400 font-medium">جاري تحميل المصروفات...</p>
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-500">
            <p className="text-lg font-medium">لا توجد مصروفات</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-8 px-8">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-right py-4 px-4 text-gray-400 font-bold whitespace-nowrap">المبلغ</th>
                  <th className="text-right py-4 px-4 text-gray-400 font-bold whitespace-nowrap">البيان</th>
                  <th className="text-right py-4 px-4 text-gray-400 font-bold whitespace-nowrap">القسم</th>
                  <th className="text-right py-4 px-4 text-gray-400 font-bold whitespace-nowrap">المسؤول</th>
                  <th className="text-right py-4 px-4 text-gray-400 font-bold whitespace-nowrap">الحالة</th>
                  <th className="text-right py-4 px-4 text-gray-400 font-bold whitespace-nowrap">المرفق</th>
                  <th className="text-right py-4 px-4 text-gray-400 font-bold whitespace-nowrap">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors group">
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className="font-black text-white text-base">{exp.amount.toLocaleString('ar-EG')}</span>
                      <span className="text-xs text-gray-500 mr-1">ج.م</span>
                    </td>
                    <td className="py-4 px-4 text-gray-300 font-medium min-w-[200px]">{exp.description}</td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className="text-xs px-3 py-1 rounded-xl bg-white/[0.04] border border-white/[0.06] text-gray-300 font-bold">{exp.category}</span>
                    </td>
                    <td className="py-4 px-4 text-gray-300 font-bold whitespace-nowrap">{exp.responsible}</td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className={cn('text-xs px-3 py-1.5 rounded-xl font-bold border', statusColors[exp.status])}>
                        {statusLabels[exp.status]}
                      </span>
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      {exp.attachment_url ? (
                        <a
                          href={exp.attachment_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500 hover:text-white transition-all font-bold"
                        >
                          عرض المرفق
                        </a>
                      ) : (
                        <span className="text-xs text-gray-600 font-bold px-3">بدون مرفق</span>
                      )}
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      {exp.status === 'pending' ? (
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleStatusChange(exp.id, 'approved')}
                            className="px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500 hover:text-white transition-all text-xs font-bold shadow-lg shadow-transparent hover:shadow-emerald-500/25"
                          >
                            اعتماد
                          </button>
                          <button
                            onClick={() => handleStatusChange(exp.id, 'rejected')}
                            className="px-4 py-2 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-white transition-all text-xs font-bold shadow-lg shadow-transparent hover:shadow-red-500/25"
                          >
                            رفض
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-600 font-bold px-3 opacity-0 group-hover:opacity-100 transition-opacity">مكتمل</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Replenishment Button */}
      <div className="flex justify-center">
        <button className="px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 text-emerald-400 hover:from-emerald-500/20 hover:to-teal-500/20 transition-all font-bold shadow-lg shadow-emerald-500/5 hover:shadow-emerald-500/20 hover:-translate-y-0.5 duration-300">
          طلب تعويض / استعاضة العهدة
        </button>
      </div>

      {/* Add Expense Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#0A0A0C]/80 backdrop-blur-sm" onClick={() => { setShowModal(false); setAttachmentUrl(''); }} />
          <div className="relative w-full max-w-lg rounded-[2rem] bg-[#111114]/95 backdrop-blur-3xl border border-white/[0.08] shadow-2xl shadow-emerald-500/10 overflow-hidden" dir="rtl">
            {/* Modal Header */}
            <div className="px-8 py-6 border-b border-white/[0.06] flex justify-between items-center bg-white/[0.02]">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">إضافة مصروف جديد</h3>
                  <p className="text-sm text-gray-400">سجل مصروفاً جديداً لاعتماده من الإدارة</p>
                </div>
              </div>
              <button onClick={() => { setShowModal(false); setAttachmentUrl(''); }} className="w-10 h-10 rounded-full bg-white/[0.04] flex items-center justify-center text-gray-400 hover:bg-white/[0.08] hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-400">المبلغ <span className="text-emerald-500">*</span></label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-bold">ج.م</span>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.08] text-white font-bold text-lg focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all placeholder-gray-600"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-400">القسم المستفيد <span className="text-emerald-500">*</span></label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all [&>option]:bg-[#111114]"
                  >
                    <option value="">اختر القسم...</option>
                    {categoryOptions.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-400">البيان / الوصف <span className="text-emerald-500">*</span></label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="اكتب تفاصيل أو سبب المصروف..."
                  className="w-full px-4 py-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all placeholder-gray-600"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-400">المسؤول عن الصرف <span className="text-emerald-500">*</span></label>
                <input
                  type="text"
                  value={responsible}
                  onChange={(e) => setResponsible(e.target.value)}
                  placeholder="اسم الشخص المسؤول"
                  className="w-full px-4 py-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all placeholder-gray-600"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-400">مرفق أو فاتورة</label>
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    className="hidden"
                    accept="image/*,.pdf"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      "w-full py-4 border-2 border-dashed rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-3",
                      attachmentUrl 
                        ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400" 
                        : "border-white/[0.1] bg-white/[0.02] text-gray-400 hover:border-emerald-500/30 hover:bg-white/[0.04]"
                    )}
                  >
                    {attachmentUrl ? (
                      <>
                        <span className="text-xl">✅</span>
                        تم إرفاق المستند بنجاح (انقر للتغيير)
                      </>
                    ) : (
                      <>
                        <span className="text-xl">📷</span>
                        إرفاق صورة الفاتورة أو الإيصال (اختياري)
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-8 pt-4 flex gap-3">
              <button
                onClick={() => { setShowModal(false); setAttachmentUrl(''); }}
                className="flex-1 py-4 rounded-2xl bg-white/[0.04] border border-white/[0.04] text-gray-400 hover:text-white hover:bg-white/[0.08] transition-colors font-bold"
              >
                إلغاء الأمر
              </button>
              <button
                onClick={handleCreate}
                disabled={!amount || !description || !category || !responsible}
                className="flex-[2] py-4 rounded-2xl bg-gradient-to-l from-emerald-600 to-emerald-500 text-white font-bold hover:from-emerald-500 hover:to-emerald-400 transition-all shadow-lg shadow-emerald-500/25 disabled:opacity-50 disabled:shadow-none"
              >
                حفظ وإرسال للاعتماد
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
