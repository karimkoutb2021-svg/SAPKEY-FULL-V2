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
      supabase.from('expenses').select('*').order('created_at', { ascending: false }),
      supabase.from('custodian_settings').select('*').single(),
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
    <div className="space-y-6">
      {/* Smart Custodian Card */}
      <div className="rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-gray-400">عهدة المصروفات النثرية</p>
            <p className="text-2xl font-bold mt-1">{custodianBalance.remaining.toLocaleString('ar-EG')} <span className="text-base text-gray-400">ج.م</span></p>
          </div>
          {isWarning && (
            <span className="text-xs px-3 py-1 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
              تنبيه: العهدة تقترب من الحد الأدنى
            </span>
          )}
        </div>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="rounded-xl bg-white/[0.04] p-3">
            <p className="text-xs text-gray-500">الحد الأقصى</p>
            <p className="text-sm font-semibold mt-1">{custodianBalance.limit.toLocaleString('ar-EG')} ج.م</p>
          </div>
          <div className="rounded-xl bg-white/[0.04] p-3">
            <p className="text-xs text-gray-500">المصروف</p>
            <p className="text-sm font-semibold mt-1 text-amber-400">{custodianBalance.spent.toLocaleString('ar-EG')} ج.م</p>
          </div>
          <div className="rounded-xl bg-white/[0.04] p-3">
            <p className="text-xs text-gray-500">المتبقي</p>
            <p className="text-sm font-semibold mt-1 text-emerald-400">{custodianBalance.remaining.toLocaleString('ar-EG')} ج.م</p>
          </div>
        </div>
        <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden">
          <div className={cn('h-full rounded-full transition-all duration-500', progressColor)} style={{ width: `${Math.max(0, remainingPercent)}%` }} />
        </div>
      </div>

      {/* Add Expense Button + Filter */}
      <div className="flex items-center justify-between">
        <button onClick={() => setShowModal(true)} className="px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors text-sm font-medium">
          + إضافة مصروف
        </button>
        <div className="flex gap-2">
          {[
            { key: 'all', label: 'الكل' },
            { key: 'pending', label: 'معلق' },
            { key: 'approved', label: 'معتمد' },
            { key: 'rejected', label: 'مرفوض' },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                statusFilter === f.key
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-white/[0.04] text-gray-400 hover:bg-white/[0.08]'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Expenses Table */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6">
        <h2 className="text-lg font-semibold mb-4">المصروفات</h2>
        {loading ? (
          <div className="text-center py-8 text-gray-500">جاري التحميل...</div>
        ) : filteredExpenses.length === 0 ? (
          <div className="text-center py-8 text-gray-500">لا توجد مصروفات</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-right py-3 px-2 text-gray-400 font-medium">المبلغ</th>
                  <th className="text-right py-3 px-2 text-gray-400 font-medium">البيان</th>
                  <th className="text-right py-3 px-2 text-gray-400 font-medium">القسم</th>
                  <th className="text-right py-3 px-2 text-gray-400 font-medium">المسؤول</th>
                  <th className="text-right py-3 px-2 text-gray-400 font-medium">الحالة</th>
                  <th className="text-right py-3 px-2 text-gray-400 font-medium">المرفق</th>
                  <th className="text-right py-3 px-2 text-gray-400 font-medium">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-2 font-semibold">{exp.amount.toLocaleString('ar-EG')}</td>
                    <td className="py-3 px-2 text-gray-300">{exp.description}</td>
                    <td className="py-3 px-2">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-white/[0.06] text-gray-300">{exp.category}</span>
                    </td>
                    <td className="py-3 px-2 text-gray-300">{exp.responsible}</td>
                    <td className="py-3 px-2">
                      <span className={cn('text-xs px-2 py-0.5 rounded-full border', statusColors[exp.status])}>
                        {statusLabels[exp.status]}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      {exp.attachment_url ? (
                        <a
                          href={exp.attachment_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs px-2 py-1 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
                        >
                          عرض
                        </a>
                      ) : (
                        <span className="text-xs text-gray-500">—</span>
                      )}
                    </td>
                    <td className="py-3 px-2">
                      {exp.status === 'pending' ? (
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleStatusChange(exp.id, 'approved')}
                            className="px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors text-xs font-medium"
                          >
                            اعتماد
                          </button>
                          <button
                            onClick={() => handleStatusChange(exp.id, 'rejected')}
                            className="px-2 py-1 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors text-xs font-medium"
                          >
                            رفض
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500">—</span>
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
        <button className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 text-emerald-400 hover:from-emerald-500/30 hover:to-teal-500/30 transition-all text-sm font-medium">
          طلب تعويض العهدة
        </button>
      </div>

      {/* Add Expense Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setShowModal(false); setAttachmentUrl(''); }} />
          <div className="relative w-full max-w-lg rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-white/20 shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/50">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                </div>
                إضافة مصروف جديد
              </h3>
              <button onClick={() => { setShowModal(false); setAttachmentUrl(''); }} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors">
                <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">المبلغ</label>
                  <div className="relative">
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">ج.م</span>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full pr-10 pl-3 py-2.5 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all font-semibold"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">التصنيف</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all font-medium"
                  >
                    <option value="">اختر القسم المستفيد</option>
                    {categoryOptions.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">البيان / الوصف</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="اكتب تفاصيل المصروف هنا..."
                  className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">المسؤول عن الصرف</label>
                <input
                  type="text"
                  value={responsible}
                  onChange={(e) => setResponsible(e.target.value)}
                  placeholder="اسم الشخص المسؤول"
                  className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">مرفق (فاتورة / إيصال)</label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 py-2.5 border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-xl text-sm text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-800/50 hover:border-emerald-500/50 transition-all flex items-center justify-center gap-2 font-medium"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    </svg>
                    {attachmentUrl ? 'تغيير المرفق' : 'رفع إيصال (اختياري)'}
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    className="hidden"
                    accept="image/*,.pdf"
                  />
                  {attachmentUrl && (
                    <div className="w-12 h-12 rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden shrink-0 relative group">
                      <img src={attachmentUrl} alt="مرفق" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center cursor-pointer" onClick={() => { setAttachmentUrl(''); if (fileInputRef.current) fileInputRef.current.value = ''; }}>
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 pt-0 flex gap-3">
              <button
                onClick={() => { setShowModal(false); setAttachmentUrl(''); }}
                className="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 text-sm hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors font-bold"
              >
                إلغاء
              </button>
              <button
                onClick={handleCreate}
                disabled={!amount || !description || !category || !responsible}
                className="flex-1 py-3 rounded-xl bg-gradient-to-l from-emerald-600 to-emerald-500 text-white text-sm hover:from-emerald-500 hover:to-emerald-400 transition-all font-bold shadow-lg shadow-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                حفظ المصروف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
