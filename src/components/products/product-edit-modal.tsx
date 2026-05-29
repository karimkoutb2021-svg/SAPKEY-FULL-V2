'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, ImageIcon, Package, Settings, Database, Check, Tag, Barcode, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { uploadImage } from '@/lib/cloudinary';
import toast from 'react-hot-toast';

interface ProductEditModalProps {
  product: any;
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: any) => void;
}

export function ProductEditModal({ product, isOpen, onClose, onSave }: ProductEditModalProps) {
  const [editProduct, setEditProduct] = useState<any>(product || {});
  const [activeTab, setActiveTab] = useState<'basic' | 'stock' | 'settings'>('basic');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen || !product) return null;

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      toast.loading('جاري رفع الصورة...');
      const cloudinaryUrl = await uploadImage(file, 'products');
      setEditProduct({ ...editProduct, image_url: cloudinaryUrl });
      toast.dismiss();
      toast.success('تم رفع الصورة بنجاح');
    } catch {
      toast.dismiss();
      toast.error('فشل رفع الصورة');
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = () => {
    onSave(editProduct);
  };

  const tabs = [
    { id: 'basic', label: 'البيانات الأساسية', icon: Tag },
    { id: 'stock', label: 'المخزون والتسعير', icon: Database },
    { id: 'settings', label: 'إعدادات متقدمة', icon: Settings },
  ] as const;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }} 
          className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
          onClick={onClose} 
        />
        
        <motion.div 
          initial={{ y: 50, opacity: 0, scale: 0.95 }} 
          animate={{ y: 0, opacity: 1, scale: 1 }} 
          exit={{ y: 20, opacity: 0, scale: 0.95 }} 
          transition={{ type: "spring", bounce: 0.3, duration: 0.5 }}
          className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-gray-100 dark:border-slate-800 flex flex-col max-h-[90vh]" 
          dir="rtl"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Package className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">تعديل المنتج</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-mono mt-0.5">{editProduct.barcode}</p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="h-10 w-10 rounded-full bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 flex items-center justify-center text-gray-500 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex p-4 gap-2 border-b border-gray-100 dark:border-slate-800 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap",
                  activeTab === tab.id 
                    ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-lg"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-800 dark:text-gray-400 dark:hover:bg-slate-700"
                )}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto flex-1">
            <div className="space-y-6">
              
              {activeTab === 'basic' && (
                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                  {/* Image Upload */}
                  <div className="flex items-center gap-6">
                    <div 
                      className="h-28 w-28 rounded-3xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden relative group cursor-pointer border-2 border-dashed border-gray-200 dark:border-slate-700"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {editProduct.image_url || editProduct.image ? (
                        <img loading="lazy" src={editProduct.image_url || editProduct.image} className="h-full w-full object-cover" />
                      ) : (
                        <ImageIcon className="h-8 w-8 text-gray-400" />
                      )}
                      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                        <Upload className="h-6 w-6 text-white mb-1" />
                        <span className="text-[10px] text-white font-medium">تغيير الصورة</span>
                      </div>
                    </div>
                    <div className="flex-1 space-y-1">
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white">صورة المنتج</h4>
                      <p className="text-xs text-gray-500 max-w-sm">ارفع صورة واضحة للمنتج بخلفية بيضاء أو شفافة. (يفضل مقاس 800×800 بصيغة WebP 4K لضمان الخفة والجودة).</p>
                      <button onClick={() => fileInputRef.current?.click()} className="mt-2 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline">
                        استعراض الملفات...
                      </button>
                    </div>
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUploadImage} />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-700 dark:text-gray-300">اسم المنتج (عربي) <span className="text-red-500">*</span></label>
                      <Input value={editProduct.name_ar || ''} onChange={(e) => setEditProduct({...editProduct, name_ar: e.target.value})} className="h-12 rounded-xl bg-gray-50 dark:bg-slate-800/50 border-gray-200 dark:border-slate-700 px-4 focus-visible:ring-blue-500" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-700 dark:text-gray-300">اسم المنتج (إنجليزي)</label>
                      <Input value={editProduct.name || ''} onChange={(e) => setEditProduct({...editProduct, name: e.target.value})} className="h-12 rounded-xl bg-gray-50 dark:bg-slate-800/50 border-gray-200 dark:border-slate-700 px-4 focus-visible:ring-blue-500" dir="ltr" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5"><Barcode className="h-3.5 w-3.5" /> الباركود</label>
                      <Input value={editProduct.barcode || ''} onChange={(e) => setEditProduct({...editProduct, barcode: e.target.value})} className="h-12 rounded-xl bg-gray-50 dark:bg-slate-800/50 border-gray-200 dark:border-slate-700 px-4 font-mono focus-visible:ring-blue-500" dir="ltr" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-700 dark:text-gray-300">القسم / التصنيف</label>
                      <Input value={editProduct.category || ''} onChange={(e) => setEditProduct({...editProduct, category: e.target.value})} className="h-12 rounded-xl bg-gray-50 dark:bg-slate-800/50 border-gray-200 dark:border-slate-700 px-4 focus-visible:ring-blue-500" />
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'stock' && (
                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                  <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20 mb-6">
                    <h4 className="text-sm font-bold text-blue-900 dark:text-blue-300 mb-4 flex items-center gap-2"><Database className="h-4 w-4" /> التسعير والتكلفة</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-blue-800 dark:text-blue-400">سعر البيع</label>
                        <div className="relative">
                          <Input type="number" value={editProduct.price || 0} onChange={(e) => setEditProduct({...editProduct, price: parseFloat(e.target.value) || 0})} className="h-11 rounded-xl bg-white dark:bg-slate-900 border-blue-200 dark:border-blue-800 pl-10 focus-visible:ring-blue-500 font-mono text-lg" />
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs">ج.م</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-blue-800 dark:text-blue-400">سعر التكلفة</label>
                        <div className="relative">
                          <Input type="number" value={editProduct.cost || 0} onChange={(e) => setEditProduct({...editProduct, cost: parseFloat(e.target.value) || 0})} className="h-11 rounded-xl bg-white dark:bg-slate-900 border-blue-200 dark:border-blue-800 pl-10 focus-visible:ring-blue-500 font-mono text-lg" />
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs">ج.م</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20">
                    <h4 className="text-sm font-bold text-amber-900 dark:text-amber-300 mb-4 flex items-center gap-2"><Package className="h-4 w-4" /> إدارة المخزون</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-amber-800 dark:text-amber-400">الكمية الحالية</label>
                        <Input type="number" value={editProduct.stock ?? 0} onChange={(e) => setEditProduct({...editProduct, stock: parseInt(e.target.value) || 0})} className="h-11 rounded-xl bg-white dark:bg-slate-900 border-amber-200 dark:border-amber-800 font-mono focus-visible:ring-amber-500 text-center" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-amber-800 dark:text-amber-400">الحد الأدنى للتنبيه</label>
                        <Input type="number" value={editProduct.min_stock ?? 0} onChange={(e) => setEditProduct({...editProduct, min_stock: parseInt(e.target.value) || 0})} className="h-11 rounded-xl bg-white dark:bg-slate-900 border-amber-200 dark:border-amber-800 font-mono focus-visible:ring-amber-500 text-center" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-amber-800 dark:text-amber-400 flex items-center gap-1"><Scale className="h-3.5 w-3.5" /> الوحدة</label>
                        <Input value={editProduct.unit || 'قطعة'} onChange={(e) => setEditProduct({...editProduct, unit: e.target.value})} className="h-11 rounded-xl bg-white dark:bg-slate-900 border-amber-200 dark:border-amber-800 text-center focus-visible:ring-amber-500" placeholder="قطعة، كجم..." />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'settings' && (
                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                  <div className="p-5 rounded-2xl bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-1">حالة المنتج</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400">تفعيل أو إيقاف المنتج من الظهور في النظام والكاشير</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        value="" 
                        className="sr-only peer" 
                        checked={editProduct.is_active ?? editProduct.active ?? true}
                        onChange={() => setEditProduct({...editProduct, is_active: !(editProduct.is_active ?? editProduct.active ?? true)})}
                      />
                      <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-500"></div>
                    </label>
                  </div>
                </motion.div>
              )}

            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50 flex justify-end gap-3">
            <Button variant="ghost" onClick={onClose} className="rounded-xl h-12 px-6 font-medium">
              إلغاء
            </Button>
            <Button onClick={handleSave} className="rounded-xl h-12 px-8 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 font-bold flex items-center gap-2">
              <Check className="h-5 w-5" />
              حفظ التعديلات
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
