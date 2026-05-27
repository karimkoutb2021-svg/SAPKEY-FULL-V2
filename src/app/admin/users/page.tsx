'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth-store';
import { createClient } from '@/lib/supabase/client';
import {
  Users, Plus, Trash2, Mail, Phone, User, Save, X, Loader2,
  Search, Copy, Check, KeyRound, Pencil,
} from 'lucide-react';
import toast from 'react-hot-toast';

const supabase = createClient();

const ROLES = [
  { value: 'manager', label: 'مدير', color: 'bg-blue-500', email: 'manager@sapkey.com' },
  { value: 'cashier', label: 'كاشير', color: 'bg-amber-500', email: 'cashier@sapkey.com' },
  { value: 'customer', label: 'عميل', color: 'bg-green-500', email: 'customer@sapkey.com' },
];

const roleLabels: Record<string, string> = {
  admin: 'مطور',
  manager: 'مدير',
  cashier: 'كاشير',
  customer: 'عميل',
};

export default function AdminUsersPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState('cashier');
  const [searchTerm, setSearchTerm] = useState('');

  const [editingEmail, setEditingEmail] = useState<{ id: string; email: string } | null>(null);
  const [savingEmail, setSavingEmail] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) { router.replace('/login'); return; }
    if (user?.role !== 'admin' && user?.role !== 'manager') {
      toast.error('هذه الصفحة متاحة للمدير والمطور فقط');
      router.replace('/dashboard');
    }
  }, [isAuthenticated, user, router]);

  useEffect(() => { loadUsers(); }, []);

  useEffect(() => {
    const ch = supabase.channel('admin-users')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
        loadUsers();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (data.success) setUsers(data.users || []);
    } catch { toast.error('فشل تحميل المستخدمين'); }
    setLoading(false);
  };

  const handleCreateUser = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName || roleLabels[newRole],
          nameAr: newName || roleLabels[newRole],
          phone: newPhone,
          role: newRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error?.includes('مسجل بالفعل')) {
          toast.error(`${roleLabels[newRole]} موجود بالفعل — استخدم زر إعادة تعيين كلمة المرور`);
        } else {
          toast.error(data.error || 'فشل إنشاء المستخدم');
        }
        return;
      }
      toast.success(`تم إنشاء ${roleLabels[newRole]} — كلمة المرور: 123456`);
      setNewName(''); setNewPhone('');
      setShowForm(false);
      loadUsers();
    } catch { toast.error('فشل الاتصال بالخادم'); }
    setSaving(false);
  };

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (userEmail === 'sapkeyglobal@gmail.com') { toast.error('لا يمكن حذف حساب المطور'); return; }
    if (!confirm(`هل تريد حذف ${userEmail}؟`)) return;
    try {
      const res = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'فشل الحذف'); return; }
      toast.success('تم حذف المستخدم');
      loadUsers();
    } catch { toast.error('فشل الحذف'); }
  };

  const handleResetPassword = async (userId: string, userName: string) => {
    if (!confirm(`هل تريد إعادة تعيين كلمة مرور ${userName} إلى 123456؟`)) return;
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action: 'reset-password' }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'فشل إعادة التعيين'); return; }
      toast.success('تم إعادة تعيين كلمة المرور إلى 123456');
    } catch { toast.error('فشل إعادة التعيين'); }
  };

  const handleUpdateEmail = async (userId: string, newEmail: string) => {
    if (!newEmail || !newEmail.includes('@')) { toast.error('بريد غير صالح'); return; }
    setSavingEmail(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action: 'update-email', newEmail }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'فشل تحديث البريد'); return; }
      toast.success('تم تحديث البريد الإلكتروني');
      setEditingEmail(null);
      loadUsers();
    } catch { toast.error('فشل تحديث البريد'); }
    setSavingEmail(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('تم النسخ');
  };

  const filteredUsers = users.filter((u) =>
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.full_name_ar?.includes(searchTerm) ||
    u.full_name_en?.includes(searchTerm)
  );

  return (
    <div dir="rtl" className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
            <Users className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">إدارة المستخدمين</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">إنشاء وحذف حسابات الموظفين والعملاء</p>
          </div>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="h-9 px-4 rounded-xl bg-indigo-500 text-white text-xs font-medium flex items-center gap-1.5 hover:bg-indigo-600 transition-all">
          <Plus className="h-3.5 w-3.5" /> مستخدم جديد
        </button>
      </div>

      {/* Create User Form */}
      {showForm && (
        <div className="rounded-2xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/20 p-5 space-y-4">
          <h3 className="text-sm font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
            <Plus className="h-4 w-4" /> إنشاء مستخدم جديد
          </h3>

          <div className="rounded-xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900 p-3 space-y-2">
            <p className="text-[10px] font-bold text-gray-900 dark:text-white">البريد الثابت لكل دور:</p>
            {ROLES.map((r) => (
              <div key={r.value} className="flex items-center justify-between text-xs">
                <span className="text-gray-500">{r.label}</span>
                <span className="font-mono text-gray-900 dark:text-white" dir="ltr">{r.email}</span>
              </div>
            ))}
            <p className="text-[10px] text-gray-400">كلمة المرور الافتراضية: <span className="font-mono font-bold text-gray-900 dark:text-white">123456</span></p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-medium text-gray-500 block mb-1">الاسم</label>
              <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="اختياري"
                className="w-full h-10 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs px-3 dark:text-white" />
            </div>
            <div>
              <label className="text-[10px] font-medium text-gray-500 block mb-1">الهاتف</label>
              <input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} dir="ltr" placeholder="010xxxxxxxx"
                className="w-full h-10 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs px-3 dark:text-white" />
            </div>
            <div>
              <label className="text-[10px] font-medium text-gray-500 block mb-1">الدور</label>
              <select value={newRole} onChange={(e) => setNewRole(e.target.value)}
                className="w-full h-10 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs px-3 dark:text-white">
                {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreateUser} disabled={saving}
              className="h-10 px-6 rounded-xl bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? 'جاري الإنشاء...' : 'إنشاء المستخدم'}
            </button>
            <button onClick={() => setShowForm(false)} className="h-10 px-4 rounded-xl border border-gray-200 dark:border-slate-700 text-xs">إلغاء</button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="ابحث بالاسم أو البريد..."
          className="w-full h-10 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs pr-10 px-3 dark:text-white" />
      </div>

      {/* Users List */}
      <div className="space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">لا يوجد مستخدمين</p>
          </div>
        ) : (
          filteredUsers.map((u) => {
            const roleColor = ROLES.find((r) => r.value === u.role)?.color || 'bg-gray-500';
            const isEditingThis = editingEmail?.id === u.id;
            return (
              <div key={u.id} className="rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`h-10 w-10 rounded-xl ${roleColor} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
                    {u.full_name_ar?.charAt(0) || u.email?.charAt(0) || '?'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{u.full_name_ar || u.full_name_en || u.email}</p>
                    {isEditingThis && editingEmail ? (
                      <div className="flex items-center gap-1.5 mt-1">
                        <input value={editingEmail.email} onChange={(e) => setEditingEmail({ id: u.id, email: e.target.value })} dir="ltr"
                          className="h-7 w-44 rounded-lg border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-800 text-[10px] font-mono px-2 dark:text-white" />
                        <button onClick={() => handleUpdateEmail(u.id, editingEmail.email)} disabled={savingEmail}
                          className="h-7 w-7 rounded-lg bg-indigo-500 text-white flex items-center justify-center disabled:opacity-50">
                          {savingEmail ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                        </button>
                        <button onClick={() => setEditingEmail(null)}
                          className="h-7 w-7 rounded-lg border border-gray-200 dark:border-slate-700 flex items-center justify-center">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button onClick={() => copyToClipboard(u.email)}
                          className="text-[10px] text-gray-400 font-mono flex items-center gap-1 hover:text-gray-600 dark:hover:text-gray-300" dir="ltr">
                          {u.email}
                        </button>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full text-white ${roleColor}`}>{roleLabels[u.role] || u.role}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {u.email !== 'sapkeyglobal@gmail.com' && (
                    <>
                      <button onClick={() => setEditingEmail({ id: u.id, email: u.email })}
                        className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-500 flex items-center justify-center hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all"
                        title="تعديل البريد">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => handleResetPassword(u.id, u.full_name_ar || u.email)}
                        className="h-8 w-8 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-500 flex items-center justify-center hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-all"
                        title="إعادة تعيين كلمة المرور">
                        <KeyRound className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDeleteUser(u.id, u.email)}
                        className="h-8 w-8 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500 flex items-center justify-center hover:bg-red-100 dark:hover:bg-red-900/30 transition-all"
                        title="حذف">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
