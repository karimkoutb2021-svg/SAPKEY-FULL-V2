'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowRight, Lock, Eye, EyeOff, CheckCircle, AlertCircle, Store, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        toast.error('رابط الاستعادة غير صالح أو منتهي');
        router.push('/forgot-password');
      } else {
        setReady(true);
      }
    });
  }, [router]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { setError('كلمة المرور 6 أحرف على الأقل'); return; }
    if (password !== confirmPassword) { setError('كلمتا المرور غير متطابقتين'); return; }
    setLoading(true);
    setError('');

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      toast.success('تم تغيير كلمة المرور بنجاح');
      router.push('/login');
    } catch (err: any) {
      setError(err.message || 'فشل تغيير كلمة المرور');
    } finally {
      setLoading(false);
    }
  };

  if (!ready) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-green-50 dark:from-[#020617] dark:via-[#0f172a] dark:to-[#020617] flex flex-col" dir="rtl">
      <button onClick={() => router.push('/login')}
        className="absolute top-6 right-6 flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors z-10">
        <ArrowRight className="h-4 w-4" /> تسجيل الدخول
      </button>

      <div className="flex-1 flex flex-col max-w-md mx-auto w-full px-6 justify-center py-12">
        <div className="mb-10 text-center">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5 }}
            className="h-20 w-20 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-elevated bg-gradient-to-br from-emerald-500 to-green-600">
            <Lock className="h-10 w-10 text-white" />
          </motion.div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">كلمة مرور جديدة</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">أدخل كلمة المرور الجديدة</p>
        </div>

        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
          className="premium-card p-6">
          <form onSubmit={handleReset} className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">كلمة المرور الجديدة</label>
              <div className="relative">
                <Lock className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input type={showPw ? 'text' : 'password'} value={password} dir="ltr" placeholder="6 أحرف على الأقل"
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  className="search-bar-premium w-full pr-12 pl-12" />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                  {showPw ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">تأكيد كلمة المرور</label>
              <div className="relative">
                <Lock className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input type="password" value={confirmPassword} dir="ltr" placeholder="أعد كتابة كلمة المرور"
                  onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                  className="search-bar-premium w-full pr-12" />
              </div>
              {error && (
                <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> {error}
                </p>
              )}
            </div>

            <button type="submit" disabled={loading}
              className="btn-premium w-full flex items-center justify-center gap-2">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle className="h-5 w-5" />}
              {loading ? 'جاري التغيير...' : 'تغيير كلمة المرور'}
            </button>
          </form>
        </motion.div>
      </div>

      <div className="px-6 py-4 text-center">
        <p className="text-[10px] text-gray-400 dark:text-gray-600 tracking-wider">SAPKEY SOLUTIONS <sup>TM</sup> &copy; {new Date().getFullYear()}</p>
      </div>
    </div>
  );
}
