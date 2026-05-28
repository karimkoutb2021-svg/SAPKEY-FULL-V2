import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/lib/store/auth-store';
import { LogIn, Mail, Lock, Eye, EyeOff, Loader2, ArrowRight, Store } from 'lucide-react';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';

export default function CustomerLoginPage() {
  const { login } = useAuthStore();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    const r = await login(email, password);
    setLoading(false);
    if (r.success) {
      const u = useAuthStore.getState().user;
      const pwChanged = localStorage.getItem(`password_changed_${u?.id}`);
      if (u?.role !== 'admin' && !pwChanged) {
        window.location.href = '/change-password';
      } else if (u?.role === 'customer') {
        router.push('/shop');
      } else {
        toast.error('هذا الحساب ليس حساب عميل — استخدم صفحة دخول الإدارة');
      }
    } else {
      toast.error(r.error || 'بيانات الدخول غير صحيحة');
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/shop`
        }
      });
      if (error) throw error;
    } catch (err: any) {
      toast.error('فشل تسجيل الدخول باستخدام جوجل: ' + (err.message || ''));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-green-50 dark:from-[#020617] dark:via-[#0f172a] dark:to-[#020617] flex flex-col" dir="rtl">
      <button
        onClick={() => router.push('/')}
        className="absolute top-6 right-6 flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors z-10"
      >
        <ArrowRight className="h-4 w-4" />
        الرئيسية
      </button>

      <div className="flex-1 flex flex-col max-w-md mx-auto w-full px-6 justify-center py-12">
        <div className="mb-10 text-center">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5 }}
            className="h-20 w-20 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-elevated bg-gradient-to-br from-emerald-500 to-green-600">
            <Store className="h-10 w-10 text-white" />
          </motion.div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">مرحباً بك</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">سجل دخولك للتسوق بسهولة</p>
        </div>

        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
          className="premium-card p-6 space-y-5">
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">البريد الإلكتروني</label>
              <div className="relative">
                <Mail className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input type="email" value={email} dir="ltr" placeholder="أدخل بريدك الإلكتروني"
                  onChange={(e) => setEmail(e.target.value)}
                  className="search-bar-premium w-full pr-12" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">كلمة المرور</label>
              <div className="relative">
                <Lock className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input type={showPw ? 'text' : 'password'} value={password} dir="ltr" placeholder="••••••••"
                  onChange={(e) => setPassword(e.target.value)}
                  className="search-bar-premium w-full pr-12 pl-12" />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                  {showPw ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="btn-premium w-full flex items-center justify-center gap-2">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogIn className="h-5 w-5" />}
              {loading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
            </button>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-gray-200 dark:border-slate-700"></div>
              <span className="flex-shrink mx-3 text-xs text-gray-400 font-medium">أو تابع باستخدام</span>
              <div className="flex-grow border-t border-gray-200 dark:border-slate-700"></div>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full h-11 px-4 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-700 dark:text-gray-200 text-sm font-bold flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors shadow-sm disabled:opacity-50"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.53 14.99 1 12 1 7.35 1 3.37 3.68 1.4 7.6l3.86 3C6.18 7.69 8.86 5.04 12 5.04z" />
                <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.46c-.28 1.48-1.12 2.74-2.38 3.58l3.7 2.87c2.16-1.99 3.41-4.92 3.41-8.6z" />
                <path fill="#FBBC05" d="M5.26 14.4c-.25-.76-.39-1.57-.39-2.4s.14-1.64.39-2.4L1.4 7.6C.51 9.38 0 11.38 0 13.5s.51 4.12 1.4 5.9l3.86-3z" />
                <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.92l-3.7-2.87c-1.03.69-2.35 1.1-4.26 1.1-3.14 0-5.82-2.65-6.74-5.56L1.4 15.74C3.37 20.32 7.35 23 12 23z" />
              </svg>
              الدخول السريع بحساب Google / Gmail
            </button>

            <div className="text-center text-sm text-gray-500">
              ليس لديك حساب؟ <Link href="/register" className="font-bold text-emerald-600 hover:text-emerald-700 transition-colors">إنشاء حساب جديد</Link>
            </div>

            <div className="text-center">
              <Link href="/forgot-password" className="text-xs text-emerald-600 hover:text-emerald-700 font-medium">
                نسيت كلمة المرور؟
              </Link>
            </div>
          </form>
        </motion.div>

        <div className="mt-8 grid grid-cols-3 gap-4">
          {[
            { icon: '🛒', label: 'تسوق سهل' },
            { icon: '🚚', label: 'توصيل سريع' },
            { icon: '💳', label: 'دفع آمن' },
          ].map(({ icon, label }) => (
            <div key={label} className="text-center">
              <div className="text-2xl mb-1">{icon}</div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">{label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="px-6 py-4 text-center">
        <p className="text-[10px] text-gray-400 dark:text-gray-600 tracking-wider">SAPKEY SOLUTIONS <sup>TM</sup> &copy; {new Date().getFullYear()}</p>
      </div>
    </div>
  );
}
