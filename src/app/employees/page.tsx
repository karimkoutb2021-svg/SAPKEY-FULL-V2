'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RoleBadge } from '@/components/ui/role-badge';
import { createClient } from '@/lib/supabase/client';
import { formatDate, formatCurrency } from '@/lib/utils';
import { UserCog, Plus, Search, Shield, User, Clock, CheckCircle, Ban, Pencil, Loader2 } from 'lucide-react';
import type { UserRole, UserStatus } from '@/types';
import { ROLES } from '@/types';
import toast from 'react-hot-toast';

const supabase = createClient();

interface AppUser {
  id: string;
  full_name_ar: string;
  email: string;
  phone: string;
  role: UserRole;
  is_active: boolean;
  last_login?: string;
  created_at: string;
}

export default function EmployeesPage() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [adding, setAdding] = useState(false);
  const [newUser, setNewUser] = useState({ full_name_ar: '', email: '', phone: '', password: '', role: 'cashier' as UserRole });

  useEffect(() => {
    loadData();
    const channel = supabase.channel('users-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => loadData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  async function loadData() {
    try {
      const { data, error } = await supabase.from('users').select('id, email, full_name_ar, phone, role, created_at, is_active, last_login').order('created_at', { ascending: false }).limit(200);
      if (error) { console.error(error); return; }
      if (data) setUsers(data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }

  const filtered = users.filter((u) => {
    const ms = !search || (u.full_name_ar || '').includes(search) || (u.email || '').includes(search) || (u.phone || '').includes(search);
    const mr = roleFilter === 'all' || u.role === roleFilter;
    const mst = statusFilter === 'all' || (statusFilter === 'active' && u.is_active) || (statusFilter === 'inactive' && !u.is_active);
    return ms && mr && mst;
  });

  const formatTimeAgo = (timestamp?: string) => {
    if (!timestamp) return 'لم يسجل';
    const diff = Date.now() - new Date(timestamp).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 60) return `منذ ${mins} دقيقة`;
    if (hours < 24) return `منذ ${hours} ساعة`;
    return `منذ ${days} يوم`;
  };

  async function handleAddUser() {
    if (!newUser.full_name_ar || !newUser.email || !newUser.password) {
      toast.error('الاسم والبريد وكلمة المرور مطلوبة');
      return;
    }
    try {
      const { error } = await supabase.from('users').insert({
        full_name_ar: newUser.full_name_ar,
        email: newUser.email,
        phone: newUser.phone || null,
        password_hash: newUser.password,
        role: newUser.role,
        is_active: true,
      });
      if (error) { toast.error(error.message); return; }
      toast.success('تم إضافة المستخدم');
      setAdding(false);
      setNewUser({ full_name_ar: '', email: '', phone: '', password: '', role: 'cashier' });
      loadData();
    } catch { toast.error('فشل الإضافة'); }
  }

  async function handleToggleStatus(u: AppUser) {
    try {
      const { error } = await supabase.from('users').update({ is_active: !u.is_active }).eq('id', u.id);
      if (error) { toast.error(error.message); return; }
      toast.success(u.is_active ? 'تم التعطيل' : 'تم التفعيل');
      loadData();
    } catch { toast.error('فشل التحديث'); }
  }

  const activeRoles = Object.values(ROLES);
  let roleCount: Record<string, number> = {};
  users.forEach((u) => { roleCount[u.role] = (roleCount[u.role] || 0) + 1; });

  return (
    <div className="space-y-4 md:space-y-6 max-w-7xl mx-auto px-2 md:px-4" dir="rtl">
      <div className="flex items-center flex-wrap gap-2 justify-between">
        <div className="flex items-center gap-2">
          <UserCog className="h-5 w-5 text-primary" />
          <h1 className="text-lg md:text-2xl font-bold">إدارة الموظفين والصلاحيات</h1>
        </div>
        <button onClick={() => setAdding(true)}
          className="h-8 md:h-9 px-2.5 md:px-3 rounded-lg text-white text-[10px] md:text-xs flex items-center gap-1"
          style={{ backgroundColor: 'var(--primary, #22C55E)' }}>
          <Plus className="h-3 w-3 md:h-3.5 md:w-3.5" /> إضافة مستخدم
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-4">
            {(['admin', 'manager', 'cashier', 'warehouse', 'delivery'] as UserRole[]).map((role) => {
              const count = roleCount[role] || 0;
              const info = ROLES[role];
              return (
                <Card key={role} className={`cursor-pointer hover:border-primary transition-colors shadow-sm ${roleFilter === role ? 'ring-2 ring-primary' : ''}`}
                  onClick={() => setRoleFilter(roleFilter === role ? 'all' : role)}>
                  <CardContent className="p-3 md:p-4">
                    <p className="text-lg md:text-2xl font-bold">{count}</p>
                    <p className="text-[9px] md:text-xs text-muted-foreground">{info.labelAr}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card className="shadow-sm">
            <CardContent className="p-0">
              <div className="p-2 md:p-4 border-b space-y-2 md:space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex-1 relative min-w-[150px]">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
                    <input type="text" placeholder="بحث..."
                      className="w-full h-8 md:h-10 rounded-lg border pr-9 pl-3 text-[10px] md:text-sm"
                      value={search} onChange={(e) => setSearch(e.target.value)} />
                  </div>
                  <button onClick={() => setStatusFilter(statusFilter === 'active' ? 'all' : 'active')}
                    className={`h-7 md:h-9 px-2 md:px-3 rounded-lg text-[9px] md:text-xs border transition-all ${statusFilter === 'active' ? 'bg-foreground text-background' : 'hover:bg-accent'}`}>
                    <CheckCircle className="h-3 w-3 md:h-4 md:w-4 inline ml-1" />نشط
                  </button>
                  <button onClick={() => setStatusFilter(statusFilter === 'inactive' ? 'all' : 'inactive')}
                    className={`h-7 md:h-9 px-2 md:px-3 rounded-lg text-[9px] md:text-xs border transition-all ${statusFilter === 'inactive' ? 'bg-foreground text-background' : 'hover:bg-accent'}`}>
                    <Ban className="h-3 w-3 md:h-4 md:w-4 inline ml-1" />غير نشط
                  </button>
                </div>
                <div className="flex flex-wrap gap-1">
                  <button onClick={() => setRoleFilter('all')}
                    className={`px-2 py-0.5 md:px-2.5 md:py-1 rounded-full text-[9px] md:text-xs border transition-colors ${roleFilter === 'all' ? 'bg-foreground text-background border-foreground' : 'hover:bg-accent'}`}>الكل</button>
                  {activeRoles.map((r) => (
                    <button key={r.id} onClick={() => setRoleFilter(r.id)}
                      className={`px-2 py-0.5 md:px-2.5 md:py-1 rounded-full text-[9px] md:text-xs border transition-colors ${roleFilter === r.id ? 'bg-foreground text-background border-foreground' : 'hover:bg-accent'}`}>{r.labelAr}</button>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-[10px] md:text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-right p-2 md:p-3 font-medium text-muted-foreground">المستخدم</th>
                      <th className="text-right p-2 md:p-3 font-medium text-muted-foreground">الدور</th>
                      <th className="text-right p-2 md:p-3 font-medium text-muted-foreground">مستوى الصلاحية</th>
                      <th className="text-right p-2 md:p-3 font-medium text-muted-foreground">الحالة</th>
                      <th className="text-right p-2 md:p-3 font-medium text-muted-foreground">آخر نشاط</th>
                      <th className="text-center p-2 md:p-3 font-medium text-muted-foreground">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((u) => {
                      const roleInfo = ROLES[u.role];
                      return (
                        <tr key={u.id} className="border-b hover:bg-accent/50 transition-colors">
                          <td className="p-2 md:p-3">
                            <div className="flex items-center gap-1.5 md:gap-3">
                              <div className="h-7 w-7 md:h-9 md:w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                <User className="h-3 w-3 md:h-4 md:w-4 text-primary" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-[10px] md:text-sm font-medium truncate">{u.full_name_ar}</p>
                                <p className="text-[8px] md:text-xs text-muted-foreground truncate">{u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-2 md:p-3"><RoleBadge role={u.role} /></td>
                          <td className="p-2 md:p-3">
                            <div className="flex items-center gap-1 md:gap-2">
                              <div className="h-1.5 md:h-2 w-16 md:w-24 rounded-full bg-muted overflow-hidden">
                                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${roleInfo?.level ?? 0}%` }} />
                              </div>
                              <span className="text-[9px] md:text-xs text-muted-foreground">{roleInfo?.level ?? 0}</span>
                            </div>
                          </td>
                          <td className="p-2 md:p-3">
                            <Badge variant={u.is_active ? 'success' : 'secondary'} className="text-[9px] md:text-xs">
                              {u.is_active ? 'نشط' : 'غير نشط'}
                            </Badge>
                          </td>
                          <td className="p-2 md:p-3">
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span className="text-[9px] md:text-xs">{formatTimeAgo(u.last_login)}</span>
                            </div>
                          </td>
                          <td className="p-2 md:p-3">
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => toast.success('الصلاحيات قابلة للتعديل من مصفوفة الصلاحيات')} className="p-1 rounded-md hover:bg-accent" title="الصلاحيات">
                                <Shield className="h-3 w-3 md:h-4 md:w-4 text-blue-500" />
                              </button>
                              <button onClick={() => handleToggleStatus(u)} className="p-1 rounded-md hover:bg-accent" title={u.is_active ? 'تعطيل' : 'تفعيل'}>
                                {u.is_active ? <Ban className="h-3 w-3 md:h-4 md:w-4 text-amber-500" /> : <CheckCircle className="h-3 w-3 md:h-4 md:w-4 text-emerald-500" />}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="p-2 md:p-4 border-t text-[9px] md:text-xs text-muted-foreground">
                إجمالي {filtered.length} مستخدم
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader><CardTitle className="text-sm md:text-lg">مصفوفة الصلاحيات حسب الدور</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4">
                {activeRoles.map((role) => (
                  <div key={role.id} className="p-3 md:p-4 rounded-lg border">
                    <div className="flex items-center gap-1.5 md:gap-2 mb-1 md:mb-2">
                      <RoleBadge role={role.id} />
                      <span className="text-[9px] md:text-xs text-muted-foreground">مستوى {role.level}</span>
                    </div>
                    <p className="text-[9px] md:text-xs text-muted-foreground mb-1 md:mb-2">{role.descriptionAr}</p>
                    <div className="text-[9px] md:text-xs text-muted-foreground space-y-0.5 md:space-y-1">
                      <span className="font-medium text-foreground">الصلاحيات: </span>
                      {(() => {
                        const perms: string[] = [];
                        if (role.level >= 100) perms.push('الوصول الكامل');
                        if (role.level >= 80) perms.push('إدارة المتجر');
                        if (role.level >= 70) perms.push('مالية ومحاسبة');
                        if (role.level >= 50) perms.push('مبيعات ومخزون');
                        if (role.level >= 40) perms.push('توصيل');
                        if (role.level >= 30) perms.push('توريد');
                        if (role.level >= 10) perms.push('عرض المنتجات');
                        return perms.join('، ');
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Add User Modal */}
      {adding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setAdding(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 md:p-6 max-w-sm w-full mx-4 shadow-2xl border" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm md:text-base font-bold">إضافة مستخدم جديد</h3>
              <button onClick={() => setAdding(false)}><span className="text-gray-400 text-lg">✕</span></button>
            </div>
            <div className="space-y-2.5 md:space-y-3">
              <div><label className="text-[10px] md:text-xs font-medium text-muted-foreground block mb-1">الاسم بالعربي</label>
                <input type="text" value={newUser.full_name_ar} onChange={(e) => setNewUser({ ...newUser, full_name_ar: e.target.value })}
                  className="w-full h-8 md:h-9 rounded-lg border text-[10px] md:text-sm px-3" placeholder="الاسم الكامل" /></div>
              <div className="grid grid-cols-2 gap-2 md:gap-3">
                <div><label className="text-[10px] md:text-xs font-medium text-muted-foreground block mb-1">البريد</label>
                  <input type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    className="w-full h-8 md:h-9 rounded-lg border text-[10px] md:text-sm px-3" placeholder="email@..." /></div>
                <div><label className="text-[10px] md:text-xs font-medium text-muted-foreground block mb-1">كلمة المرور</label>
                  <input type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    className="w-full h-8 md:h-9 rounded-lg border text-[10px] md:text-sm px-3" /></div>
              </div>
              <div className="grid grid-cols-2 gap-2 md:gap-3">
                <div><label className="text-[10px] md:text-xs font-medium text-muted-foreground block mb-1">الهاتف</label>
                  <input type="text" value={newUser.phone} onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                    className="w-full h-8 md:h-9 rounded-lg border text-[10px] md:text-sm px-3" placeholder="012..." /></div>
                <div><label className="text-[10px] md:text-xs font-medium text-muted-foreground block mb-1">الدور</label>
                  <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value as UserRole })}
                    className="w-full h-8 md:h-9 rounded-lg border text-[10px] md:text-sm px-3">
                    {activeRoles.map((r) => (<option key={r.id} value={r.id}>{r.labelAr}</option>))}
                  </select></div>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setAdding(false)} className="flex-1 h-8 md:h-9 rounded-lg border text-[10px] md:text-xs font-medium hover:bg-accent">إلغاء</button>
                <button onClick={handleAddUser}
                  className="flex-1 h-8 md:h-9 rounded-lg text-white text-[10px] md:text-xs font-medium"
                  style={{ backgroundColor: 'var(--primary, #22C55E)' }}>إضافة</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
