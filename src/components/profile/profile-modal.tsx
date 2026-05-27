'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Mail, Phone, Lock, Eye, EyeOff, Save, X, Loader2,
  LogOut, Check, AlertCircle, Pencil, Settings,
} from 'lucide-react';
import { useAuthStore } from '@/lib/store/auth-store';
import toast from 'react-hot-toast';

interface ProfileModalProps {
  open: boolean;
  onClose: () => void;
}

const roleLabels: Record<string, { label: string; color: string; bg: string }> = {
  admin: { label: 'مطور', color: 'text-red-600', bg: 'from-red-500 to-rose-600' },
  manager: { label: 'مدير', color: 'text-blue-600', bg: 'from-blue-500 to-indigo-600' },
  cashier: { label: 'كاشير', color: 'text-green-600', bg: 'from-green-500 to-emerald-600' },
  customer: { label: 'عميل', color: 'text-amber-600', bg: 'from-amber-500 to-orange-600' },
};

export function ProfileModal({ open, onClose }: ProfileModalProps) {
  const router = useRouter();
  const { user, logout, updateProfile, changePassword } = useAuthStore();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const [showPwSection, setShowPwSection] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const prevValuesRef = useRef({ name: '', phone: '', email: '' });
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open && user) {
      setName(user.nameAr || user.name || '');
      setPhone(user.phone || '');
      setEmail(user.email || '');
      prevValuesRef.current = {
        name: user.nameAr || user.name || '',
        phone: user.phone || '',
        email: user.email || '',
      };
    }
  }, [open, user]);

  const saveProfileChanges = useCallback(async (updates: { name?: string; phone?: string; email?: string }) => {
    const result = await updateProfile(updates);
    if (result.success) {
      setAutoSaveStatus('saved');
      setTimeout(() => setAutoSaveStatus('idle'), 2000);
    }
    return result;
  }, [updateProfile]);

  useEffect(() => {
    if (!open || !editing || !user) return;

    const current = { name, phone, email };
    const prev = prevValuesRef.current;
    const hasChanges = current.name !== prev.name || current.phone !== prev.phone || current.email !== prev.email;

    if (!hasChanges) return;

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

    autoSaveTimerRef.current = setTimeout(async () => {
      setAutoSaveStatus('saving');
      const updates: Record<string, string> = {};
      if (current.name !== prev.name) { updates.name = current.name; updates.nameAr = current.name; }
      if (current.phone !== prev.phone) updates.phone = current.phone;
      if (current.email !== prev.email) updates.email = current.email;

      if (Object.keys(updates).length > 0) {
        const result = await saveProfileChanges(updates);
        if (result.success) {
          prevValuesRef.current = { ...current };
        } else {
          setAutoSaveStatus('idle');
        }
      }
    }, 1000);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [name, phone, email, open, editing, user, saveProfileChanges]);

  const handleSave = async () => {
    setSaving(true);
    const updates: Record<string, string> = {};
    if (name !== (user?.nameAr || user?.name || '')) { updates.name = name; updates.nameAr = name; }
    if (phone !== user?.phone) updates.phone = phone;
    if (email !== user?.email) updates.email = email;

    let profileSaved = true;
    if (Object.keys(updates).length > 0) {
      const result = await updateProfile(updates);
      profileSaved = result.success;
      if (!result.success) toast.error(result.error || 'فشل حفظ البيانات');
    }

    let pwSaved = true;
    if (showPwSection && currentPw && newPw && confirmPw) {
      if (newPw !== confirmPw) { toast.error('كلمة المرور غير متطابقة'); setSaving(false); return; }
      if (newPw.length < 6) { toast.error('6 أحرف على الأقل'); setSaving(false); return; }
      const pwResult = await changePassword(currentPw, newPw);
      pwSaved = pwResult.success;
      if (!pwResult.success) toast.error(pwResult.error || 'فشل تغيير كلمة المرور');
    }

    setSaving(false);
    if (profileSaved && pwSaved) {
      toast.success('تم حفظ جميع الإعدادات');
      setEditing(false);
      setShowPwSection(false);
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
      prevValuesRef.current = { name, phone, email };
    }
  };

  const handleLogout = () => {
    logout();
    onClose();
    router.push('/');
    toast.success('تم تسجيل الخروج');
  };

  const roleInfo = roleLabels[user?.role || 'customer'] || roleLabels.customer;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]" onClick={onClose} />
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none">
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 0 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 350 }}
              className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden pointer-events-auto max-h-[85vh] overflow-y-auto" dir="rtl">

              <div className={`bg-gradient-to-br ${roleInfo.bg} p-6 text-white relative`}>
                <button onClick={onClose} className="absolute top-4 left-4 h-8 w-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-all">
                  <X className="h-4 w-4" />
                </button>
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl font-bold">
                    {(name || user?.name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-lg font-black">{name || user?.name}</h3>
                    <p className="text-white/80 text-sm">{email}</p>
                    <span className="inline-block mt-1 text-xs bg-white/20 px-2 py-0.5 rounded-full">{roleInfo.label}</span>
                  </div>
                </div>
              </div>

              <div className="p-5 space-y-3">
                {/* Edit Profile Section */}
                {editing ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2"><Pencil className="h-4 w-4" /> تعديل البيانات</h4>
                      {autoSaveStatus === 'saving' && (
                        <span className="text-[10px] text-gray-400 flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> جاري الحفظ...</span>
                      )}
                      {autoSaveStatus === 'saved' && (
                        <span className="text-[10px] text-green-500 flex items-center gap-1"><Check className="h-3 w-3" /> تم الحفظ تلقائياً</span>
                      )}
                    </div>
                    <div className="space-y-2.5">
                      <div>
                        <label className="text-[10px] font-medium text-gray-500 block mb-1">الاسم</label>
                        <div className="relative">
                          <User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full h-10 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-xs pr-10 px-3 dark:text-white" />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-medium text-gray-500 block mb-1">الهاتف</label>
                        <div className="relative">
                          <Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <input value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" className="w-full h-10 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-xs pr-10 px-3 dark:text-white" />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-medium text-gray-500 block mb-1">البريد الإلكتروني</label>
                        <div className="relative">
                          <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <input value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" className="w-full h-10 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-xs pr-10 px-3 dark:text-white" />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setEditing(true)} className="w-full h-11 rounded-xl bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white text-xs font-bold flex items-center justify-center gap-2 hover:bg-gray-100 dark:hover:bg-slate-700 transition-all">
                    <Pencil className="h-4 w-4" /> تعديل الملف الشخصي
                  </button>
                )}

                {/* Password Section */}
                {showPwSection ? (
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2"><Lock className="h-4 w-4" /> تغيير كلمة المرور</h4>
                    <div className="space-y-2.5">
                      <div className="relative">
                        <label className="text-[10px] font-medium text-gray-500 block mb-1">كلمة المرور الحالية</label>
                        <input type={showCurrent ? 'text' : 'password'} value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} dir="ltr" placeholder="أدخل كلمة المرور الحالية"
                          className="w-full h-10 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-xs px-3 pr-10 dark:text-white" />
                        <button onClick={() => setShowCurrent(!showCurrent)} className="absolute left-3 top-8 text-gray-400">
                          {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="relative">
                          <label className="text-[10px] font-medium text-gray-500 block mb-1">الجديدة</label>
                          <input type={showNew ? 'text' : 'password'} value={newPw} onChange={(e) => setNewPw(e.target.value)} dir="ltr" placeholder="6 أحرف على الأقل"
                            className="w-full h-10 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-xs px-3 pr-10 dark:text-white" />
                          <button onClick={() => setShowNew(!showNew)} className="absolute left-3 top-8 text-gray-400">
                            {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        <div>
                          <label className="text-[10px] font-medium text-gray-500 block mb-1">تأكيد</label>
                          <input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} dir="ltr" placeholder="أعد الكتابة"
                            className="w-full h-10 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-xs px-3 dark:text-white" />
                        </div>
                      </div>
                      {newPw && confirmPw && newPw !== confirmPw && (
                        <div className="flex items-center gap-1.5 text-[10px] text-red-500"><AlertCircle className="h-3 w-3" /> غير متطابقة</div>
                      )}
                      {newPw && confirmPw && newPw === confirmPw && newPw.length >= 6 && (
                        <div className="flex items-center gap-1.5 text-[10px] text-green-500"><Check className="h-3 w-3" /> متطابقة</div>
                      )}
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setShowPwSection(true)} className="w-full h-11 rounded-xl bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white text-xs font-bold flex items-center justify-center gap-2 hover:bg-gray-100 dark:hover:bg-slate-700 transition-all">
                    <Lock className="h-4 w-4" /> تغيير كلمة المرور
                  </button>
                )}

                {/* Unified Save Settings Button */}
                {(editing || showPwSection) && (
                  <button onClick={handleSave} disabled={saving}
                    className="w-full h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50 disabled:hover:scale-100">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Settings className="h-4 w-4" />}
                    حفظ الإعدادات
                  </button>
                )}

                {/* Forgot Password */}
                <button onClick={() => { onClose(); router.push('/forgot-password'); }} className="w-full h-11 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 text-xs font-bold flex items-center justify-center gap-2 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all">
                  <Mail className="h-4 w-4" /> نسيت كلمة المرور؟
                </button>

                {/* Logout */}
                <button onClick={handleLogout} className="w-full h-11 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 text-xs font-bold flex items-center justify-center gap-2 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
                  <LogOut className="h-4 w-4" /> تسجيل الخروج
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
