'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
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
  const { user } = useAuthStore();
  const primaryColor = branding.primaryColor || '#22C55E';
  const [points, setPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState(false);

  useEffect(() => {
    loadPoints();
  }, []);

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
    if (!user?.id) { toast.error('سجل دخول أولاً لاستبدال النقاط'); router.push('/login'); return; }
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
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="h-14 w-14 md:h-16 md:w-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: `${primaryColor}15` }}>
            <Star className="h-6 w-6 md:h-8 md:w-8" style={{ color: primaryColor }} />
          </motion.div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white mb-2">نقاط الولاء</h1>
          <p className="text-sm md:text-base text-gray-500">اكسب نقاط مع كل طلب واستبدلها بخصومات</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-2">
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs md:text-sm text-emerald-600 hover:text-emerald-700 font-medium">
          <Home className="h-3.5 w-3.5" /> العودة للرئيسية
        </Link>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 md:py-8 space-y-4 md:space-y-6">
        {/* Points Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-5 md:p-6 text-white">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-white/60" />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-emerald-100 text-xs md:text-sm">رصيد نقاطك</p>
                  <motion.p key={points} initial={{ scale: 1.3 }} animate={{ scale: 1 }}
                    className="text-3xl md:text-4xl font-black">{points}</motion.p>
                  <p className="text-emerald-100 text-[10px] md:text-xs">نقطة</p>
                </div>
                <Trophy className="h-14 w-14 md:h-16 md:w-16 text-emerald-200/30" />
              </div>
              {nextReward && pointsToNext > 0 && (
                <div className="bg-white/20 rounded-xl p-2.5 md:p-3">
                  <div className="flex items-center justify-between text-[10px] md:text-sm mb-1.5">
                    <span>المرحلة التالية: {nextReward.reward}</span>
                    <span className="font-bold">{pointsToNext} نقطة متبقية</span>
                  </div>
                  <div className="h-2 bg-white/30 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, progressPct)}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                      className="h-full bg-white rounded-full"
                    />
                  </div>
                </div>
              )}
              {pointsToNext <= 0 && (
                <div className="bg-white/20 rounded-xl p-2.5 md:p-3 text-center">
                  <Sparkles className="h-5 w-5 inline-block mb-1" />
                  <p className="text-sm font-bold">أحسنت! يمكنك استبدال نقاطك الآن</p>
                </div>
              )}
              {!user?.id && (
                <div className="mt-3 text-center">
                  <p className="text-[10px] text-emerald-100">سجل دخول لرؤية رصيد نقاطك الحقيقي</p>
                </div>
              )}
            </>
          )}
        </motion.div>

        {/* How it works */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 md:p-6">
          <h3 className="text-sm md:text-base font-bold text-gray-900 dark:text-white mb-3 md:mb-4">إزاي تكسب نقاط؟</h3>
          <div className="space-y-3 md:space-y-4">
            {[
              { icon: <TrendingUp className="h-4 w-4 md:h-5 md:w-5" />, title: 'كل 10 جنيه = 1 نقطة', desc: 'اكسب نقطة مع كل 10 جنيه تنفقهم' },
              { icon: <Star className="h-4 w-4 md:h-5 md:w-5" />, title: 'بونص التقييم', desc: 'اكسب 5 نقاط إضافية لما تقيم طلبك' },
              { icon: <Gift className="h-4 w-4 md:h-5 md:w-5" />, title: 'بونص الإحالة', desc: 'اكسب 50 نقطة لكل صاحب تدعيه' },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2.5 md:gap-3">
                <div className="h-9 w-9 md:h-10 md:w-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${primaryColor}15` }}>
                  <span className="text-primary" style={{ color: primaryColor }}>{item.icon}</span>
                </div>
                <div>
                  <h4 className="text-xs md:text-sm font-bold text-gray-900 dark:text-white">{item.title}</h4>
                  <p className="text-[10px] md:text-xs text-gray-500">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Rewards */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 md:p-6">
          <h3 className="text-sm md:text-base font-bold text-gray-900 dark:text-white mb-3 md:mb-4">استبدل نقاطك</h3>
          <div className="space-y-2.5 md:space-y-3">
            {rewards.map((item, i) => {
              const canAfford = points >= item.points;
              return (
                <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * i }}
                  className={`flex items-center justify-between p-3 md:p-4 rounded-xl border transition-all ${
                    canAfford ? 'border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-900/10' : 'border-gray-100 dark:border-slate-800 opacity-60'
                  }`}>
                  <div className="flex items-center gap-2.5 md:gap-3">
                    <div className={`h-9 w-9 md:h-10 md:w-10 rounded-xl flex items-center justify-center ${canAfford ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-gray-100 dark:bg-slate-800'}`}>
                      <Gift className={`h-4 w-4 md:h-5 md:w-5 ${canAfford ? 'text-emerald-500' : 'text-gray-400'}`} />
                    </div>
                    <div>
                      <h4 className="text-xs md:text-sm font-bold text-gray-900 dark:text-white">{item.reward}</h4>
                      <p className="text-[10px] md:text-xs text-gray-500">{item.points} نقطة</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRedeem(item)}
                    disabled={!canAfford || redeeming}
                    className={`h-8 md:h-9 px-3 md:px-4 rounded-lg text-[10px] md:text-xs font-bold transition-all ${
                      canAfford
                        ? 'text-white shadow-md hover:shadow-lg'
                        : 'bg-gray-100 dark:bg-slate-800 text-gray-400 cursor-not-allowed'
                    }`}
                    style={canAfford ? { backgroundColor: primaryColor } : {}}
                  >
                    {redeeming ? 'جاري...' : canAfford ? 'استبدال' : `${item.points} نقطة`}
                  </button>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
          className="text-center">
          <button onClick={() => router.push('/shop')}
            className="h-10 md:h-12 px-6 md:px-8 rounded-xl text-white font-bold text-xs md:text-sm flex items-center gap-2 mx-auto shadow-lg hover:shadow-xl transition-all"
            style={{ backgroundColor: primaryColor }}>
            <ArrowRight className="h-3.5 w-3.5 md:h-4 md:w-4" /> تسوق واكسب نقاط
          </button>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
}
