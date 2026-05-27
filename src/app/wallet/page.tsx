'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Wallet, Plus, Minus, Star, Gift, Clock, ArrowUpRight, ArrowDownLeft, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useAuthStore } from '@/lib/store/auth-store';
import { createClient } from '@/lib/supabase/client';
import { walletService, type CustomerWallet, type WalletTransaction } from '@/lib/supabase/services/wallets';
import toast from 'react-hot-toast';

const supabase = createClient();

export default function WalletPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [wallet, setWallet] = useState<CustomerWallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeposit, setShowDeposit] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/shop?login=true');
      return;
    }
    if (user?.id) {
      loadWallet();
      const channel = supabase.channel('wallet-sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'customer_wallets' }, () => loadWallet())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'wallet_transactions' }, () => loadWallet())
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [user, isAuthenticated]);

  async function loadWallet() {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [w, t] = await Promise.allSettled([
        walletService.getWallet(user.id),
        walletService.getTransactions(user.id),
      ]);
      if (w.status === 'fulfilled') setWallet(w.value);
      if (t.status === 'fulfilled') setTransactions(t.value.data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  async function handleDeposit() {
    if (!user?.id || !depositAmount || parseFloat(depositAmount) <= 0) {
      toast.error('أدخل مبلغ صحيح');
      return;
    }
    try {
      await walletService.deposit(user.id, parseFloat(depositAmount), 'إيداع يدوي');
      toast.success('تم الإيداع بنجاح');
      setDepositAmount('');
      setShowDeposit(false);
      loadWallet();
    } catch (e: any) {
      toast.error(e.message || 'فشل الإيداع');
    }
  }

  async function handleRedeemPoints() {
    if (!user?.id || !wallet) return;
    if (wallet.loyalty_points < 100) {
      toast.error('تحتاج 100 نقطة على الأقل للاستبدال');
      return;
    }
    try {
      const { discountAmount } = await walletService.redeemLoyaltyPoints(user.id, 100);
      toast.success(`تم استبدال 100 نقطة بخصم ${formatCurrency(discountAmount)}`);
      loadWallet();
    } catch (e: any) {
      toast.error(e.message || 'فشل الاستبدال');
    }
  }

  const typeIcons: Record<string, any> = {
    deposit: ArrowDownLeft,
    withdrawal: ArrowUpRight,
    purchase: ArrowUpRight,
    refund: ArrowDownLeft,
    loyalty_earned: Star,
    loyalty_redeemed: Gift,
  };

  const typeColors: Record<string, string> = {
    deposit: 'text-green-500 bg-green-50 dark:bg-green-900/20',
    withdrawal: 'text-red-500 bg-red-50 dark:bg-red-900/20',
    purchase: 'text-red-500 bg-red-50 dark:bg-red-900/20',
    refund: 'text-green-500 bg-green-50 dark:bg-green-900/20',
    loyalty_earned: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20',
    loyalty_redeemed: 'text-purple-500 bg-purple-50 dark:bg-purple-900/20',
  };

  const typeLabels: Record<string, string> = {
    deposit: 'إيداع',
    withdrawal: 'سحب',
    purchase: 'شراء',
    refund: 'استرداد',
    loyalty_earned: 'نقاط ولاء',
    loyalty_redeemed: 'استبدال نقاط',
  };

  if (!isAuthenticated || loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#020617] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#020617] pb-20" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border-b border-gray-100 dark:border-slate-800">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <button onClick={() => router.back()} className="h-9 w-9 rounded-xl flex items-center justify-center hover:bg-gray-100 dark:hover:bg-slate-800">
            <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-300" />
          </button>
          <h1 className="text-base font-bold text-gray-900 dark:text-white">المحفظة</h1>
          <div className="w-9" />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-4 space-y-4">
        {/* Balance Card */}
        <div
          className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl p-6 text-white shadow-lg"
        >
          <div className="flex items-center gap-2 mb-3">
            <Wallet className="h-5 w-5" />
            <span className="text-sm font-medium text-emerald-100">الرصيد المتاح</span>
          </div>
          <p className="text-3xl font-black mb-4">{formatCurrency(wallet?.balance || 0)}</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-300" />
              <span className="text-sm">{wallet?.loyalty_points || 0} نقطة ولاء</span>
            </div>
            <button
              onClick={() => setShowDeposit(true)}
              className="h-9 px-4 rounded-xl bg-white/20 backdrop-blur-sm text-sm font-bold flex items-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" /> إيداع
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setShowDeposit(true)}
            className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-gray-100 dark:border-slate-800 flex flex-col items-center gap-2 hover:shadow-md transition-all"
          >
            <div className="h-10 w-10 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
              <Plus className="h-5 w-5 text-green-500" />
            </div>
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">إيداع رصيد</span>
          </button>
          <button
            onClick={handleRedeemPoints}
            className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-gray-100 dark:border-slate-800 flex flex-col items-center gap-2 hover:shadow-md transition-all"
          >
            <div className="h-10 w-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
              <Gift className="h-5 w-5 text-amber-500" />
            </div>
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">استبدال النقاط</span>
          </button>
        </div>

        {/* Deposit Modal */}
        {showDeposit && (
          <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-gray-100 dark:border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">إيداع رصيد</h3>
            <input
              type="number"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              placeholder="المبلغ"
              className="w-full h-11 px-3 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeposit(false)}
                className="flex-1 h-10 rounded-xl border border-gray-200 dark:border-slate-700 text-sm font-bold text-gray-500"
              >
                إلغاء
              </button>
              <button
                onClick={handleDeposit}
                className="flex-1 h-10 rounded-xl bg-emerald-500 text-white text-sm font-bold"
              >
                تأكيد
              </button>
            </div>
          </div>
        )}

        {/* Transactions */}
        <div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-400" />
            سجل المعاملات
          </h3>
          <div className="space-y-2">
            {transactions.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">لا توجد معاملات بعد</div>
            ) : (
              transactions.map(tx => {
                const Icon = typeIcons[tx.type] || Clock;
                const colorClass = typeColors[tx.type] || 'text-gray-500 bg-gray-50';
                const label = typeLabels[tx.type] || tx.type;
                return (
                  <div
                    key={tx.id}
                    className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-gray-100 dark:border-slate-800 flex items-center gap-3"
                  >
                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${colorClass}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{label}</p>
                      <p className="text-[10px] text-gray-400">
                        {new Date(tx.created_at).toLocaleDateString('ar-EG')}
                      </p>
                    </div>
                    <span className={`text-sm font-bold ${tx.amount > 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {tx.amount > 0 ? '+' : ''}{formatCurrency(Math.abs(tx.amount))}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
