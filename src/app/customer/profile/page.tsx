'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/store/auth-store';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User, Edit2, Lock, Save, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, updateProfile, changePassword } = useAuthStore();
  
  const [profile, setProfile] = useState({ name: '', phone: '', email: '' });
  const [saving, setSaving] = useState(false);

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwSaving, setPwSaving] = useState(false);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!isAuthenticated) {
      router.replace('/shop?login=true');
      return;
    }
    if (user) {
      setProfile({
        name: user.nameAr || user.name || '',
        phone: user.phone || '',
        email: user.email || ''
      });
    }
  }, [isAuthenticated, user, router]);

  if (!mounted || !isAuthenticated) {
    return <div className="h-dvh flex items-center justify-center"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  const handleSaveProfile = async () => {
    if (!profile.name || !profile.phone) { toast.error('الاسم ورقم الهاتف مطلوبان'); return; }
    setSaving(true);
    const r = await updateProfile(profile);
    if (r.success) toast.success('تم الحفظ بنجاح');
    else toast.error(r.error || 'فشل الحفظ');
    setSaving(false);
  };

  const handleChangePassword = async () => {
    if (!currentPw || !newPw) { toast.error('أدخل كلمة المرور الحالية والجديدة'); return; }
    if (newPw !== confirmPw) { toast.error('كلمة المرور الجديدة غير متطابقة'); return; }
    setPwSaving(true);
    const r = await changePassword(currentPw, newPw);
    if (r.success) {
      toast.success('تم تغيير كلمة المرور');
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } else {
      toast.error(r.error || 'فشل التغيير');
    }
    setPwSaving(false);
  };

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto pb-12">
      <div className="flex items-center justify-between pt-2 mb-6">
        <h1 className="text-xl font-bold">الملف الشخصي 👤</h1>
        <Link href="/customer" className="text-xs text-white/50 hover:text-white">رجوع</Link>
      </div>

      <div className="space-y-4">
        {/* Profile Edit */}
        <div className="bg-white/[0.03] rounded-2xl border border-white/[0.06] p-5">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Edit2 className="h-4 w-4 text-emerald-500" /> تعديل البيانات
          </h3>
          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-medium text-white/50 block mb-1">الاسم</label>
              <input type="text" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                className="w-full h-11 px-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all" />
            </div>
            <div>
              <label className="text-[10px] font-medium text-white/50 block mb-1">الهاتف</label>
              <input type="tel" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                className="w-full h-11 px-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all" dir="ltr" />
            </div>
            <div>
              <label className="text-[10px] font-medium text-white/50 block mb-1">البريد الإلكتروني</label>
              <input type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                className="w-full h-11 px-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all" dir="ltr" />
            </div>
            <button onClick={handleSaveProfile} disabled={saving}
              className="w-full h-11 mt-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold flex items-center justify-center gap-1.5 transition-all disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} حفظ التغييرات
            </button>
          </div>
        </div>

        {/* Change Password */}
        <div className="bg-white/[0.03] rounded-2xl border border-white/[0.06] p-5">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Lock className="h-4 w-4 text-amber-500" /> كلمة المرور
          </h3>
          <div className="space-y-3">
            <div>
              <input type="password" placeholder="كلمة المرور الحالية" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all" dir="ltr" />
            </div>
            <div>
              <input type="password" placeholder="كلمة المرور الجديدة" value={newPw} onChange={(e) => setNewPw(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all" dir="ltr" />
            </div>
            <div>
              <input type="password" placeholder="تأكيد كلمة المرور" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all" dir="ltr" />
            </div>
            <button onClick={handleChangePassword} disabled={pwSaving}
              className="w-full h-11 mt-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 text-sm font-bold flex items-center justify-center gap-1.5 transition-all disabled:opacity-50">
              {pwSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'تحديث كلمة المرور'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
