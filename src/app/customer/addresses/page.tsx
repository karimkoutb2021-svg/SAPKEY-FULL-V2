'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MapPin, Plus, Pencil, Trash2, Home, Briefcase, Navigation, Loader2, Check, Star } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store/auth-store';
import toast from 'react-hot-toast';

const supabase = createClient();

const LABEL_ICONS: Record<string, any> = { المنزل: Home, العمل: Briefcase, أخرى: Navigation };
const LABEL_COLORS: Record<string, string> = { المنزل: 'from-emerald-500 to-green-600', العمل: 'from-blue-500 to-indigo-600', أخرى: 'from-violet-500 to-purple-600' };

export default function AddressesPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [addresses, setAddresses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ label: 'المنزل', full_name: '', phone: '', address_line1: '', address_line2: '', city: '', notes: '' });

  useEffect(() => {
    if (!isAuthenticated) { router.replace('/login'); return; }
    if (user?.role !== 'customer') { router.replace('/'); return; }
    loadAddresses();
    const ch = supabase.channel('addresses-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customer_addresses', filter: `customer_id=eq.${user.id}` }, () => loadAddresses())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  const loadAddresses = async () => {
    if (!user?.id) return;
    try {
      const { data } = await supabase.from('customer_addresses').select('*').eq('customer_id', user.id).order('is_default', { ascending: false }).order('created_at', { ascending: false });
      setAddresses(data || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  const openNew = () => { setEditingId(null); setForm({ label: 'المنزل', full_name: user?.name || '', phone: user?.phone || '', address_line1: '', address_line2: '', city: '', notes: '' }); setShowForm(true); };

  const openEdit = (addr: any) => { setEditingId(addr.id); setForm({ label: addr.label, full_name: addr.full_name || '', phone: addr.phone || '', address_line1: addr.address_line1, address_line2: addr.address_line2 || '', city: addr.city || '', notes: '' }); setShowForm(true); };

  const handleSave = async () => {
    if (!form.address_line1.trim()) { toast.error('العنوان مطلوب'); return; }
    try {
      const payload = { ...form, customer_id: user?.id };
      if (editingId) {
        await supabase.from('customer_addresses').update(payload).eq('id', editingId);
        toast.success('تم تحديث العنوان');
      } else {
        await supabase.from('customer_addresses').insert(payload);
        toast.success('تم إضافة العنوان');
      }
      setShowForm(false);
      loadAddresses();
    } catch { toast.error('فشل الحفظ'); }
  };

  const handleDelete = async (id: string) => {
    await supabase.from('customer_addresses').delete().eq('id', id);
    setAddresses(prev => prev.filter(a => a.id !== id));
    toast.success('تم حذف العنوان');
  };

  const setDefault = async (id: string) => {
    await supabase.from('customer_addresses').update({ is_default: true }).eq('id', id);
    await supabase.from('customer_addresses').update({ is_default: false }).neq('id', id).eq('customer_id', user?.id);
    loadAddresses();
    toast.success('تم تعيين العنوان الافتراضي');
  };

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-[#020617] dark:to-slate-950 flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-[#020617] dark:to-slate-950 pb-24">
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-slate-950/80 backdrop-blur-2xl border-b border-gray-100 dark:border-slate-800">
        <div className="max-w-4xl mx-auto px-4 h-12 flex items-center justify-between">
          <button onClick={() => router.back()} className="h-8 w-8 rounded-lg bg-gray-100 dark:bg-slate-800 flex items-center justify-center">
            <ArrowLeft className="h-4 w-4 text-gray-600 dark:text-gray-300" />
          </button>
          <h1 className="text-xs font-bold text-gray-900 dark:text-white">العناوين</h1>
          <button onClick={openNew} className="h-8 w-8 rounded-lg bg-emerald-500 flex items-center justify-center">
            <Plus className="h-4 w-4 text-white" />
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-4 space-y-3">
        {addresses.length === 0 ? (
          <div className="text-center py-20">
            <div className="h-20 w-20 rounded-full bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/20 dark:to-purple-900/20 flex items-center justify-center mx-auto mb-4">
              <MapPin className="h-10 w-10 text-violet-400" />
            </div>
            <p className="text-base font-bold text-gray-900 dark:text-white">لا توجد عناوين</p>
            <p className="text-xs text-gray-400 mt-1">أضف عنواناً لتوصيل طلباتك</p>
            <button onClick={openNew} className="mt-6 h-11 px-8 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-white text-xs font-bold hover:shadow-lg transition-all">
              إضافة عنوان
            </button>
          </div>
        ) : (
          <>
            {addresses.map((addr) => {
              const Icon = LABEL_ICONS[addr.label] || MapPin;
              const grad = LABEL_COLORS[addr.label] || 'from-gray-500 to-gray-600';
              return (
                <motion.div key={addr.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl border border-gray-100/50 dark:border-slate-800/50 p-4 relative">
                  {addr.is_default && (
                    <div className="absolute -top-2 -left-2 h-5 px-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[8px] font-bold flex items-center gap-0.5 shadow-lg">
                      <Star className="h-2.5 w-2.5 fill-white" /> افتراضي
                    </div>
                  )}
                  <div className="flex items-start gap-3">
                    <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center shrink-0`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-gray-900 dark:text-white">{addr.full_name || 'بدون اسم'}</p>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-500">{addr.label}</span>
                      </div>
                      <p className="text-[10px] text-gray-500 mt-0.5">{addr.phone}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{addr.address_line1}{addr.address_line2 ? `, ${addr.address_line2}` : ''}{addr.city ? ` - ${addr.city}` : ''}</p>
                    </div>
                    <div className="flex flex-col gap-1">
                      <button onClick={() => openEdit(addr)} className="h-7 w-7 rounded-lg bg-gray-50 dark:bg-slate-800 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-slate-700">
                        <Pencil className="h-3 w-3 text-gray-400" />
                      </button>
                      <button onClick={() => handleDelete(addr.id)} className="h-7 w-7 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center hover:bg-red-100">
                        <Trash2 className="h-3 w-3 text-red-400" />
                      </button>
                    </div>
                  </div>
                  {!addr.is_default && (
                    <button onClick={() => setDefault(addr.id)} className="mt-2 text-[9px] text-emerald-500 font-bold flex items-center gap-1 hover:underline">
                      <Check className="h-2.5 w-2.5" /> تعيين كافتراضي
                    </button>
                  )}
                </motion.div>
              );
            })}
          </>
        )}

        {/* Address Form Modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={() => setShowForm(false)}>
            <motion.div initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }} transition={{ type: 'spring', damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl rounded-b-none sm:rounded-3xl p-6 max-h-[85vh] overflow-y-auto">
              <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-4">{editingId ? 'تعديل العنوان' : 'إضافة عنوان جديد'}</h2>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-medium text-gray-400 block mb-1">تصنيف العنوان</label>
                  <div className="flex gap-2">
                    {['المنزل', 'العمل', 'أخرى'].map((l) => (
                      <button key={l} onClick={() => setForm({ ...form, label: l })}
                        className={`flex-1 h-10 rounded-xl text-xs font-bold border transition-all ${form.label === l ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600' : 'border-gray-100 dark:border-slate-700 text-gray-400'}`}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-medium text-gray-400 block mb-1">الاسم</label>
                    <input type="text" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                      className="w-full h-10 px-3.5 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700/50 text-xs" />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-gray-400 block mb-1">الهاتف</label>
                    <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="w-full h-10 px-3.5 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700/50 text-xs" dir="ltr" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-medium text-gray-400 block mb-1">العنوان</label>
                  <input type="text" value={form.address_line1} onChange={(e) => setForm({ ...form, address_line1: e.target.value })}
                    className="w-full h-10 px-3.5 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700/50 text-xs" placeholder="الشارع، المنطقة..." />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-medium text-gray-400 block mb-1">تفاصيل إضافية</label>
                    <input type="text" value={form.address_line2} onChange={(e) => setForm({ ...form, address_line2: e.target.value })}
                      className="w-full h-10 px-3.5 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700/50 text-xs" placeholder="بناية، شقة..." />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-gray-400 block mb-1">المدينة</label>
                    <input type="text" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}
                      className="w-full h-10 px-3.5 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700/50 text-xs" />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowForm(false)} className="flex-1 h-11 rounded-xl border border-gray-200 dark:border-slate-700 text-xs font-bold text-gray-500">إلغاء</button>
                <button onClick={handleSave} className="flex-1 h-11 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-white text-xs font-bold hover:shadow-lg transition-all">
                  {editingId ? 'تحديث' : 'إضافة'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
