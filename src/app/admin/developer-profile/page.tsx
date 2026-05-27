'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth-store';
import { useBrandingStore } from '@/lib/store/branding-store';
import {
  User, Mail, Phone, Lock, Shield, Key, Save, RefreshCw, Eye, EyeOff,
  Settings, Code, Activity, Database, Server, GitBranch, Terminal,
  Check, X, AlertCircle, Clock,
} from 'lucide-react';
import toast from 'react-hot-toast';

const roleLabels: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  admin: { label: 'مطور / أدمن', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: <Shield className="h-3 w-3" /> },
  manager: { label: 'مدير', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: <User className="h-3 w-3" /> },
  cashier: { label: 'كاشير', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: <Terminal className="h-3 w-3" /> },
  customer: { label: 'عميل', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400', icon: <User className="h-3 w-3" /> },
};

export default function DeveloperProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { branding } = useBrandingStore();

  const [saving, setSaving] = useState(false);
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (!isAuthenticated) { router.replace('/login'); return; }
    if (user?.role !== 'admin') { toast.error('هذه الصفحة متاحة للمطور فقط'); router.replace('/dashboard'); }
  }, [isAuthenticated, user, router]);

  useEffect(() => {
    setEmail(user?.email || '');
    setPhone(user?.phone || '');
  }, [user]);

  const handleUpdateProfile = async () => {
    if (!email) { toast.error('أدخل البريد الإلكتروني'); return; }
    setSaving(true);
    await new Promise((r) => setTimeout(r, 500));
    setSaving(false);
    toast.success('تم تحديث الملف الشخصي');
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) { toast.error('املأ جميع الحقول'); return; }
    if (newPassword !== confirmPassword) { toast.error('كلمة المرور الجديدة غير متطابقة'); return; }
    if (newPassword.length < 6) { toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل'); return; }
    setSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    setSaving(false);
    toast.success('تم تغيير كلمة المرور');
  };

  const roleInfo = roleLabels[user?.role || 'customer'] || roleLabels.customer;

  return (
    <div dir="rtl" className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 dark:from-white dark:to-gray-200 flex items-center justify-center shadow-md">
          <Code className="h-5 w-5 text-white dark:text-gray-800" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">الملف الشخصي للمطور</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">إدارة الحساب والإعدادات</p>
        </div>
      </div>

      {/* Profile Card */}
      <div className="rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 dark:from-white dark:to-gray-100 p-6 text-white dark:text-gray-900">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-white/20 dark:bg-gray-900/10 flex items-center justify-center">
            <User className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold">{user?.name || 'المطور'}</h2>
            <p className="text-white/70 dark:text-gray-600 text-sm">{email}</p>
            <div className="mt-2">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${roleInfo.color.replace('bg-', 'bg-white/20 dark:bg-gray-900/20 ').replace('text-', 'text-white dark:text-gray-900 ')}`}>
                {roleInfo.icon} {roleInfo.label}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Account Details */}
      <div className="rounded-2xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center gap-2">
          <Settings className="h-4 w-4 text-gray-400" />
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">بيانات الحساب</h3>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1.5 flex items-center gap-1.5">
                <Mail className="h-3 w-3" /> البريد الإلكتروني
              </label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full h-10 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm px-3 dark:text-white" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1.5 flex items-center gap-1.5">
                <Phone className="h-3 w-3" /> رقم الهاتف
              </label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full h-10 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm px-3 dark:text-white" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1.5">الدور</label>
              <div className="h-10 rounded-xl bg-gray-50 dark:bg-slate-800 flex items-center px-3">
                <span className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">{roleInfo.icon} {roleInfo.label}</span>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1.5">كود الوصول</label>
              <div className="h-10 rounded-xl bg-gray-50 dark:bg-slate-800 flex items-center px-3">
                <span className="text-sm text-gray-700 dark:text-gray-300 font-mono flex items-center gap-2"><Key className="h-3 w-3" /> {branding.adminAccessCode || 'غير محدد'}</span>
              </div>
            </div>
          </div>
          <button onClick={handleUpdateProfile} disabled={saving} className="w-full h-10 rounded-xl bg-gradient-to-r from-gray-800 to-gray-900 dark:from-white dark:to-gray-200 text-white dark:text-gray-900 text-sm font-medium shadow-lg flex items-center justify-center gap-2 disabled:opacity-50">
            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'جاري الحفظ...' : 'حفظ البيانات'}
          </button>
        </div>
      </div>

      {/* Change Password */}
      <div className="rounded-2xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center gap-2">
          <Lock className="h-4 w-4 text-gray-400" />
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">تغيير كلمة المرور</h3>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1.5">كلمة المرور الحالية</label>
            <div className="relative">
              <input type={showCurrentPw ? 'text' : 'password'} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="w-full h-10 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm px-3 pr-10 dark:text-white" />
              <button onClick={() => setShowCurrentPw(!showCurrentPw)} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showCurrentPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1.5">كلمة المرور الجديدة</label>
              <div className="relative">
                <input type={showNewPw ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full h-10 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm px-3 pr-10 dark:text-white" />
                <button onClick={() => setShowNewPw(!showNewPw)} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1.5">تأكيد كلمة المرور</label>
              <div className="relative">
                <input type={showConfirmPw ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full h-10 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm px-3 pr-10 dark:text-white" />
                <button onClick={() => setShowConfirmPw(!showConfirmPw)} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showConfirmPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
          {newPassword && confirmPassword && newPassword !== confirmPassword && (
            <div className="flex items-center gap-2 text-xs text-red-500">
              <AlertCircle className="h-3 w-3" /> كلمة المرور غير متطابقة
            </div>
          )}
          {newPassword && confirmPassword && newPassword === confirmPassword && newPassword.length >= 6 && (
            <div className="flex items-center gap-2 text-xs text-green-500">
              <Check className="h-3 w-3" /> كلمة المرور متطابقة
            </div>
          )}
          <button onClick={handleChangePassword} disabled={saving} className="w-full h-10 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white text-sm font-medium shadow-lg flex items-center justify-center gap-2 disabled:opacity-50">
            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
            {saving ? 'جاري التغيير...' : 'تغيير كلمة المرور'}
          </button>
        </div>
      </div>

      {/* System Info */}
      <div className="rounded-2xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center gap-2">
          <Server className="h-4 w-4 text-gray-400" />
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">معلومات النظام</h3>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="rounded-xl bg-gray-50 dark:bg-slate-800 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Database className="h-4 w-4 text-blue-500" />
                <span className="text-xs font-medium text-gray-500">قاعدة البيانات</span>
              </div>
              <p className="text-sm font-bold text-gray-900 dark:text-white">Supabase</p>
            </div>
            <div className="rounded-xl bg-gray-50 dark:bg-slate-800 p-4">
              <div className="flex items-center gap-2 mb-2">
                <GitBranch className="h-4 w-4 text-green-500" />
                <span className="text-xs font-medium text-gray-500">الإطار</span>
              </div>
              <p className="text-sm font-bold text-gray-900 dark:text-white">Next.js 16</p>
            </div>
            <div className="rounded-xl bg-gray-50 dark:bg-slate-800 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="h-4 w-4 text-purple-500" />
                <span className="text-xs font-medium text-gray-500">حالة النظام</span>
              </div>
              <p className="text-sm font-bold text-green-600 flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500" /> يعمل</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
