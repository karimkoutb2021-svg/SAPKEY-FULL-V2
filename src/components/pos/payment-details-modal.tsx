'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CreditCard, Smartphone, CheckCircle2, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PaymentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (details: { customerName: string; customerPhone: string; provider: string; reference: string }) => void;
  method: 'card' | 'wallet';
  total: number;
}

const WALLET_PROVIDERS = [
  { id: 'vodafone', name: 'فودافون كاش', color: 'bg-red-500', logo: 'V' },
  { id: 'orange', name: 'أورانج كاش', color: 'bg-orange-500', logo: 'O' },
  { id: 'etisalat', name: 'اتصالات كاش', color: 'bg-emerald-500', logo: 'E' },
  { id: 'we', name: 'وي باي', color: 'bg-purple-600', logo: 'W' },
  { id: 'instapay', name: 'إنستاباي', color: 'bg-indigo-600', logo: 'I' },
  { id: 'other', name: 'أخرى', color: 'bg-gray-500', logo: '?' },
];

const CARD_PROVIDERS = [
  { id: 'nbe', name: 'البنك الأهلي المصري', color: 'bg-green-700' },
  { id: 'banque_misr', name: 'بنك مصر', color: 'bg-red-700' },
  { id: 'cib', name: 'CIB البنك التجاري', color: 'bg-blue-700' },
  { id: 'qnb', name: 'QNB بنك قطر الوطني', color: 'bg-blue-900' },
  { id: 'alex', name: 'بنك الإسكندرية', color: 'bg-cyan-700' },
  { id: 'other', name: 'أخرى', color: 'bg-gray-500' },
];

export function PaymentDetailsModal({ isOpen, onClose, onConfirm, method, total }: PaymentDetailsModalProps) {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [provider, setProvider] = useState('');
  const [reference, setReference] = useState('');
  const [step, setStep] = useState(1);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm({ customerName, customerPhone, provider, reference });
    // Reset state for next time
    setCustomerName('');
    setCustomerPhone('');
    setProvider('');
    setReference('');
    setStep(1);
  };

  const providers = method === 'wallet' ? WALLET_PROVIDERS : CARD_PROVIDERS;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose} dir="rtl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-[#0f172a] rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-gray-100 dark:border-slate-800"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-gray-50/50 dark:bg-slate-900/50">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-2xl flex items-center justify-center ${method === 'card' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                {method === 'card' ? <CreditCard className="h-5 w-5" /> : <Smartphone className="h-5 w-5" />}
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  {method === 'card' ? 'الدفع بالبطاقة البنكية' : 'الدفع بالمحفظة الإلكترونية'}
                </h3>
                <p className="text-xs text-gray-500">استكمال بيانات الدفع</p>
              </div>
            </div>
            <button onClick={onClose} className="h-8 w-8 rounded-full bg-gray-200 dark:bg-slate-800 flex items-center justify-center text-gray-500 hover:bg-gray-300 dark:hover:bg-slate-700 transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Amount Banner */}
            <div className="mb-6 rounded-2xl bg-gray-50 dark:bg-slate-800/50 p-4 flex items-center justify-between border border-gray-100 dark:border-slate-700">
              <span className="text-sm font-medium text-gray-500">المبلغ المطلوب</span>
              <span className="text-2xl font-black text-gray-900 dark:text-white">{total.toLocaleString()} ج.م</span>
            </div>

            {step === 1 && (
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                <div className="space-y-3">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300">اختر {method === 'card' ? 'نوع البطاقة' : 'المحفظة'}</label>
                  <div className="grid grid-cols-2 gap-3">
                    {providers.map((p: any) => (
                      <button
                        key={p.id}
                        onClick={() => setProvider(p.name)}
                        className={`p-3 rounded-xl border-2 text-right transition-all flex items-center gap-3 ${
                          provider === p.name
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 shadow-sm'
                            : 'border-gray-100 dark:border-slate-800 hover:border-gray-200 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                        }`}
                      >
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${p.color}`}>
                          {p.logo || <Building2 className="h-4 w-4" />}
                        </div>
                        <span className={`text-sm font-bold ${provider === p.name ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-700 dark:text-gray-300'}`}>
                          {p.name}
                        </span>
                        {provider === p.name && <CheckCircle2 className="h-4 w-4 mr-auto text-emerald-500" />}
                      </button>
                    ))}
                  </div>
                </div>

                <Button
                  className="w-full h-12 rounded-xl text-base font-bold mt-4"
                  disabled={!provider}
                  onClick={() => setStep(2)}
                >
                  التالي
                </Button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300">رقم المرجع / العملية (اختياري)</label>
                  <input
                    type="text"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="مثال: 123456789"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300">رقم هاتف العميل (للتأكيد)</label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="01XXXXXXXXX"
                    dir="ltr"
                  />
                </div>

                <div className="flex gap-3 mt-6">
                  <Button variant="outline" className="h-12 rounded-xl flex-1 font-bold" onClick={() => setStep(1)}>
                    رجوع
                  </Button>
                  <Button className="h-12 rounded-xl flex-1 font-bold bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleConfirm}>
                    تأكيد الدفع
                  </Button>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
