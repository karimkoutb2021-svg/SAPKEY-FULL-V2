'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth-store';
import { categoryService, type ProductCategory } from '@/lib/supabase/services/categories';
import { uploadImage, compressImage, IMAGE_SIZES, deleteImage } from '@/lib/supabase/storage';
import { Plus, Edit2, Trash2, Image as ImageIcon, Upload, Loader2, Save, X, ChevronUp, ChevronDown, Eye, EyeOff } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

const supabase = createClient();

export default function AdminCategoriesPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: categories = [], isLoading: loading } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: async () => {
      const { data } = await categoryService.getAll();
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<ProductCategory | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name_ar: '',
    name_en: '',
    slug: '',
    description: '',
    image_url: '',
    parent_id: '',
    sort_order: 0,
    is_active: true,
  });

  useEffect(() => {
    const ch = supabase.channel('admin-product_categories')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_categories' }, (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          queryClient.setQueryData(['admin-categories'], (old: ProductCategory[] = []) => {
             const idx = old.findIndex(c => c.id === (payload.new as any).id);
             if (idx >= 0) {
               const updated = [...old];
               updated[idx] = { ...updated[idx], ...(payload.new as any) } as ProductCategory;
               return updated.sort((a,b) => a.sort_order - b.sort_order);
             }
             return [...old, payload.new as ProductCategory].sort((a,b) => a.sort_order - b.sort_order);
          });
        } else if (payload.eventType === 'DELETE') {
          queryClient.setQueryData(['admin-categories'], (old: ProductCategory[] = []) => {
             return old.filter(c => c.id !== payload.old.id);
          });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [queryClient]);

  function openCreate() {
    setEditing(null);
    setForm({ name_ar: '', name_en: '', slug: '', description: '', image_url: '', parent_id: '', sort_order: categories.length, is_active: true });
    setShowForm(true);
  }

  function openEdit(cat: ProductCategory) {
    setEditing(cat);
    setForm({
      name_ar: cat.name_ar,
      name_en: cat.name_en || '',
      slug: cat.slug || '',
      description: cat.description || '',
      image_url: cat.image_url || '',
      parent_id: cat.parent_id || '',
      sort_order: cat.sort_order,
      is_active: cat.is_active,
    });
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.name_ar.trim()) {
      toast.error('اسم التصنيف مطلوب');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name_ar: form.name_ar,
        name_en: form.name_en || undefined,
        slug: form.slug || form.name_ar.toLowerCase().replace(/\s+/g, '-'),
        description: form.description || undefined,
        image_url: form.image_url || undefined,
        parent_id: form.parent_id || undefined,
        sort_order: form.sort_order,
        is_active: form.is_active,
      };

      if (editing) {
        await categoryService.update(editing.id, payload);
        toast.success('تم تحديث التصنيف');
      } else {
        await categoryService.create(payload);
        toast.success('تم إنشاء التصنيف');
      }
      setShowForm(false);
      // Wait for realtime to update or invalidate cache
    } catch (err: any) {
      toast.error('خطأ: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('هل تريد حذف هذا التصنيف؟')) return;
    try {
      await categoryService.delete(id);
      toast.success('تم حذف التصنيف');
    } catch (err: any) {
      toast.error('خطأ: ' + err.message);
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const compressed = await compressImage(file, IMAGE_SIZES.category.width, IMAGE_SIZES.category.height);
      const url = await uploadImage(compressed, 'categories');
      setForm((f) => ({ ...f, image_url: url }));
      toast.success('تم رفع الصورة');
    } catch (err: any) {
      toast.error('فشل رفع الصورة: ' + err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleRemoveImage() {
    if (form.image_url) {
      try { await deleteImage(form.image_url); } catch {}
    }
    setForm((f) => ({ ...f, image_url: '' }));
  }

  async function moveUp(index: number) {
    if (index === 0) return;
    const items = [...categories];
    [items[index], items[index - 1]] = [items[index - 1], items[index]];
    items[index].sort_order = index;
    items[index - 1].sort_order = index - 1;
    queryClient.setQueryData(['admin-categories'], items);
    await categoryService.reorder([
      { id: items[index].id, sort_order: index },
      { id: items[index - 1].id, sort_order: index - 1 },
    ]);
  }

  async function moveDown(index: number) {
    if (index === categories.length - 1) return;
    const items = [...categories];
    [items[index], items[index + 1]] = [items[index + 1], items[index]];
    items[index].sort_order = index;
    items[index + 1].sort_order = index + 1;
    queryClient.setQueryData(['admin-categories'], items);
    await categoryService.reorder([
      { id: items[index].id, sort_order: index },
      { id: items[index + 1].id, sort_order: index + 1 },
    ]);
  }

  const parentOptions = categories.filter((c) => c.id !== editing?.id);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 md:p-8" dir="rtl">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">📂 إدارة التصنيفات</h1>
            <p className="text-gray-500 mt-1">إضافة وتعديل تصنيفات المنتجات</p>
          </div>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all">
            <Plus className="w-4 h-4" />
            <span>إضافة تصنيف</span>
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
        ) : (
          <div className="grid gap-4">
            {categories.map((cat, i) => (
              <div key={cat.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
                <div className="flex flex-col gap-1">
                  <button onClick={() => moveUp(i)} disabled={i === 0} className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"><ChevronUp className="w-4 h-4" /></button>
                  <button onClick={() => moveDown(i)} disabled={i === categories.length - 1} className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"><ChevronDown className="w-4 h-4" /></button>
                </div>

                <div className="w-16 h-12 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 flex items-center justify-center">
                  <img loading="lazy" src="/category-placeholder.svg" alt={cat.name_ar} className="w-full h-full object-cover" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{cat.name_ar}</h3>
                    {cat.name_en && <span className="text-sm text-gray-400">{cat.name_en}</span>}
                    {!cat.is_active && <span className="text-xs px-2 py-0.5 bg-red-100 text-red-600 rounded-full">معطل</span>}
                  </div>
                  {cat.slug && <p className="text-xs text-gray-400 mt-0.5">/{cat.slug}</p>}
                </div>

                <div className="flex items-center gap-2">
                  <button onClick={() => openEdit(cat)} className="p-2 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(cat.id)} className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
            {categories.length === 0 && (
              <div className="text-center py-20 bg-white rounded-2xl">
                <p className="text-gray-400 text-lg">لا توجد تصنيفات بعد</p>
                <button onClick={openCreate} className="mt-4 text-blue-600 hover:underline">أضف أول تصنيف</button>
              </div>
            )}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-lg font-bold">{editing ? 'تعديل التصنيف' : 'إضافة تصنيف جديد'}</h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الاسم بالعربية *</label>
                <input value={form.name_ar} onChange={(e) => setForm((f) => ({ ...f, name_ar: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="مثال: ألبان وأجبان" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الاسم بالإنجليزية</label>
                <input value={form.name_en} onChange={(e) => setForm((f) => ({ ...f, name_en: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="e.g. Dairy & Cheese" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الرابط (Slug)</label>
                <input value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="dairy-cheese" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الوصف</label>
                <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="وصف مختصر للتصنيف" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">التصنيف الأب</label>
                <select value={form.parent_id} onChange={(e) => setForm((f) => ({ ...f, parent_id: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="">بدون (تصنيف رئيسي)</option>
                  {parentOptions.map((c) => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الصورة</label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-16 rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center flex-shrink-0">
                    {form.image_url ? (
                      <img loading="lazy" src={form.image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-gray-300" />
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 disabled:opacity-50 text-sm">
                      {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      {uploading ? 'جاري الرفع...' : 'رفع صورة (800×800 بصيغة WebP)'}
                    </button>
                    {form.image_url && (
                      <button type="button" onClick={handleRemoveImage} className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 text-sm">
                        <Trash2 className="w-4 h-4" /> إزالة
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button onClick={() => setForm((f) => ({ ...f, is_active: !f.is_active }))} className={`relative w-11 h-6 rounded-full transition-colors ${form.is_active ? 'bg-blue-600' : 'bg-gray-300'}`}>
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.is_active ? 'translate-x-5' : ''}`} />
                </button>
                <span className="text-sm text-gray-700">{form.is_active ? 'نشط' : 'معطل'}</span>
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 p-4 border-t border-gray-100 flex gap-3 rounded-b-2xl">
              <button onClick={handleSave} disabled={saving} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-lg disabled:opacity-50">
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

