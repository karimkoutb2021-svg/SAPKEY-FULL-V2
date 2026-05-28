'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CreditCard, Smartphone, CheckCircle2, Building2, Landmark, CreditCard as CardIcon, Wallet, ArrowRightLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PaymentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (details: { customerName: string; customerPhone: string; provider: string; reference: string }) => void;
  method: 'card' | 'wallet';
  total: number;
}


const WALLET_PROVIDERS = [
  { id: 'vodafone', name: 'فودافون كاش', color: 'from-red-500 to-red-600', icon: Smartphone },
  { id: 'orange', name: 'أورانج كاش', color: 'from-orange-500 to-orange-600', icon: Smartphone },
  { id: 'etisalat', name: 'اتصالات كاش', color: 'from-emerald-500 to-emerald-600', icon: Smartphone },
  { id: 'we', name: 'وي باي', color: 'from-purple-600 to-purple-700', icon: Smartphone },
  { id: 'instapay', name: 'إنستاباي', color: 'from-indigo-600 to-indigo-700', icon: ArrowRightLeft },
  { id: 'other', name: 'أخرى', color: 'from-gray-500 to-gray-600', icon: Wallet },
];

const CARD_PROVIDERS = [
  { id: 'nbe', name: 'البنك الأهلي المصري', color: 'from-green-600 to-green-800', icon: Landmark },
  { id: 'banque_misr', name: 'بنك مصر', color: 'from-red-600 to-red-800', icon: Landmark },
  { id: 'cib', name: 'CIB البنك التجاري', color: 'from-blue-600 to-blue-800', icon: Landmark },
  { id: 'qnb', name: 'QNB بنك قطر الوطني', color: 'from-blue-800 to-blue-950', icon: Landmark },
  { id: 'alex', name: 'بنك الإسكندرية', color: 'from-cyan-600 to-cyan-800', icon: Landmark },
  { id: 'other', name: 'أخرى', color: 'from-gray-500 to-gray-600', icon: CardIcon },
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
          className="bg-white dark:bg-[#0f172a] rounded-3xl w-full max-w-md shadow-2xl flex flex-col border border-gray-100 dark:border-slate-800 max-h-[90vh] overflow-hidden"
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

          <div className="p-6 overflow-y-auto flex-1 min-h-0 custom-scrollbar">
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
                    {providers.map((p: any) => {
                      const Icon = p.icon;
                      return (
                        <button
                          key={p.id}
                          onClick={() => setProvider(p.name)}
                          className={`p-3 rounded-2xl border-2 text-right transition-all duration-300 flex items-center gap-3 relative overflow-hidden group ${
                            provider === p.name
                              ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/20 shadow-sm'
                              : 'border-transparent bg-gray-50 dark:bg-slate-800/50 hover:bg-gray-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <div className={`h-10 w-10 shrink-0 rounded-xl flex items-center justify-center text-white bg-gradient-to-br shadow-sm ${p.color}`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className={`block text-xs font-semibold whitespace-normal ${provider === p.name ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-700 dark:text-gray-300'}`}>
                              {p.name}
                            </span>
                          </div>
                          {provider === p.name && (
                            <motion.div layoutId="check-icon" className="absolute top-2 left-2 bg-emerald-500 text-white rounded-full p-0.5 shadow-sm">
                              <CheckCircle2 className="h-3 w-3" />
                            </motion.div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
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
                    className="w-full h-12 px-4 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="مثال: 123456789"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300">رقم هاتف العميل (للتأكيد)</label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="01XXXXXXXXX"
                    dir="ltr"
                  />
                </div>
              </motion.div>
            )}
          </div>
          
          {/* Fixed Footer for Buttons */}
          <div className="p-6 pt-4 border-t border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 rounded-b-3xl">
            {step === 1 ? (
              <Button
                className={`w-full h-12 rounded-xl text-base font-bold transition-all ${
                  provider 
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg' 
                    : 'bg-gray-200 dark:bg-slate-800 text-gray-500 cursor-not-allowed opacity-100'
                }`}
                disabled={!provider}
                onClick={() => setStep(2)}
              >
                التالي
              </Button>
            ) : (
              <div className="flex gap-3">
                <Button variant="outline" className="h-12 rounded-xl flex-1 font-bold text-gray-700 dark:text-gray-300" onClick={() => setStep(1)}>
                  رجوع
                </Button>
                <Button className="h-12 rounded-xl flex-1 font-bold bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleConfirm}>
                  تأكيد الدفع
                </Button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
