'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth-store';
import { createClient } from '@/lib/supabase/client';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, Loader2, ArrowRight, Shield } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ChangePasswordPage() {
  const router = useRouter();
  const { user, isAuthenticated, changePassword, logout } = useAuthStore();
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      router.replace('/login');
      return;
    }
    setReady(true);
  }, [isAuthenticated, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPw || !newPw || !confirmPw) { toast.error('املأ جميع الحقول'); return; }
    if (newPw !== confirmPw) { toast.error('كلمة المرور غير متطابقة'); return; }
    if (newPw.length < 6) { toast.error('6 أحرف على الأقل'); return; }
    if (newPw === '12345678') { toast.error('اختر كلمة مرور مختلفة عن الافتراضية'); return; }

    setLoading(true);
    const result = await changePassword(currentPw, newPw);
    setLoading(false);

    if (result.success) {
      toast.success('تم تغيير كلمة المرور بنجاح');
      if (user?.id) localStorage.setItem(`password_changed_${user.id}`, '1');
      const roleRoutes: Record<string, string> = {
        admin: '/admin',
        manager: '/dashboard',
        cashier: '/pos',
        customer: '/customer',
      };
      router.push(roleRoutes[user?.role || ''] || '/dashboard');
    } else {
      toast.error(result.error || 'فشل تغيير كلمة المرور');
    }
  };

  const handleSkip = () => {
    if (user?.id) localStorage.setItem(`password_changed_${user.id}`, '1');
    const roleRoutes: Record<string, string> = {
      admin: '/admin',
      manager: '/dashboard',
      cashier: '/pos',
      customer: '/customer',
    };
    router.push(roleRoutes[user?.role || ''] || '/dashboard');
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (!ready) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-[#0A0A0A] dark:via-[#111] dark:to-[#0A0A0A] flex flex-col" dir="rtl">
      <button onClick={handleLogout}
        className="absolute top-4 left-4 flex items-center gap-2 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
        تسجيل خروج
      </button>

      <div className="flex-1 flex flex-col max-w-md mx-auto w-full px-6 justify-center py-12">
        <div className="mb-8 text-center">
          <div className="h-16 w-16 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-blue-500/20 bg-gradient-to-br from-blue-500 to-indigo-600">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">تغيير كلمة المرور</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">لحماية حسابك، يرجى تغيير كلمة المرور الافتراضية</p>
        </div>

        <div className="rounded-2xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl p-6 space-y-5">
          <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-[10px] text-amber-700 dark:text-amber-300">
              كلمة المرور الافتراضية <span className="font-mono font-bold">12345678</span> — يجب تغييرها لحماية حسابك
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <label className="text-[10px] font-medium text-gray-500 block mb-1">كلمة المرور الحالية</label>
              <input type={showCurrent ? 'text' : 'password'} value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} dir="ltr" placeholder="123456"
                className="w-full h-11 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-xs px-3 pr-10 dark:text-white" />
              <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute left-3 top-8 text-gray-400">
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <div className="relative">
              <label className="text-[10px] font-medium text-gray-500 block mb-1">كلمة المرور الجديدة</label>
              <input type={showNew ? 'text' : 'password'} value={newPw} onChange={(e) => setNewPw(e.target.value)} dir="ltr" placeholder="6 أحرف على الأقل"
                className="w-full h-11 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-xs px-3 pr-10 dark:text-white" />
              <button type="button" onClick={() => setShowNew(!showNew)} className="absolute left-3 top-8 text-gray-400">
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <div>
              <label className="text-[10px] font-medium text-gray-500 block mb-1">تأكيد كلمة المرور</label>
              <input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} dir="ltr" placeholder="أعد كتابة كلمة المرور"
                className="w-full h-11 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-xs px-3 dark:text-white" />
              {newPw && confirmPw && newPw !== confirmPw && (
                <p className="text-[10px] text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> غير متطابقة</p>
              )}
              {newPw && confirmPw && newPw === confirmPw && newPw.length >= 6 && (
                <p className="text-[10px] text-green-500 mt-1 flex items-center gap-1"><CheckCircle className="h-3 w-3" /> متطابقة</p>
              )}
            </div>

            <button type="submit" disabled={loading}
              className="w-full h-11 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-blue-500/20">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
              {loading ? 'جاري التغيير...' : 'تغيير كلمة المرور'}
            </button>
          </form>

          <button onClick={handleSkip}
            className="w-full h-10 rounded-xl border border-gray-200 dark:border-slate-700 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-all flex items-center justify-center gap-1">
            تخطي مؤقتًا <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </div>

      <div className="px-6 py-3 text-center">
        <p className="text-[9px] text-gray-400 dark:text-gray-600 tracking-wider">SAPKEY SOLUTIONS <sup>TM</sup> &copy; {new Date().getFullYear()}</p>
      </div>
    </div>
  );
}
