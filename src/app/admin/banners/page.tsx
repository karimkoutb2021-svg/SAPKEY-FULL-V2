'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth-store';
import { bannerService, type StorefrontBanner } from '@/lib/supabase/services/categories';
import { uploadImage, compressImage, IMAGE_SIZES, deleteImage } from '@/lib/supabase/storage';
import { Plus, Edit2, Trash2, Image as ImageIcon, Upload, Loader2, Save, X, ChevronUp, ChevronDown } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

const supabase = createClient();

const POSITIONS = [
  { value: 'hero', label: '🖼️ البانر الرئيسي' },
  { value: 'mid', label: '📌 بانر أوسط' },
  { value: 'bottom', label: '📎 بانر سفلي' },
];

const LINK_TYPES = [
  { value: 'product', label: 'منتج' },
  { value: 'category', label: 'تصنيف' },
  { value: 'url', label: 'رابط خارجي' },
  { value: 'none', label: 'بدون رابط' },
];

export default function AdminBannersPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [banners, setBanners] = useState<StorefrontBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<StorefrontBanner | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    title_ar: '',
    title_en: '',
    subtitle_ar: '',
    subtitle_en: '',
    image_url: '',
    link_url: '',
    link_type: 'none',
    target_id: '',
    position: 'hero',
    sort_order: 0,
    is_active: true,
    start_date: '',
    end_date: '',
  });

  useEffect(() => {
    loadBanners();
  }, []);

  useEffect(() => {
    const ch = supabase.channel('admin-storefront_banners')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'storefront_banners' }, () => {
        loadBanners();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  async function loadBanners() {
    try {
      setLoading(true);
      const { data } = await bannerService.getAll();
      setBanners(data || []);
    } catch (err: any) {
      toast.error('فشل تحميل البانرات: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditing(null);
    setForm({ title_ar: '', title_en: '', subtitle_ar: '', subtitle_en: '', image_url: '', link_url: '', link_type: 'none', target_id: '', position: 'hero', sort_order: banners.length, is_active: true, start_date: '', end_date: '' });
    setShowForm(true);
  }

  function openEdit(b: StorefrontBanner) {
    setEditing(b);
    setForm({
      title_ar: b.title_ar,
      title_en: b.title_en || '',
      subtitle_ar: b.subtitle_ar || '',
      subtitle_en: b.subtitle_en || '',
      image_url: b.image_url,
      link_url: b.link_url || '',
      link_type: b.link_type,
      target_id: b.target_id || '',
      position: b.position,
      sort_order: b.sort_order,
      is_active: b.is_active,
      start_date: b.start_date ? b.start_date.slice(0, 16) : '',
      end_date: b.end_date ? b.end_date.slice(0, 16) : '',
    });
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.title_ar.trim() || !form.image_url) {
      toast.error('العنوان والصورة مطلوبان');
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        title_ar: form.title_ar,
        title_en: form.title_en || undefined,
        subtitle_ar: form.subtitle_ar || undefined,
        subtitle_en: form.subtitle_en || undefined,
        image_url: form.image_url,
        link_url: form.link_url || undefined,
        link_type: form.link_type,
        target_id: form.target_id || undefined,
        position: form.position,
        sort_order: form.sort_order,
        is_active: form.is_active,
      };
      if (form.start_date) payload.start_date = new Date(form.start_date).toISOString();
      if (form.end_date) payload.end_date = new Date(form.end_date).toISOString();

      if (editing) {
        await bannerService.update(editing.id, payload);
        toast.success('تم تحديث البانر');
      } else {
        await bannerService.create(payload);
        toast.success('تم إنشاء البانر');
      }
      setShowForm(false);
      await loadBanners();
    } catch (err: any) {
      toast.error('خطأ: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('هل تريد حذف هذا البانر؟')) return;
    try {
      const banner = banners.find((b) => b.id === id);
      if (banner?.image_url) { try { await deleteImage(banner.image_url); } catch {} }
      await bannerService.delete(id);
      toast.success('تم حذف البانر');
      await loadBanners();
    } catch (err: any) {
      toast.error('خطأ: ' + err.message);
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const compressed = await compressImage(file, IMAGE_SIZES.banner.width, IMAGE_SIZES.banner.height);
      const url = await uploadImage(compressed, 'banners');
      setForm((f) => ({ ...f, image_url: url }));
      toast.success('تم رفع الصورة');
    } catch (err: any) {
      toast.error('فشل رفع الصورة: ' + err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function moveUp(index: number) {
    if (index === 0) return;
    const items = [...banners];
    [items[index], items[index - 1]] = [items[index - 1], items[index]];
    items[index].sort_order = index;
    items[index - 1].sort_order = index - 1;
    setBanners(items);
    await bannerService.reorder([
      { id: items[index].id, sort_order: index },
      { id: items[index - 1].id, sort_order: index - 1 },
    ]);
  }

  async function moveDown(index: number) {
    if (index === banners.length - 1) return;
    const items = [...banners];
    [items[index], items[index + 1]] = [items[index + 1], items[index]];
    items[index].sort_order = index;
    items[index + 1].sort_order = index + 1;
    setBanners(items);
    await bannerService.reorder([
      { id: items[index].id, sort_order: index },
      { id: items[index + 1].id, sort_order: index + 1 },
    ]);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-pink-50 p-4 md:p-8" dir="rtl">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">🎨 إدارة البانرات</h1>
            <p className="text-gray-500 mt-1">إدارة بانرات الواجهة والعروض</p>
          </div>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all">
            <Plus className="w-4 h-4" />
            <span>إضافة بانر</span>
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-purple-600" /></div>
        ) : (
          <div className="grid gap-4">
            {banners.map((b, i) => (
              <div key={b.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                <div className="flex items-stretch">
                  <div className="w-48 h-28 flex-shrink-0 bg-gray-100 relative">
                    {b.image_url ? (
                      <img loading="lazy" src={b.image_url} alt={b.title_ar} className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex items-center justify-center h-full"><ImageIcon className="w-8 h-8 text-gray-300" /></div>
                    )}
                    {!b.is_active && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><span className="text-white text-sm font-medium">معطل</span></div>}
                  </div>
                  <div className="flex-1 p-4 flex items-center">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{b.title_ar}</h3>
                        {b.title_en && <span className="text-sm text-gray-400">{b.title_en}</span>}
                      </div>
                      {b.subtitle_ar && <p className="text-sm text-gray-500 mt-1 truncate">{b.subtitle_ar}</p>}
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                        <span>{POSITIONS.find((p) => p.value === b.position)?.label || b.position}</span>
                        {b.link_type !== 'none' && <span>🔗 {LINK_TYPES.find((l) => l.value === b.link_type)?.label}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => moveUp(i)} disabled={i === 0} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30"><ChevronUp className="w-4 h-4" /></button>
                      <button onClick={() => moveDown(i)} disabled={i === banners.length - 1} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30"><ChevronDown className="w-4 h-4" /></button>
                      <button onClick={() => openEdit(b)} className="p-1.5 rounded hover:bg-blue-50 text-blue-600"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(b.id)} className="p-1.5 rounded hover:bg-red-50 text-red-500"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {banners.length === 0 && (
              <div className="text-center py-20 bg-white rounded-2xl">
                <p className="text-gray-400 text-lg">لا توجد بانرات بعد</p>
                <button onClick={openCreate} className="mt-4 text-purple-600 hover:underline">أضف أول بانر</button>
              </div>
            )}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-lg font-bold">{editing ? 'تعديل البانر' : 'إضافة بانر جديد'}</h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">العنوان بالعربية *</label>
                <input value={form.title_ar} onChange={(e) => setForm((f) => ({ ...f, title_ar: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent" placeholder="عنوان البانر" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">العنوان بالإنجليزية</label>
                <input value={form.title_en} onChange={(e) => setForm((f) => ({ ...f, title_en: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent" placeholder="Banner title" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الوصف المختصر</label>
                <input value={form.subtitle_ar} onChange={(e) => setForm((f) => ({ ...f, subtitle_ar: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent" placeholder="وصف مختصر" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الصورة *</label>
                <div className="flex items-center gap-4">
                  <div className="w-32 h-16 rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center flex-shrink-0">
                    {form.image_url ? (
                      <img loading="lazy" src={form.image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-gray-300" />
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 disabled:opacity-50 text-sm">
                      {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      {uploading ? 'جاري الرفع...' : 'رفع صورة (1920×800 بصيغة WebP 4K)'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الموقع</label>
                  <select value={form.position} onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                    {POSITIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">نوع الرابط</label>
                  <select value={form.link_type} onChange={(e) => setForm((f) => ({ ...f, link_type: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                    {LINK_TYPES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                  </select>
                </div>
              </div>

              {form.link_type !== 'none' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الرابط</label>
                  <input value={form.link_url} onChange={(e) => setForm((f) => ({ ...f, link_url: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent" placeholder="/shop/product/xxx أو https://..." />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ البداية</label>
                  <input type="datetime-local" value={form.start_date} onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ النهاية</label>
                  <input type="datetime-local" value={form.end_date} onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent" />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button onClick={() => setForm((f) => ({ ...f, is_active: !f.is_active }))} className={`relative w-11 h-6 rounded-full transition-colors ${form.is_active ? 'bg-purple-600' : 'bg-gray-300'}`}>
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.is_active ? 'translate-x-5' : ''}`} />
                </button>
                <span className="text-sm text-gray-700">{form.is_active ? 'نشط' : 'معطل'}</span>
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 p-4 border-t border-gray-100 flex gap-3 rounded-b-2xl">
              <button onClick={handleSave} disabled={saving} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:shadow-lg disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'جاري الحفظ...' : 'حفظ'}
              </button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

