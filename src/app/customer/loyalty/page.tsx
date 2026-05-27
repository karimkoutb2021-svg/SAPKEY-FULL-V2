'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store/auth-store';
import { useRouter } from 'next/navigation';
import { customerWalletService, type CustomerWallet, type Coupon } from '@/lib/customer-services/customer-wallet';
import Link from 'next/link';
import toast from 'react-hot-toast';

const supabase = createClient();

export default function LoyaltyPage() {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();
  
  const [wallet, setWallet] = useState<CustomerWallet | null>(null);
  const [coupons, setCoupons] = useState<Coupon[]>([]);

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

  async function loadData() {
    if (!user?.id) return;
    const w = await customerWalletService.getWallet(user.id);
    setWallet(w);
    if (w) {
      const cps = await customerWalletService.getCoupons(user.id);
      setCoupons(cps);
    }
  }

  const pointsValue = wallet ? Math.floor(wallet.loyalty_points / 100) * 10 : 0;

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-xl font-bold">نقاط الولاء ⭐</h1>
        <Link href="/customer" className="text-xs text-white/50 hover:text-white">رجوع</Link>
      </div>

      <div className="space-y-3">
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6 text-center">
          <span className="text-4xl block mb-2">⭐</span>
          <p className="text-4xl font-bold text-amber-400">{wallet?.loyalty_points || 0}</p>
          <p className="text-sm text-white/50 mt-1">نقطة ولاء</p>
          <p className="text-xs text-white/30 mt-2">تساوي {pointsValue} ج.م كوبون خصم</p>
          
          {pointsValue > 0 && (
            <button onClick={async () => {
              if (!wallet) return;
              const result = await customerWalletService.redeemPoints(wallet.id, Math.floor(wallet.loyalty_points / 100) * 100);
              setWallet(result.wallet);
              toast.success(`تم استبدال النقاط بكوبون خصم بقيمة ${result.coupon.discount_value} ج.م`);
              loadData();
            }} className="mt-4 px-6 py-2.5 rounded-xl bg-amber-500/20 text-amber-400 text-sm hover:bg-amber-500/30 transition-colors font-bold">
              استبدال الآن
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2 mt-6">
        <h2 className="text-sm font-bold text-white/70 mb-3 px-1">الكوبونات الخاصة بك</h2>
        {coupons.length === 0 ? (
          <p className="text-center text-white/30 py-8">لا توجد كوبونات متاحة</p>
        ) : (
          coupons.map(c => (
            <div key={c.id} className="bg-gradient-to-r from-violet-900/30 to-purple-900/30 border border-violet-500/20 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-bold text-violet-400 font-mono">{c.code}</p>
                  <p className="text-xs text-white/50 mt-0.5">
                    خصم {c.discount_type === 'percentage' ? `${c.discount_value}%` : `${c.discount_value} ج.م`}
                    {c.min_order > 0 ? ` | الحد الأدنى: ${c.min_order} ج.م` : ''}
                  </p>
                </div>
                <span className="text-2xl">🎫</span>
              </div>
              <p className="text-[10px] text-white/30 mt-2">ينتهي في: {new Date(c.expires_at).toLocaleDateString('ar-EG')}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
