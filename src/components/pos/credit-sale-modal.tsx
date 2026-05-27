'use client';

/**
 * ═══════════════════════════════════════════════════════════
 *  بيع آجل - Credit Sale Modal
 * ═══════════════════════════════════════════════════════════
 * 
 * جمع بيانات العميل الكاملة + جدول السداد (مواعيد + دفعات)
 * Full customer data + payment schedule with due dates
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, User, Phone, Mail, MapPin, Calendar, Wallet,
  Plus, Trash2, CheckCircle, AlertCircle, Clock, FileText,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';

interface PaymentInstallment {
  amount: number;
  dueDate: string;
}

interface CustomerData {
  name: string;
  phone: string;
  nationalId: string;
  address: string;
  notes: string;
}

interface CreditSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  total: number;
  onComplete: (customer: CustomerData, installments: PaymentInstallment[]) => void;
}

export function CreditSaleModal({ isOpen, onClose, total, onComplete }: CreditSaleModalProps) {
  const [customer, setCustomer] = useState<CustomerData>({
    name: '',
    phone: '',
    nationalId: '',
    address: '',
    notes: '',
  });

  const [installments, setInstallments] = useState<PaymentInstallment[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ═══════════════════════════════════════════════════════
  // حساب إجمالي الدفعات
  // ═══════════════════════════════════════════════════════
  const totalInstallments = installments.reduce((sum, i) => sum + i.amount, 0);
  const remaining = total - totalInstallments;

  const addInstallment = useCallback(() => {
    setInstallments(prev => [...prev, { amount: 0, dueDate: '' }]);
  }, []);

  const removeInstallment = useCallback((index: number) => {
    setInstallments(prev => prev.filter((_, i) => i !== index));
  }, []);

  const updateInstallment = useCallback((index: number, field: 'amount' | 'dueDate', value: string | number) => {
    setInstallments(prev => prev.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    ));
  }, []);

  // ═══════════════════════════════════════════════════════
  // التحقق من البيانات
  // ═══════════════════════════════════════════════════════
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    // بيانات العميل
    if (!customer.name.trim()) newErrors.name = 'اسم العميل مطلوب';
    if (!customer.phone.trim()) newErrors.phone = 'رقم الهاتف مطلوب';
    else if (!/^[\d\+]{7,15}$/.test(customer.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'رقم هاتف غير صحيح';
    }

    // الدفعات
    if (installments.length === 0) {
      newErrors.installments = 'أضف دفعة واحدة على الأقل';
    } else {
      // كل دفعة لازم يكون ليها مبلغ وتاريخ
      installments.forEach((inst, i) => {
        if (inst.amount <= 0) newErrors[`inst_amount_${i}`] = 'المبلغ مطلوب';
        if (!inst.dueDate) newErrors[`inst_date_${i}`] = 'التاريخ مطلوب';
      });

      // إجمالي الدفعات لازم يساوي الإجمالي
      if (Math.abs(remaining) > 0.01) {
        newErrors.total = `إجمالي الدفعات (${formatCurrency(totalInstallments)}) لا يساوي الإجمالي (${formatCurrency(total)})`;
      }

      // التأكد إن التواريخ مش في الماضي
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      installments.forEach((inst, i) => {
        if (inst.dueDate && new Date(inst.dueDate) < today) {
          newErrors[`inst_date_${i}`] = 'التاريخ لا يمكن أن يكون في الماضي';
        }
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) {
      toast.error('يرجى تصحيح الأخطاء');
      return;
    }
    onComplete(customer, installments);
  };

  // ═══════════════════════════════════════════════════════
  // إضافة دفعة سريعة
  // ═══════════════════════════════════════════════════════
  const addQuickInstallment = (type: 'full' | 'half' | 'third' | 'custom') => {
    let amount = 0;
    switch (type) {
      case 'full': amount = total; break;
      case 'half': amount = total / 2; break;
      case 'third': amount = total / 3; break;
    }

    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const dueDate = nextMonth.toISOString().split('T')[0];

    setInstallments([{ amount: parseFloat(amount.toFixed(2)), dueDate }]);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-950 rounded-t-3xl shadow-2xl max-h-[90vh] overflow-y-auto max-w-lg mx-auto"
            dir="rtl"
          >
            {/* شريط السحب */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-12 rounded-full bg-gray-300 dark:bg-slate-600" />
            </div>

            {/* العنوان */}
            <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-amber-500" />
                  <h3 className="text-base font-black text-gray-900 dark:text-white">بيع آجل</h3>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">بيانات العميل + جدول السداد</p>
              </div>
              <button onClick={onClose} className="h-9 w-9 rounded-xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center">
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* ═══════════════════════════════════════════
                  الإجمالي
                  ═══════════════════════════════════════════ */}
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-4 text-white text-center">
                <p className="text-xs text-white/80 mb-1">إجمالي الفاتورة الآجلة</p>
                <p className="text-3xl font-black">{formatCurrency(total)}</p>
              </div>

              {/* ═══════════════════════════════════════════
                  بيانات العميل - Customer Data
                  ═══════════════════════════════════════════ */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-bold text-gray-700 dark:text-gray-300">بيانات العميل</span>
                </div>

                {/* اسم العميل */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    الاسم بالكامل <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={customer.name}
                      onChange={(e) => setCustomer(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="محمد أحمد محمود"
                      className={`w-full h-11 pr-10 pl-3 rounded-xl bg-gray-50 dark:bg-slate-900 border text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 ${
                        errors.name ? 'border-red-500' : 'border-gray-200 dark:border-slate-700'
                      }`}
                    />
                  </div>
                  {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                </div>

                {/* رقم الهاتف */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    رقم الهاتف <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="tel"
                      value={customer.phone}
                      onChange={(e) => setCustomer(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="01012345678"
                      className={`w-full h-11 pr-10 pl-3 rounded-xl bg-gray-50 dark:bg-slate-900 border text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 ${
                        errors.phone ? 'border-red-500' : 'border-gray-200 dark:border-slate-700'
                      }`}
                    />
                  </div>
                  {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
                </div>

                {/* الرقم القومي */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">الرقم القومي (اختياري)</label>
                  <input
                    type="text"
                    value={customer.nationalId}
                    onChange={(e) => setCustomer(prev => ({ ...prev, nationalId: e.target.value }))}
                    placeholder="29001012345678"
                    maxLength={14}
                    className="w-full h-11 px-3 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  />
                </div>

                {/* العنوان */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">العنوان (اختياري)</label>
                  <div className="relative">
                    <MapPin className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={customer.address}
                      onChange={(e) => setCustomer(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="المنطقة - الشارع - رقم المبنى"
                      className="w-full h-11 pr-10 pl-3 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                    />
                  </div>
                </div>

                {/* ملاحظات */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">ملاحظات (اختياري)</label>
                  <textarea
                    value={customer.notes}
                    onChange={(e) => setCustomer(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="أي ملاحظات عن العميل..."
                    className="w-full h-16 p-3 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 resize-none"
                  />
                </div>
              </div>

              {/* ═══════════════════════════════════════════
                  جدول السداد - Payment Schedule
                  ═══════════════════════════════════════════ */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300">جدول السداد</span>
                  </div>
                  <button
                    onClick={addInstallment}
                    className="flex items-center gap-1 text-xs text-emerald-500 font-bold hover:text-emerald-600"
                  >
                    <Plus className="h-3 w-3" />
                    إضافة دفعة
                  </button>
                </div>

                {/* أزرار سريعة */}
                {installments.length === 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => addQuickInstallment('full')}
                      className="h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100"
                    >
                      دفعة واحدة
                    </button>
                    <button
                      onClick={() => addQuickInstallment('half')}
                      className="h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-100"
                    >
                      دفعتين
                    </button>
                    <button
                      onClick={() => addQuickInstallment('third')}
                      className="h-10 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 text-xs font-bold text-purple-600 dark:text-purple-400 hover:bg-purple-100"
                    >
                      3 دفعات
                    </button>
                  </div>
                )}

                {/* الدفعات */}
                {installments.map((inst, index) => (
                  <div key={index} className="bg-gray-50 dark:bg-slate-900 rounded-xl p-3 border border-gray-200 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-500">الدفعة #{index + 1}</span>
                      {installments.length > 1 && (
                        <button
                          onClick={() => removeInstallment(index)}
                          className="h-6 w-6 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-500 flex items-center justify-center hover:bg-red-200"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] text-gray-400 mb-1">المبلغ (ج.م)</label>
                        <div className="relative">
                          <Wallet className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
                          <input
                            type="number"
                            value={inst.amount || ''}
                            onChange={(e) => updateInstallment(index, 'amount', parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                            className={`w-full h-10 pr-8 pl-2 rounded-lg bg-white dark:bg-slate-800 border text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 ${
                              errors[`inst_amount_${index}`] ? 'border-red-500' : 'border-gray-200 dark:border-slate-700'
                            }`}
                          />
                        </div>
                        {errors[`inst_amount_${index}`] && (
                          <p className="text-[10px] text-red-500 mt-0.5">{errors[`inst_amount_${index}`]}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-[10px] text-gray-400 mb-1">تاريخ السداد</label>
                        <input
                          type="date"
                          value={inst.dueDate}
                          onChange={(e) => updateInstallment(index, 'dueDate', e.target.value)}
                          min={new Date().toISOString().split('T')[0]}
                          className={`w-full h-10 px-2 rounded-lg bg-white dark:bg-slate-800 border text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 ${
                            errors[`inst_date_${index}`] ? 'border-red-500' : 'border-gray-200 dark:border-slate-700'
                          }`}
                        />
                        {errors[`inst_date_${index}`] && (
                          <p className="text-[10px] text-red-500 mt-0.5">{errors[`inst_date_${index}`]}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* خطأ في عدد الدفعات */}
                {errors.installments && (
                  <p className="text-xs text-red-500">{errors.installments}</p>
                )}

                {/* ملخص الدفعات */}
                {installments.length > 0 && (
                  <div className={`rounded-xl p-3 border ${
                    Math.abs(remaining) < 0.01
                      ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                      : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {Math.abs(remaining) < 0.01 ? (
                          <CheckCircle className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-red-600" />
                        )}
                        <span className={`text-xs font-bold ${
                          Math.abs(remaining) < 0.01 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'
                        }`}>
                          {Math.abs(remaining) < 0.01 ? '✓ مكتمل' : 'غير مكتمل'}
                        </span>
                      </div>
                      <div className="text-left">
                        <p className={`text-sm font-bold ${
                          Math.abs(remaining) < 0.01 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                        }`}>
                          {formatCurrency(totalInstallments)} / {formatCurrency(total)}
                        </p>
                        {Math.abs(remaining) > 0.01 && (
                          <p className="text-xs text-red-500">متبقي: {formatCurrency(Math.abs(remaining))}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {errors.total && (
                  <p className="text-xs text-red-500">{errors.total}</p>
                )}
              </div>

              {/* ═══════════════════════════════════════════
                  زر التأكيد
                  ═══════════════════════════════════════════ */}
              <button
                onClick={handleSubmit}
                className="w-full h-14 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-base font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-amber-500/20"
              >
                <FileText className="h-5 w-5" />
                تأكيد البيع الآجل
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
