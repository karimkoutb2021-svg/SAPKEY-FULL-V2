'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CreditCard, Smartphone, Wallet } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';

interface SplitPaymentProps {
  isOpen: boolean;
  onClose: () => void;
  total: number;
  onComplete: (cash: number, card: number, network: number, wallet: number) => void;
}

export function SplitPaymentModal({ isOpen, onClose, total, onComplete }: SplitPaymentProps) {
  const [cash, setCash] = useState('');
  const [card, setCard] = useState('');
  const [network, setNetwork] = useState('');
  const [wallet, setWallet] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardPhone, setCardPhone] = useState('');
  const [networkName, setNetworkName] = useState('');
  const [networkPhone, setNetworkPhone] = useState('');
  const [walletName, setWalletName] = useState('');
  const [walletPhone, setWalletPhone] = useState('');

  const cashAmount = parseFloat(cash) || 0;
  const cardAmount = parseFloat(card) || 0;
  const networkAmount = parseFloat(network) || 0;
  const walletAmount = parseFloat(wallet) || 0;
  const paidTotal = cashAmount + cardAmount + networkAmount + walletAmount;
  const remaining = total - paidTotal;
  const isComplete = Math.abs(remaining) < 0.01 && paidTotal > 0;

  function handleComplete() {
    if (!isComplete) {
      toast.error('المبلغ المدفوع لا يساوي الإجمالي');
      return;
    }
    onComplete(cashAmount, cardAmount, networkAmount, walletAmount);
    setCash('');
    setCard('');
    setNetwork('');
    setWallet('');
  }

  function setRemainingTo(type: string) {
    const current = (type === 'cash' ? cashAmount : type === 'card' ? cardAmount : type === 'network' ? networkAmount : walletAmount);
    const others = paidTotal - current;
    const needed = Math.max(0, total - others);
    if (type === 'cash') setCash(needed.toFixed(2));
    else if (type === 'card') setCard(needed.toFixed(2));
    else if (type === 'network') setNetwork(needed.toFixed(2));
    else setWallet(needed.toFixed(2));
  }

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
            className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-950 rounded-t-3xl shadow-2xl max-h-[85vh] overflow-y-auto max-w-lg mx-auto"
            dir="rtl"
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-12 rounded-full bg-gray-300 dark:bg-slate-600" />
            </div>
            <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-gray-900 dark:text-white">الدفع المتعدد</h3>
                <p className="text-xs text-gray-400">قسّم الفاتورة على أكثر من طريقة</p>
              </div>
              <button onClick={onClose} className="h-9 w-9 rounded-xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center">
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Total Display */}
              <div className="bg-gray-50 dark:bg-slate-900 rounded-xl p-4 text-center">
                <p className="text-xs text-gray-400 mb-1">إجمالي الفاتورة</p>
                <p className="text-2xl font-black text-emerald-600">{formatCurrency(total)}</p>
                <p className={`text-xs mt-1 ${remaining > 0.01 ? 'text-red-500' : remaining < -0.01 ? 'text-amber-500' : 'text-emerald-500'}`}>
                  {remaining > 0.01 ? `متبقي: ${formatCurrency(remaining)}` : remaining < -0.01 ? `زائد: ${formatCurrency(Math.abs(remaining))}` : '✓ مكتمل'}
                </p>
              </div>

              {/* Cash */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300">كاش</span>
                  </div>
                  <button onClick={() => setRemainingTo('cash')} className="text-[10px] text-emerald-500 font-medium">
                    المتبقي
                  </button>
                </div>
                <input
                  type="number"
                  value={cash}
                  onChange={(e) => setCash(e.target.value)}
                  placeholder="0.00"
                  className="w-full h-11 px-3 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>

              {/* Card */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300">فيزا / بطاقة</span>
                  </div>
                  <button onClick={() => setRemainingTo('card')} className="text-[10px] text-emerald-500 font-medium">
                    المتبقي
                  </button>
                </div>
                <input type="number" value={card} onChange={(e) => setCard(e.target.value)} placeholder="0.00"
                  className="w-full h-11 px-3 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
                {cardAmount > 0 && (
                  <div className="space-y-1.5 mt-1.5">
                    <input type="text" value={cardName} onChange={(e) => setCardName(e.target.value)} placeholder="صاحب البطاقة"
                      className="w-full h-10 px-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                    <input type="tel" value={cardPhone} onChange={(e) => setCardPhone(e.target.value)} placeholder="رقم التليفون"
                      className="w-full h-10 px-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                  </div>
                )}
              </div>

              {/* Network / InstaPay */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-purple-500" />
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300">شبكة / إنستاباي</span>
                  </div>
                  <button onClick={() => setRemainingTo('network')} className="text-[10px] text-emerald-500 font-medium">
                    المتبقي
                  </button>
                </div>
                <input type="number" value={network} onChange={(e) => setNetwork(e.target.value)} placeholder="0.00"
                  className="w-full h-11 px-3 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
                {networkAmount > 0 && (
                  <div className="space-y-1.5 mt-1.5">
                    <input type="text" value={networkName} onChange={(e) => setNetworkName(e.target.value)} placeholder="صاحب المحفظة"
                      className="w-full h-10 px-3 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-300 dark:border-purple-700 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30" />
                    <input type="tel" value={networkPhone} onChange={(e) => setNetworkPhone(e.target.value)} placeholder="رقم المحفظة / التليفون"
                      className="w-full h-10 px-3 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-300 dark:border-purple-700 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30" />
                  </div>
                )}
              </div>

              {/* Wallet */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-amber-500" />
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300">محفظة العميل</span>
                  </div>
                  <button onClick={() => setRemainingTo('wallet')} className="text-[10px] text-emerald-500 font-medium">
                    المتبقي
                  </button>
                </div>
                <input type="number" value={wallet} onChange={(e) => setWallet(e.target.value)} placeholder="0.00"
                  className="w-full h-11 px-3 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
                {walletAmount > 0 && (
                  <div className="space-y-1.5 mt-1.5">
                    <input type="text" value={walletName} onChange={(e) => setWalletName(e.target.value)} placeholder="صاحب المحفظة"
                      className="w-full h-10 px-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30" />
                    <input type="tel" value={walletPhone} onChange={(e) => setWalletPhone(e.target.value)} placeholder="رقم المحفظة / التليفون"
                      className="w-full h-10 px-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30" />
                  </div>
                )}
              </div>

              {/* Complete Button */}
              <button
                onClick={handleComplete}
                disabled={!isComplete}
                className="w-full h-12 rounded-xl bg-emerald-500 text-white text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                تأكيد الدفع
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
