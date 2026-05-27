'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store/auth-store';
import { useRouter, useSearchParams } from 'next/navigation';
import { customerWalletService, type CustomerWallet, type WalletTransaction, type Coupon } from '@/lib/customer-services/customer-wallet';
import Link from 'next/link';
import toast from 'react-hot-toast';

const supabase = createClient();

export default function WalletPage() {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as 'wallet' | 'points' | 'coupons') || 'wallet';
  
  const [wallet, setWallet] = useState<CustomerWallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [activeTab, setActiveTab] = useState<'wallet' | 'points' | 'coupons'>(initialTab);
  const [showRecharge, setShowRecharge] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState(100);
  const [rechargeCode, setRechargeCode] = useState('');

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!isAuthenticated) {
      router.replace('/shop?login=true');
      return;
    }
    loadData();
  }, [isAuthenticated, router]);

  if (!mounted || !isAuthenticated) {
    return <div className="h-dvh flex items-center justify-center"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  useEffect(() => {
    const ch = supabase.channel('sync-wallet_transactions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wallet_transactions' }, () => {
        loadData();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  async function loadData() {
    if (!user?.id) return;
    const w = await customerWalletService.getWallet(user.id);
    setWallet(w);
    if (w) {
      const [txns, cps] = await Promise.all([
        customerWalletService.getTransactions(w.id),
        customerWalletService.getCoupons(user.id),
      ]);
      setTransactions(txns);
      setCoupons(cps);
    }
  }

  async function handleRecharge() {
    if (!wallet) return;
    if (rechargeCode) {
      // Transfer code recharge
      const { data: existing } = await supabase.from('wallet_transactions').select('*').eq('reference', rechargeCode).limit(1);
      if (existing && existing.length > 0) {
        toast.error('كود الشحن مستخدم من قبل');
        return;
      }
    }
    const method = rechargeCode ? 'transfer_code' : 'cashier';
    const updated = await customerWalletService.recharge(wallet.id, rechargeAmount, method, rechargeCode || undefined);
    setWallet(updated);
    toast.success(`تم شحن ${rechargeAmount} ج.م بنجاح`);
    setShowRecharge(false);
    setRechargeCode('');
    loadData();
  }

  const pointsValue = wallet ? Math.floor(wallet.loyalty_points / 100) * 10 : 0;

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-xl font-bold">المحفظة 💰</h1>
        <Link href="/customer" className="text-xs text-white/50 hover:text-white">رجوع</Link>
      </div>

      {/* Balance Card */}
      <div className="bg-gradient-to-br from-emerald-900/40 to-teal-900/40 border border-emerald-500/20 rounded-2xl p-5">
        <p className="text-xs text-emerald-300/70 mb-1">الرصيد الحالي</p>
        <p className="text-4xl font-bold text-emerald-400">{wallet?.balance?.toLocaleString('ar-EG') || 0} <span className="text-base text-emerald-400/50">ج.م</span></p>
        <div className="flex gap-3 mt-4">
          <button onClick={() => setShowRecharge(true)} className="flex-1 py-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 text-sm hover:bg-emerald-500/30 transition-colors">شحن</button>
          <Link href="/customer/catalog" className="flex-1 py-2.5 rounded-xl bg-white/[0.06] text-white/70 text-sm text-center hover:bg-white/[0.1] transition-colors">تسوق</Link>
        </div>
      </div>

      <div className="space-y-2 mt-4">
        <h2 className="text-sm font-bold text-white/70 mb-3 px-1">حركات المحفظة</h2>
        {transactions.length === 0 ? (
          <p className="text-center text-white/30 py-8">لا توجد حركات</p>
        ) : (
          transactions.map(tx => (
            <div key={tx.id} className="flex items-center justify-between bg-white/[0.03] border border-white/[0.06] rounded-xl p-3">
              <div className="flex items-center gap-3">
                <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm ${
                  tx.type === 'recharge' ? 'bg-emerald-500/10' : tx.type === 'payment' ? 'bg-red-500/10' : 'bg-amber-500/10'
                }`}>
                  {tx.type === 'recharge' ? '💰' : tx.type === 'payment' ? '💳' : '🔄'}
                </span>
                <div>
                  <p className="text-sm">{tx.type === 'recharge' ? 'شحن' : tx.type === 'payment' ? 'دفع' : tx.type}</p>
                  <p className="text-[10px] text-white/40">{new Date(tx.created_at).toLocaleDateString('ar-EG')}</p>
                </div>
              </div>
              <span className={`text-sm font-bold ${tx.amount > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString('ar-EG')} ج.م
              </span>
            </div>
          ))
        )}
      </div>

      {/* Recharge Modal */}
      {showRecharge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#111114] border border-white/[0.08] p-6 space-y-4">
            <h3 className="text-lg font-semibold text-white">شحن المحفظة</h3>

            <div className="grid grid-cols-3 gap-2">
              {[50, 100, 200, 500, 1000, 2000].map(amount => (
                <button key={amount} onClick={() => setRechargeAmount(amount)}
                  className={`py-2 rounded-xl text-sm transition-colors ${
                    rechargeAmount === amount ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-white/[0.04] text-white/60 hover:bg-white/[0.08]'
                  }`}>{amount}</button>
              ))}
            </div>

            <div>
              <label className="text-xs text-white/50 mb-1 block">أو كود تحويل</label>
              <input type="text" value={rechargeCode} onChange={e => setRechargeCode(e.target.value)}
                placeholder="أدخل كود الشحن"
                className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white focus:outline-none focus:border-emerald-500/50" />
            </div>

            <div className="flex gap-2">
              <button onClick={() => setShowRecharge(false)} className="flex-1 py-2.5 rounded-xl bg-white/[0.06] text-white text-sm hover:bg-white/[0.1]">إلغاء</button>
              <button onClick={handleRecharge} className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-white text-sm hover:bg-emerald-600 font-medium">
                شحن {rechargeAmount} ج.م
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


