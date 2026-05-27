'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store/auth-store';
import { createClient } from '@/lib/supabase/client';
import { type UserRole } from '@/types';
import { getDefaultRouteForRole } from '@/lib/permissions';
import { LogIn, Mail, Lock, Eye, EyeOff, Loader2, ArrowRight, Building2, User, Shield, UserPlus, CheckCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const ROLE_CONFIG: { role: UserRole; label: string; labelEn: string; desc: string; color: string; icon: React.ReactNode; email: string }[] = [
  { role: 'admin', label: 'مطور النظام', labelEn: 'Developer', desc: 'المطور — تحكم تقني كامل', color: '#EF4444', icon: <Shield className="h-4 w-4" />, email: 'sapkeyglobal@gmail.com' },
  { role: 'manager', label: 'المدير', labelEn: 'Manager', desc: 'إدارة المتجر', color: '#3B82F6', icon: <User className="h-4 w-4" />, email: 'manager@sapkey.com' },
  { role: 'cashier', label: 'كاشير', labelEn: 'Cashier', desc: 'نقطة البيع', color: '#F59E0B', icon: <User className="h-4 w-4" />, email: 'cashier@sapkey.com' },
  { role: 'customer', label: 'عميل', labelEn: 'Customer', desc: 'تسوق إلكتروني', color: '#22C55E', icon: <UserPlus className="h-4 w-4" />, email: 'customer@sapkey.com' },
];

const ADMIN_EMAIL = 'sapkeyglobal@gmail.com';

export default function LoginPage() {
  const { login } = useAuthStore();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>('admin');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [setupStatus, setSetupStatus] = useState<'idle' | 'checking' | 'ready' | 'error'>('idle');

  const isAdmin = selectedRole === 'admin';
  const roleConfig = ROLE_CONFIG.find((r) => r.role === selectedRole)!;

  const [email, setEmail] = useState(ADMIN_EMAIL);
  const [password, setPassword] = useState('');

  useEffect(() => {
    async function setupAdmin() {
      setSetupStatus('checking');
      try {
        const supabase = createClient();
        const { data, error } = await supabase.auth.signInWithPassword({
          email: ADMIN_EMAIL,
          password: '123456',
        });

        if (data?.user) {
          await supabase.auth.signOut();
          setSetupStatus('ready');
          return;
        }

        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: ADMIN_EMAIL,
          password: '123456',
          options: {
            data: {
              full_name: 'Developer',
              full_name_ar: 'مطور النظام',
              role: 'admin',
            },
          },
        });

        if (signUpError) {
          console.error('Admin setup failed:', signUpError.message);
          setSetupStatus('error');
          return;
        }

        if (signUpData?.user) {
          try {
            await supabase.from('users').upsert({
              id: signUpData.user.id,
              email: ADMIN_EMAIL,
              password_hash: 'supabase_auth',
              full_name_ar: 'مطور النظام',
              full_name_en: 'Developer',
              phone: '',
              role: 'admin',
              is_active: true,
            }, { onConflict: 'id' });
          } catch (e) {}
        }

        setSetupStatus('ready');
      } catch (e) {
        console.error('Setup error:', e);
        setSetupStatus('error');
      }
    }
    setupAdmin();
  }, []);

  useEffect(() => {
    setEmail(roleConfig.email);
    setPassword('');
  }, [selectedRole, roleConfig.email]);

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
      } else {
        window.location.href = getDefaultRouteForRole(u?.role || selectedRole);
      }
    } else {
      toast.error(r.error || 'بيانات الدخول غير صحيحة');
    }
  };

  if (setupStatus === 'checking') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-[#0A0A0A] dark:via-[#111] dark:to-[#0A0A0A] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-3" />
          <p className="text-sm text-gray-500">جاري تحضير النظام...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-[#0A0A0A] dark:via-[#111] dark:to-[#0A0A0A] flex flex-col">
      <div className="flex-1 flex flex-col max-w-sm mx-auto w-full px-6 justify-center">
        <button
          onClick={() => router.push('/')}
          className="absolute top-4 right-4 flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <ArrowRight className="h-3.5 w-3.5 rotate-180" />
          الرئيسية
        </button>

        <div className="mb-8 text-center">
          <div className="h-14 w-14 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-blue-500/20 bg-gradient-to-br from-blue-500 to-indigo-600">
            <Building2 className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">تسجيل الدخول</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">نظام إدارة السوبر ماركت</p>
        </div>

        {setupStatus === 'error' && (
          <div className="mb-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
            <p className="text-[10px] text-red-700 dark:text-red-300">مشكلة في الاتصال بقاعدة البيانات. تأكد من الإنترنت وحاول مرة أخرى.</p>
          </div>
        )}
        {setupStatus === 'ready' && isAdmin && (
          <div className="mb-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3 flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
            <p className="text-[10px] text-green-700 dark:text-green-300">حساب المطور جاهز — أدخل كلمة المرور</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="relative">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">نوع الحساب</label>
            <button
              type="button"
              onClick={() => setShowDropdown(!showDropdown)}
              className="w-full h-12 px-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-right text-sm flex items-center justify-between transition-all hover:border-gray-300 dark:hover:border-gray-700"
            >
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: roleConfig.color }}>
                  {roleConfig.icon}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{roleConfig.label}</p>
                  <p className="text-[10px] text-gray-400">{roleConfig.desc}</p>
                </div>
              </div>
              <svg className={`h-4 w-4 text-gray-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showDropdown && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />
                <div className="absolute top-full mt-1 left-0 right-0 z-20 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl overflow-hidden max-h-80 overflow-y-auto">
                  {ROLE_CONFIG.map((r) => (
                    <button
                      key={r.role}
                      type="button"
                      onClick={() => { setSelectedRole(r.role); setShowDropdown(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-right transition-all hover:bg-gray-50 dark:hover:bg-gray-800 ${
                        selectedRole === r.role ? 'bg-blue-50 dark:bg-blue-900/10 border-r-2 border-blue-500' : ''
                      }`}
                    >
                      <div className="h-8 w-8 rounded-lg flex items-center justify-center text-white shrink-0" style={{ backgroundColor: r.color }}>
                        {r.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${selectedRole === r.role ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>{r.label}</p>
                        <span className="text-[10px] text-gray-400">{r.desc}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">البريد الإلكتروني</label>
            <div className="relative">
              <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="email"
                value={email}
                dir="ltr"
                readOnly
                className="w-full h-11 pr-10 pl-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm text-gray-900 dark:text-white opacity-70 cursor-not-allowed focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">كلمة المرور</label>
            <div className="relative">
              <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                dir="ltr"
                placeholder="أدخل كلمة المرور"
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-11 pr-10 pl-10 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50 shadow-lg shadow-emerald-600/30"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
            {loading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
          </button>

          <div className="text-center">
            <Link href="/forgot-password" className="text-xs text-blue-600 hover:text-blue-700 font-medium">
              نسيت كلمة المرور؟
            </Link>
          </div>

          <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3">
            <p className="text-[10px] text-amber-700 dark:text-amber-300 text-center">
              ⚠️ كلمة المرور الافتراضية: <span className="font-mono font-bold">12345678</span> — غيّرها من الملف الشخصي
            </p>
          </div>
        </form>
      </div>

      <div className="px-6 py-3 text-center">
        <p className="text-[9px] text-gray-400 dark:text-gray-600 tracking-wider">SAPKEY SOLUTIONS <sup>TM</sup> &copy; {new Date().getFullYear()}</p>
      </div>
    </div>
  );
}
