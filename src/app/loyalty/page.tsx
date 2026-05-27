'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Star, Gift, ArrowRight, Trophy, TrendingUp, Home, Loader2, Sparkles } from 'lucide-react';
import { useBrandingStore } from '@/lib/store/branding-store';
import { useAuthStore } from '@/lib/store/auth-store';
import { formatCurrency } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { Footer } from '@/components/layout/footer';
import Link from 'next/link';
import toast from 'react-hot-toast';

const supabase = createClient();

interface RewardTier {
  points: number;
  reward: string;
  available: boolean;
}

const rewards: RewardTier[] = [
  { points: 50, reward: 'خصم 25 جنيه', available: true },
  { points: 100, reward: 'خصم 50 جنيه', available: true },
  { points: 200, reward: 'خصم 120 جنيه', available: false },
  { points: 500, reward: 'طلب مجاني لحد 200 جنيه', available: false },
];

export default function LoyaltyPage() {
  const router = useRouter();
  const { branding } = useBrandingStore();
  const { user, isAuthenticated } = useAuthStore();
  const primaryColor = branding.primaryColor || '#22C55E';
  const [points, setPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/shop?login=true');
      return;
    }
    loadPoints();
  }, [isAuthenticated]);

  useEffect(() => {
    const ch = supabase.channel('sync-loyalty_transactions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'loyalty_transactions' }, () => {
        loadPoints();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  async function loadPoints() {
    try {
      if (user?.id) {
        const { data: wallet } = await supabase
          .from('customer_wallets')
          .select('loyalty_points, id')
          .eq('user_id', user.id)
          .maybeSingle();
        if (wallet) setPoints(wallet.loyalty_points || 0);
      } else {
        // Try to get from session or local
        const stored = localStorage.getItem('loyalty_points');
        if (stored) setPoints(parseInt(stored, 10));
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }

  async function handleRedeem(reward: RewardTier) {
    if (!user?.id) { toast.error('سجل دخول أولاً لاستبدال النقاط'); router.replace('/shop?login=true'); return; }
    if (points < reward.points) { toast.error('رصيد النقاط غير كافي'); return; }
    if (redeeming) return;

    setRedeeming(true);
    try {
      const { data: wallet } = await supabase
        .from('customer_wallets')
        .select('id, loyalty_points')
        .eq('user_id', user.id)
        .single();

      if (!wallet || wallet.loyalty_points < reward.points) {
        toast.error('رصيد النقاط غير كافي');
        return;
      }

      // Deduct points
      await supabase.from('customer_wallets').update({
        loyalty_points: wallet.loyalty_points - reward.points
      }).eq('id', wallet.id);

      // Create transaction
      await supabase.from('loyalty_transactions').insert({
        wallet_id: wallet.id,
        user_id: user.id,
        points: -reward.points,
        type: 'redemption',
        description: `استبدال ${reward.points} نقطة -> ${reward.reward}`,
        status: 'completed',
      });

      // Create coupon
      const code = `LOY-${Date.now().toString(36).toUpperCase()}`;
      await supabase.from('coupons').insert({
        user_id: user.id,
        code,
        discount: parseFloat(reward.reward.replace(/[^0-9]/g, '')),
        discount_type: 'fixed',
        min_order: reward.points * 2,
        status: 'active',
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });

      setPoints(p => p - reward.points);
      toast.success(`تم استبدال ${reward.reward}! كود الخصم: ${code}`);
    } catch {
      toast.error('حدث خطأ في عملية الاستبدال');
    } finally {
      setRedeeming(false);
    }
  }

  const nextReward = rewards.find(r => !r.available || r.points > points);
  const pointsToNext = nextReward ? nextReward.points - points : 0;
  const totalToNext = nextReward ? nextReward.points : points;
  const progressPct = totalToNext > 0 ? (points / totalToNext) * 100 : 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#020617]" dir="rtl">
      <div className="bg-white dark:bg-slate-950 border-b border-gray-100 dark:border-slate-800">
        <div className="max-w-4xl mx-auto px-4 py-8 md:py-12 text-center">
          <div className="h-14 w-14 md:h-16 md:w-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: `${primaryColor}15` }}>
            <Star className="h-6 w-6 md:h-8 md:w-8" style={{ color: primaryColor }} />
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white mb-2">نقاط الولاء</h1>
          <p className="text-sm md:text-base text-gray-500">اكسب نقاط مع كل طلب واستبدلها بخصومات</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-2">
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs md:text-sm text-emerald-600 hover:text-emerald-700 font-medium">
          <Home className="h-3.5 w-3.5" /> العودة للرئيسية
        </Link>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="bg-gray-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-gray-400 text-sm">رصيد نقاطك</p>
              <p className="text-4xl font-black">{points}</p>
            </div>
            <Trophy className="h-12 w-12 text-yellow-500" />
          </div>
          {nextReward && pointsToNext > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-gray-400">
                <span>المرحلة التالية</span>
                <span>{pointsToNext} نقطة متبقية</span>
              </div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, progressPct)}%` }} />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-900 mb-4">طرق كسب النقاط</h3>
          <div className="space-y-4">
            {[
              { icon: <TrendingUp />, title: 'كل 10 جنيه = 1 نقطة', desc: 'اكسب نقطة مع كل 10 جنيه تنفقهم' },
              { icon: <Star />, title: 'بونص التقييم', desc: 'اكسب 5 نقاط إضافية لما تقيم طلبك' },
              { icon: <Gift />, title: 'بونص الإحالة', desc: 'اكسب 50 نقطة لكل صاحب تدعيه' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                  {item.icon}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">{item.title}</h4>
                  <p className="text-xs text-gray-500">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
              <Gift className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">استبدل نقاطك</h2>
              <p className="text-xs text-gray-500">اختر المكافأة المناسبة لرصيدك</p>
            </div>
          </div>

          <div className="space-y-3">
            {rewards.map((r, i) => {
              const canAfford = points >= r.points;
              return (
                <div key={i}
                  className={`flex items-center justify-between p-3 md:p-4 rounded-xl border transition-all ${
                    canAfford ? 'border-emerald-200 bg-emerald-50/50' : 'border-gray-100 opacity-60'
                  }`}>
                  <div className="flex items-center gap-2.5 md:gap-3">
                    <div className={`h-9 w-9 md:h-10 md:w-10 rounded-xl flex items-center justify-center ${canAfford ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                      <Gift className={`h-4 w-4 md:h-5 md:w-5 ${canAfford ? 'text-emerald-500' : 'text-gray-400'}`} />
                    </div>
                    <div>
                      <h4 className="text-xs md:text-sm font-bold text-gray-900">{r.reward}</h4>
                      <p className="text-[10px] md:text-xs text-gray-500">{r.points} نقطة</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRedeem(r)}
                    disabled={!canAfford || redeeming}
                    className={`h-8 md:h-9 px-3 md:px-4 rounded-lg text-[10px] md:text-xs font-bold transition-all ${
                      canAfford
                        ? 'text-white shadow-md hover:shadow-lg'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                    style={canAfford ? { backgroundColor: primaryColor } : {}}
                  >
                    {redeeming ? 'جاري...' : canAfford ? 'استبدال' : `${r.points} نقطة`}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="text-center">
          <button onClick={() => router.push('/shop')}
            className="h-10 md:h-12 px-6 md:px-8 rounded-xl text-white font-bold text-xs md:text-sm flex items-center gap-2 mx-auto shadow-lg hover:shadow-xl transition-all"
            style={{ backgroundColor: primaryColor }}>
            <ArrowRight className="h-3.5 w-3.5 md:h-4 md:w-4" /> تسوق واكسب نقاط
          </button>
        </div>
      </div>
      <Footer />
    </div>
  );
}
