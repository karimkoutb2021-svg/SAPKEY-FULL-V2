'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useBrandingStore } from '@/lib/store/branding-store';
import { useAuthStore } from '@/lib/store/auth-store';
import { Store, UserPlus, Loader2, Mail, Lock, User, Phone, Eye, EyeOff, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CustomerRegisterPage() {
  const branding = useBrandingStore((s) => s.branding);
  const { login } = useAuthStore();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) { toast.error('يرجى ملء جميع الحقول المطلوبة'); return; }
    if (form.password !== form.confirmPassword) { toast.error('كلمة المرور غير متطابقة'); return; }
    if (form.password.length < 6) { toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل'); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/manage-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          email: form.email,
          password: form.password,
          name: form.name,
          phone: form.phone,
          role: 'customer',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل إنشاء الحساب');

      const result = await login(form.email, form.password);
      if (result.success) {
        toast.success('تم إنشاء الحساب بنجاح!');
        router.push('/shop');
      } else {
        toast.success('تم إنشاء الحساب! سجل دخولك الآن');
        router.push('/customer/login');
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'فشل إنشاء الحساب');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-[#0A0A0A] dark:via-[#111] dark:to-[#0A0A0A] flex flex-col">
      <div className="flex-1 flex flex-col max-w-sm mx-auto w-full px-6 justify-center">
        {/* Back */}
        <button
          onClick={() => router.back()}
          className="absolute top-4 right-4 flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <ArrowRight className="h-3.5 w-3.5 rotate-180" />
          رجوع
        </button>

        {/* Header */}
        <div className="mb-8 text-center">
          <div className="h-14 w-14 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-emerald-500/20 bg-gradient-to-br from-emerald-500 to-green-600">
            <Store className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">إنشاء حساب عميل</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">سجل الآن واستمتع بالتسوق</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">الاسم</label>
            <div className="relative">
              <User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input type="text" value={form.name} placeholder="الاسم الكامل"
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full h-11 pr-10 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all" />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">البريد الإلكتروني</label>
            <div className="relative">
              <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input type="email" value={form.email} dir="ltr" placeholder="email@example.com"
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full h-11 pr-10 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all" />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">رقم الهاتف</label>
            <div className="relative">
              <Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input type="tel" value={form.phone} dir="ltr" placeholder="01XXXXXXXXX"
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full h-11 pr-10 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all" />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">كلمة المرور</label>
            <div className="relative">
              <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input type={showPw ? 'text' : 'password'} value={form.password} placeholder="••••••••"
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full h-11 pr-10 pl-10 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all" />
              <button type="button" onClick={() => setShowPw(!showPw)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">تأكيد كلمة المرور</label>
            <div className="relative">
              <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input type={showConfirm ? 'text' : 'password'} value={form.confirmPassword} placeholder="••••••••"
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                className="w-full h-11 pr-10 pl-10 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all" />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="w-full h-11 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 flex items-center justify-center gap-2 text-white font-medium text-sm transition-all active:scale-[0.99] disabled:opacity-50 shadow-lg shadow-emerald-500/20">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            {loading ? 'جاري إنشاء الحساب...' : 'إنشاء حساب'}
          </button>

          <div className="text-center text-xs text-gray-500">
            لديك حساب بالفعل؟ <Link href="/customer/login" className="font-medium text-emerald-600 hover:text-emerald-700">تسجيل الدخول</Link>
          </div>
        </form>
      </div>

      <div className="px-6 py-3 text-center">
        <p className="text-[9px] text-gray-400 dark:text-gray-600 tracking-wider">SAPKEY SOLUTIONS <sup>TM</sup> &copy; {new Date().getFullYear()}</p>
      </div>
    </div>
  );
}
