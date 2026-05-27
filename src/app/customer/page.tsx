'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  User, ShoppingBag, Heart, MapPin, Bell, Settings,
  LogOut, ChevronLeft, Edit2, Package, Clock, Star,
  Wallet, Mic, Loader2, Plus, Lock, Mail, Gift,
  CreditCard, RotateCcw, ChevronDown, ChevronUp,
  Shield, Award, TrendingUp, Circle, Eye, EyeOff,
  Check, AlertCircle, Save, Zap, Camera,
} from 'lucide-react';
import { useAuthStore } from '@/lib/store/auth-store';
import { useCartStore } from '@/lib/store/ecommerce-store';
import { useVoiceAssistant } from '@/lib/hooks/use-voice-assistant';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

const supabase = createClient();

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) {
  return (
    <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl p-4 border border-gray-100/50 dark:border-slate-800/50 shadow-sm">
      <div className={`h-10 w-10 rounded-xl ${color} flex items-center justify-center mb-3`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <p className="text-2xl font-black text-gray-900 dark:text-white tabular-nums">{value}</p>
      <p className="text-[10px] text-gray-400 mt-0.5">{label}</p>
    </div>
  );
}

type Tab = 'profile' | 'orders' | 'wallet';

export default function CustomerProfilePage() {
  const router = useRouter();
  const { user, logout, isAuthenticated, updateProfile, changePassword } = useAuthStore();
  const { addItem } = useCartStore();

  const [activeTab, setActiveTab] = useState<Tab>('profile');

  const [profile, setProfile] = useState({ name: user?.nameAr || user?.name || '', phone: user?.phone || '', email: user?.email || '' });
  const [saving, setSaving] = useState(false);

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState({ current: false, new: false });
  const [pwSaving, setPwSaving] = useState(false);

  const [walletData, setWalletData] = useState({ balance: 0, points: 0, transactions: [] as any[], orders: 0 });
  const [walletLoading, setWalletLoading] = useState(true);

  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [notifCount, setNotifCount] = useState(0);

  // Real-time wallet subscription
  useEffect(() => {
    if (!isAuthenticated) { router.replace('/shop?login=true'); return; }
    if (user?.role !== 'customer') {
      toast.error('هذه الصفحة متاحة للعملاء فقط');
      router.replace('/shop');
      return;
    }
  }, [isAuthenticated, user, router]);

  useEffect(() => {
    if (user?.role !== 'customer') return;
    loadDashboard();

    const wChannel = supabase.channel('customer-wallet-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customer_wallets', filter: `customer_id=eq.${user.id}` }, () => loadDashboard())
      .subscribe();

    const oChannel = supabase.channel('customer-orders-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `customer_id=eq.${user.id}` }, () => loadDashboard())
      .subscribe();

    return () => { supabase.removeChannel(wChannel); supabase.removeChannel(oChannel); };
  }, [user?.id]);

  const loadDashboard = async () => {
    if (!user?.id) return;
    try {
      const [walletRes, ordersRes, notifRes] = await Promise.allSettled([
        supabase.from('customer_wallets').select('*').eq('user_id', user.id).single(),
        supabase.from('orders').select('*').eq('customer_id', user.id).order('created_at', { ascending: false }).limit(5),
        supabase.from('customer_notifications').select('id', { count: 'exact', head: true }).eq('customer_id', user.id).eq('is_read', false),
      ]);

      if (walletRes.status === 'fulfilled' && walletRes.value.data) {
        const w = walletRes.value.data;
        setWalletData(prev => ({ ...prev, balance: w.balance || 0, points: w.loyalty_points || 0 }));
        const txRes = await supabase.from('wallet_transactions').select('*').eq('wallet_id', w.id).order('created_at', { ascending: false }).limit(10);
        if (txRes.data) setWalletData(prev => ({ ...prev, transactions: txRes.data }));
      }
      if (ordersRes.status === 'fulfilled' && ordersRes.value.data) {
        setRecentOrders(ordersRes.value.data);
        setWalletData(prev => ({ ...prev, orders: ordersRes.value.data!.length }));
      }
      if (notifRes.status === 'fulfilled') {
        setNotifCount((notifRes as any).value?.count || 0);
      }
    } catch { /* silent */ }
    finally { setWalletLoading(false); }
  };

  const { isListening, interimText, toggleListening } = useVoiceAssistant({
    onSearch: (query) => router.push(`/shop?search=${encodeURIComponent(query)}`),
    commands: [
      { keywords: ['محفظ', 'رصيد', 'wallet'], action: () => toast.success(`رصيد محفظتك: ${formatCurrency(walletData.balance)}`), priority: 10 },
      { keywords: ['نقط', 'ولاء', 'loyalty'], action: () => toast.success(`عندك ${walletData.points} نقطة ولاء`), priority: 10 },
    ],
  });

  const handleSaveProfile = async () => {
    setSaving(true);
    const result = await updateProfile({ name: profile.name, nameAr: profile.name, phone: profile.phone, email: profile.email });
    setSaving(false);
    toast[result.success ? 'success' : 'error'](result.success ? 'تم حفظ التغييرات' : (result.error || 'فشل الحفظ'));
  };

  const handleChangePassword = async () => {
    if (!currentPw || !newPw || !confirmPw) { toast.error('املأ جميع الحقول'); return; }
    if (newPw !== confirmPw) { toast.error('كلمة المرور غير متطابقة'); return; }
    if (newPw.length < 6) { toast.error('6 أحرف على الأقل'); return; }
    setPwSaving(true);
    const result = await changePassword(currentPw, newPw);
    setPwSaving(false);
    if (result.success) { setCurrentPw(''); setNewPw(''); setConfirmPw(''); toast.success('تم تغيير كلمة المرور'); }
    else { toast.error(result.error || 'فشل التغيير'); }
  };

  const handleLogout = () => { logout(); router.push('/'); toast.success('تم تسجيل الخروج'); };

  if (!isAuthenticated || user?.role !== 'customer') {
    return <div className="min-h-screen bg-[#020617] flex items-center justify-center"><div className="animate-spin h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-[#020617] dark:to-slate-950 pb-24">
      {/* Header */}
      <div className="relative">
        <div className="h-40 bg-gradient-to-br from-emerald-500 via-green-600 to-emerald-700 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_60%)]" />
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white/5" />
          <div className="relative z-10 px-4 pt-4 flex items-center justify-between">
            <button onClick={() => router.back()} className="h-9 w-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <ChevronLeft className="h-5 w-5 text-white" />
            </button>
            <div className="flex items-center gap-2">
              <button onClick={toggleListening} className={`h-9 w-9 rounded-xl flex items-center justify-center transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-white/20 backdrop-blur-sm text-white hover:bg-white/30'}`}>
                {isListening ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
              </button>
              <button className="h-9 w-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center relative">
                <Bell className="h-4 w-4 text-white" />
                {notifCount > 0 && <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center">{notifCount > 9 ? '9+' : notifCount}</span>}
              </button>
            </div>
          </div>
          <div className="relative z-10 px-4 mt-6 flex items-center gap-4">
            <div className="relative">
              <div className="h-16 w-16 rounded-full bg-white/20 backdrop-blur-sm p-0.5 ring-2 ring-white/30">
                <div className="h-full w-full rounded-full bg-gradient-to-br from-emerald-100 to-green-100 dark:from-emerald-900/50 dark:to-green-900/50 flex items-center justify-center">
                  <User className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
              <button className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 flex items-center justify-center">
                <Camera className="h-2.5 w-2.5 text-white" />
              </button>
            </div>
            <div className="flex-1">
              <h1 className="text-lg font-bold text-white">{profile.name || 'عميل مميز'}</h1>
              <div className="flex items-center gap-1.5">
                <Star className="h-3 w-3 text-amber-300 fill-amber-300" />
                <span className="text-[10px] text-emerald-100">عميل مميز</span>
                <span className="text-[10px] text-emerald-200/50 mx-1">•</span>
                <span className="text-[10px] text-emerald-100">{walletData.points} نقطة</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky top-0 z-20 bg-white/80 dark:bg-slate-950/80 backdrop-blur-2xl border-b border-gray-100 dark:border-slate-800">
        <div className="max-w-4xl mx-auto flex">
          {[
            { key: 'profile' as Tab, label: 'الملف الشخصي', icon: User },
            { key: 'orders' as Tab, label: 'الطلبات', icon: Package, badge: walletData.orders },
            { key: 'wallet' as Tab, label: 'المحفظة', icon: Wallet },
          ].map(({ key, label, icon: Icon, badge }) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 h-12 text-xs font-bold border-b-2 transition-all relative ${activeTab === key ? 'text-emerald-600 border-emerald-500' : 'text-gray-400 border-transparent hover:text-gray-600'}`}>
              <Icon className="h-3.5 w-3.5" />
              {label}
              {badge !== undefined && badge > 0 && <span className="h-4 min-w-[16px] px-1 rounded-full bg-emerald-500 text-white text-[8px] font-bold flex items-center justify-center">{badge}</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-4 space-y-4">
        {/* ========= PROFILE TAB ========= */}
        <AnimatePresence mode="wait">
          {activeTab === 'profile' && (
            <motion.div key="profile" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-3">
                <StatCard icon={Package} label="إجمالي الطلبات" value={walletData.orders} color="bg-gradient-to-br from-emerald-500 to-green-600" />
                <StatCard icon={Star} label="نقاط الولاء" value={walletData.points} color="bg-gradient-to-br from-amber-500 to-orange-600" />
                <StatCard icon={Wallet} label="رصيد المحفظة" value={formatCurrency(walletData.balance)} color="bg-gradient-to-br from-blue-500 to-indigo-600" />
              </div>

              {/* Profile Edit */}
              <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl border border-gray-100/50 dark:border-slate-800/50 p-4">
                <h3 className="text-xs font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><Edit2 className="h-3.5 w-3.5 text-emerald-500" /> تعديل الملف الشخصي</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-medium text-gray-400 block mb-1">الاسم</label>
                    <input type="text" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      className="w-full h-10 px-3.5 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700/50 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-medium text-gray-400 block mb-1">الهاتف</label>
                      <input type="tel" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                        className="w-full h-10 px-3.5 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700/50 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all" dir="ltr" />
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-gray-400 block mb-1">البريد</label>
                      <input type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                        className="w-full h-10 px-3.5 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700/50 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all" dir="ltr" />
                    </div>
                  </div>
                  <button onClick={handleSaveProfile} disabled={saving}
                    className="w-full h-10 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 hover:shadow-lg hover:shadow-emerald-500/25 transition-all disabled:opacity-50">
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} حفظ التغييرات
                  </button>
                </div>
              </div>

              {/* Change Password */}
              <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl border border-gray-100/50 dark:border-slate-800/50 p-4">
                <h3 className="text-xs font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><Lock className="h-3.5 w-3.5 text-amber-500" /> كلمة المرور</h3>
                <div className="space-y-3">
                  <div className="relative">
                    <label className="text-[10px] font-medium text-gray-400 block mb-1">الحالية</label>
                    <input type={showPw.current ? 'text' : 'password'} value={currentPw} onChange={(e) => setCurrentPw(e.target.value)}
                      className="w-full h-10 px-3.5 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700/50 text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all" />
                    <button onClick={() => setShowPw(p => ({ ...p, current: !p.current }))} className="absolute left-3 top-7 text-gray-400 hover:text-gray-600">
                      {showPw.current ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="relative">
                      <label className="text-[10px] font-medium text-gray-400 block mb-1">الجديدة</label>
                      <input type={showPw.new ? 'text' : 'password'} value={newPw} onChange={(e) => setNewPw(e.target.value)}
                        className="w-full h-10 px-3.5 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700/50 text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all" />
                      <button onClick={() => setShowPw(p => ({ ...p, new: !p.new }))} className="absolute left-3 top-7 text-gray-400 hover:text-gray-600">
                        {showPw.new ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-gray-400 block mb-1">التأكيد</label>
                      <input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)}
                        className="w-full h-10 px-3.5 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700/50 text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all" />
                    </div>
                  </div>
                  {newPw && confirmPw && (
                    <div className={`flex items-center gap-1.5 text-[10px] ${newPw === confirmPw && newPw.length >= 6 ? 'text-green-500' : 'text-red-500'}`}>
                      {newPw === confirmPw && newPw.length >= 6 ? <><Check className="h-3 w-3" /> متطابقة وقوية</> : <><AlertCircle className="h-3 w-3" /> {newPw !== confirmPw ? 'غير متطابقة' : '6 أحرف على الأقل'}</>}
                    </div>
                  )}
                  <button onClick={handleChangePassword} disabled={pwSaving}
                    className="w-full h-10 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 hover:shadow-lg hover:shadow-amber-500/25 transition-all disabled:opacity-50">
                    {pwSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />} تحديث كلمة المرور
                  </button>
                </div>
              </div>

              {/* Quick Links */}
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => router.push('/customer/addresses')} className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl border border-gray-100/50 dark:border-slate-800/50 p-4 text-center hover:shadow-md transition-all group">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                    <MapPin className="h-5 w-5 text-white" />
                  </div>
                  <p className="text-xs font-bold text-gray-900 dark:text-white">العناوين</p>
                  <p className="text-[10px] text-gray-400">إدارة عناوين التوصيل</p>
                </button>
                <button onClick={() => router.push('/customer/wishlist')} className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl border border-gray-100/50 dark:border-slate-800/50 p-4 text-center hover:shadow-md transition-all group">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                    <Heart className="h-5 w-5 text-white" />
                  </div>
                  <p className="text-xs font-bold text-gray-900 dark:text-white">المفضلة</p>
                  <p className="text-[10px] text-gray-400">المنتجات المحفوظة</p>
                </button>
              </div>

              {/* Logout */}
              <button onClick={handleLogout}
                className="w-full h-11 rounded-2xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-800/20 text-red-600 text-xs font-bold flex items-center justify-center gap-2 hover:bg-red-100 dark:hover:bg-red-900/20 transition-all">
                <LogOut className="h-4 w-4" /> تسجيل الخروج
              </button>
            </motion.div>
          )}

          {/* ========= ORDERS TAB ========= */}
          {activeTab === 'orders' && (
            <motion.div key="orders" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
              {walletLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-emerald-500" /></div>
              ) : recentOrders.length === 0 ? (
                <div className="text-center py-16">
                  <div className="h-16 w-16 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                    <Package className="h-8 w-8 text-gray-300" />
                  </div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">لا توجد طلبات</p>
                  <p className="text-[10px] text-gray-400 mt-1">اطلب أول منتج الآن من المتجر</p>
                  <button onClick={() => router.push('/shop')} className="mt-4 h-10 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-white text-xs font-bold hover:shadow-lg transition-all">
                    تسوق الآن
                  </button>
                </div>
              ) : (
                recentOrders.map((order) => (
                  <motion.div key={order.id} whileTap={{ scale: 0.98 }} onClick={() => router.push(`/customer/orders/${order.id}`)}
                    className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl border border-gray-100/50 dark:border-slate-800/50 p-4 flex items-center gap-3 cursor-pointer hover:shadow-md transition-all">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-100 to-green-100 dark:from-emerald-900/30 dark:to-green-900/30 flex items-center justify-center shrink-0">
                      <ShoppingBag className="h-6 w-6 text-emerald-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{order.order_number || `طلب #${order.id.slice(0, 8)}`}</p>
                      <p className="text-[10px] text-gray-400">{order.customer_name || 'عميل'}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                          order.status === 'completed' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' :
                          order.status === 'preparing' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' :
                          'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-400'
                        }`}>{order.status}</span>
                        <span className="text-[10px] text-gray-400">{formatCurrency(order.total)}</span>
                      </div>
                    </div>
                    <ChevronLeft className="h-4 w-4 text-gray-300 shrink-0" />
                  </motion.div>
                ))
              )}
              {recentOrders.length > 0 && (
                <button onClick={() => router.push('/customer/orders')}
                  className="w-full h-10 rounded-xl bg-gray-50 dark:bg-slate-800/50 text-gray-600 dark:text-gray-300 text-xs font-bold border border-gray-100 dark:border-slate-700/50 hover:bg-gray-100 dark:hover:bg-slate-700/50 transition-all">
                  عرض كل الطلبات
                </button>
              )}
            </motion.div>
          )}

          {/* ========= WALLET TAB ========= */}
          {activeTab === 'wallet' && (
            <motion.div key="wallet" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
              {/* Balance Card */}
              <div className="bg-gradient-to-br from-emerald-500 via-green-600 to-emerald-700 rounded-2xl p-6 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-white/5 translate-y-1/2 -translate-x-1/2" />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-2">
                    <Wallet className="h-5 w-5 text-emerald-200" />
                    <span className="text-xs font-medium text-emerald-100">الرصيد المتاح</span>
                  </div>
                  <p className="text-3xl font-black">{formatCurrency(walletData.balance)}</p>
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/20">
                    <div className="flex items-center gap-1.5">
                      <Award className="h-4 w-4 text-amber-300" />
                      <span className="text-xs">{walletData.points} نقطة ولاء</span>
                    </div>
                    <button onClick={() => router.push('/customer/wallet')}
                      className="text-xs bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full font-bold hover:bg-white/30 transition-all">
                      إدارة المحفظة
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => toast.success('تواصل مع الكاشير لشحن الرصيد')}
                  className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl border border-gray-100/50 dark:border-slate-800/50 p-4 text-center hover:shadow-md transition-all group">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-100 to-green-100 dark:from-emerald-900/30 dark:to-green-900/30 flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                    <Plus className="h-5 w-5 text-emerald-500" />
                  </div>
                  <p className="text-xs font-bold text-gray-900 dark:text-white">شحن الرصيد</p>
                  <p className="text-[10px] text-gray-400">أضف رصيد لمحفظتك</p>
                </button>
                <button onClick={() => {
                  if (walletData.points < 50) { toast.error('تحتاج 50 نقطة على الأقل'); return; }
                  toast.success(`تم استبدال 50 نقطة بخصم 0.50 جنيه`);
                  setWalletData(p => ({ ...p, points: p.points - 50 }));
                }}
                  className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl border border-gray-100/50 dark:border-slate-800/50 p-4 text-center hover:shadow-md transition-all group">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                    <Gift className="h-5 w-5 text-amber-500" />
                  </div>
                  <p className="text-xs font-bold text-gray-900 dark:text-white">استبدال النقاط</p>
                  <p className="text-[10px] text-gray-400">{walletData.points} نقطة متاحة</p>
                </button>
              </div>

              {/* Recent Transactions */}
              <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl border border-gray-100/50 dark:border-slate-800/50 p-4">
                <h3 className="text-xs font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2"><Clock className="h-3.5 w-3.5 text-emerald-500" /> آخر المعاملات</h3>
                {walletData.transactions.length === 0 ? (
                  <p className="text-[10px] text-gray-400 text-center py-4">لا توجد معاملات</p>
                ) : (
                  <div className="space-y-2">
                    {walletData.transactions.slice(0, 5).map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-slate-800/50 last:border-0">
                        <div className="flex items-center gap-2">
                          <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${tx.amount > 0 ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                            {tx.amount > 0 ? <TrendingUp className="h-3.5 w-3.5 text-emerald-500" /> : <TrendingUp className="h-3.5 w-3.5 text-red-500 rotate-180" />}
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-gray-900 dark:text-white">{tx.description || tx.type}</p>
                            <p className="text-[8px] text-gray-400">{formatDate(new Date(tx.created_at))}</p>
                          </div>
                        </div>
                        <span className={`text-[10px] font-bold ${tx.amount > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                          {tx.amount > 0 ? '+' : ''}{formatCurrency(tx.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
