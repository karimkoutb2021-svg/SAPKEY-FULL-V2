'use client';

import { useState, useRef, Fragment } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { useAuthStore } from '@/lib/store/auth-store';
import { Plus, Search, Filter, Package, Edit, Trash2, MoreHorizontal, Upload, Image as ImageIcon, X, FileSpreadsheet, FileDown, Download, FileType, AlertCircle, CheckCircle2, FileText } from 'lucide-react';
import { demoAction } from '@/components/demo-handler';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { exportProfessionalExcel, importProfessionalExcel, getProductExportConfig, DROPDOWNS, type ExcelImportResult, type ImportError } from '@/lib/services/excel-pro';
import { useTableSync } from '@/hooks/use-realtime-sync';
import { ProductEditModal } from '@/components/products/product-edit-modal';

interface ImportRow {
  barcode: string;
  nameAr: string;
  name: string;
  category: string;
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  unit: string;
}

export default function ProductsPage() {
  const { data: products, loading, setData: setProducts } = useTableSync<any>('products');
  const [search, setSearch] = useState('');
  const [editProduct, setEditProduct] = useState<any>(null);
  const [importData, setImportData] = useState<ImportRow[]>([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedImportRows, setSelectedImportRows] = useState<Set<number>>(new Set());
  const [showImportErrors, setShowImportErrors] = useState(false);
  const [importErrors, setImportErrors] = useState<ImportError[]>([]);
  const auth = useAuthStore();
  const canEdit = auth.isRole(['admin', 'manager', 'cashier']);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);

  const filtered = (products || []).filter((p: any) =>
    !search || (p.name_ar || '').includes(search) || (p.name || '').toLowerCase().includes(search.toLowerCase()) || (p.barcode || '').includes(search)
  );

  let bodyContent = null;

  if (loading) {
    bodyContent = <tr><td colSpan={7} className="p-8 text-center text-sm text-gray-400">جاري تحميل البيانات...</td></tr>;
  } else if (filtered.length === 0) {
    bodyContent = <tr><td colSpan={7} className="p-8 text-center text-sm text-gray-400">لا توجد بيانات</td></tr>;
  } else {
    bodyContent = filtered.map((product: any) => {
      const nameAr = product.name_ar || '';
      const nameEn = product.name || '';
      const barcode = product.barcode || '';
      const category = product.category || '';
      const price = product.price || 0;
      const cost = product.cost || 0;
      const stock = product.stock ?? 0;
      const minStock = product.min_stock ?? 0;
      const unit = product.unit || 'قطعة';
      const isActive = product.is_active ?? product.active ?? true;
      const imageUrl = product.image_url;

      return <tr key={product.id} className="border-b border-gray-50 dark:border-slate-800/50 hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-all group">
        <td className="p-4">
          <div className="flex items-center gap-3">
            {imageUrl ? (
              <div className="relative h-10 w-10 rounded-xl overflow-hidden shrink-0 border border-gray-100 dark:border-slate-800 shadow-sm group-hover:scale-105 transition-transform">
                <img loading="lazy" src={imageUrl} alt={nameAr} className="h-full w-full object-cover" />
              </div>
            ) : (
              <div className="h-10 w-10 rounded-xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center shrink-0 border border-gray-200 dark:border-slate-700 shadow-sm group-hover:scale-105 transition-transform">
                <Package className="h-4 w-4 text-gray-400" />
              </div>
            )}
            <div>
              <p className="font-bold text-sm text-gray-900 dark:text-white">{nameAr}</p>
              <p className="text-xs text-gray-500 font-mono mt-0.5">{barcode || nameEn}</p>
            </div>
          </div>
        </td>
        <td className="p-4 text-right">
          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-gray-300 border border-gray-200 dark:border-slate-700">
            {category}
          </span>
        </td>
        <td className="p-4 text-right font-bold text-gray-900 dark:text-white">
          {price.toLocaleString('ar-EG')} <span className="text-[10px] text-gray-500 font-normal">ج.م</span>
        </td>
        <td className="p-4 text-right text-sm text-gray-600 dark:text-gray-400">
          {cost.toLocaleString('ar-EG')} <span className="text-[10px] text-gray-500">ج.م</span>
        </td>
        <td className="p-4 text-right">
          <div className="flex items-center gap-1.5 justify-end">
            <span className={`font-bold text-sm ${stock <= minStock ? 'text-red-500' : 'text-emerald-500'}`}>
              {stock.toLocaleString('ar-EG')}
            </span>
            <span className="text-xs text-gray-500">{unit}</span>
          </div>
        </td>
        <td className="p-4 text-right">
          <Badge variant={isActive ? "default" : "secondary"} className={isActive ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-gray-400 border-gray-200 dark:border-slate-700"}>
            {isActive ? 'نشط' : 'غير نشط'}
          </Badge>
        </td>
        <td className="p-4">
          <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {canEdit && (
              <button onClick={() => setEditProduct({ ...product })} className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20 transition-colors shadow-sm">
                <Edit className="h-4 w-4" />
              </button>
            )}
            <button className="p-2 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 dark:bg-slate-800 dark:text-gray-400 dark:hover:bg-slate-700 transition-colors shadow-sm">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>
        </td>
      </tr>;
    });
  }
  const handleSaveProduct = (updatedProduct: any) => {
    if (!updatedProduct) return;
    const updated = (products || []).map((p: any) => p.id === updatedProduct.id ? updatedProduct : p);
    setProducts(updated);
    setEditProduct(null);
    toast.success('تم حفظ المنتج');
  };

  // Removed inline image upload logic here as it's now handled inside ProductEditModal

  const handleExportExcel = () => {
    const config = getProductExportConfig(products || [], []);
    const date = new Date().toISOString().slice(0, 10);
    exportProfessionalExcel(config, `products-${date}`);
    toast.success('تم تصدير المنتجات بنجاح');
  };

  const handleDownloadTemplate = () => {
    const config = getProductExportConfig([], []);
    config.rows = [{
      barcode: '1234567890',
      nameAr: 'منتج تجريبي',
      nameEn: 'Sample Product',
      category: 'groceries',
      unit: 'piece',
      cost: 35,
      price: 50,
      stock: 100,
      minStock: 10,
      status: 'نشط',
      id: '',
    }];
    exportProfessionalExcel(config, 'import-template');
    toast.success('تم تحميل النموذج');
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (excelInputRef.current) excelInputRef.current.value = '';

    const columns = getProductExportConfig([], []).columns;
    const result = await importProfessionalExcel(file, columns);

    if (!result.success && result.errors.length === 0) {
      toast.error(result.warnings.join('، '));
      return;
    }

    if (result.errors.length > 0) {
      setImportErrors(result.errors);
      setShowImportErrors(true);
      toast.error(`تم العثور على ${result.errors.length} خطأ`);
    }

    if (result.data.length > 0) {
      setImportData(result.data.map((row: any) => ({
        barcode: row.barcode || '',
        nameAr: row.nameAr || '',
        name: row.nameEn || '',
        category: row.category || '',
        price: Number(row.price) || 0,
        cost: Number(row.cost) || 0,
        stock: Number(row.stock) || 0,
        minStock: Number(row.minStock) || 0,
        unit: row.unit || 'piece',
      })));
      setSelectedImportRows(new Set(result.data.map((_, i) => i)));
      setShowImportModal(true);
      toast.success(`تم قراءة ${result.data.length} منتج صالح`);
    }
  };

  const toggleImportRow = (index: number) => {
    setSelectedImportRows((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleConfirmImport = () => {
    const selected = importData.filter((_, i) => selectedImportRows.has(i));
    if (selected.length === 0) {
      toast.error('اختر منتجات للاستيراد');
      return;
    }

    const updated = [...(products || [])];
    let added = 0;
    let updatedCount = 0;

    selected.forEach((row) => {
      const existingIndex = updated.findIndex((p: any) => p.barcode === row.barcode);
      if (existingIndex >= 0) {
        updated[existingIndex] = {
          ...updated[existingIndex],
          name_ar: row.nameAr || updated[existingIndex].name_ar,
          name: row.name || updated[existingIndex].name,
          category: row.category || updated[existingIndex].category,
          price: row.price || updated[existingIndex].price,
          cost: row.cost || updated[existingIndex].cost,
          stock: row.stock ?? updated[existingIndex].stock,
          min_stock: row.minStock ?? updated[existingIndex].min_stock,
          unit: row.unit || updated[existingIndex].unit,
        };
        updatedCount++;
      } else {
        updated.push({
          id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
          barcode: row.barcode,
          name_ar: row.nameAr,
          name: row.name,
          category: row.category,
          price: row.price,
          cost: row.cost,
          stock: row.stock,
          min_stock: row.minStock,
          unit: row.unit,
          is_active: true,
        });
        added++;
      }
    });

    setProducts(updated);
    setShowImportModal(false);
    setImportData([]);
    setSelectedImportRows(new Set());

    const parts = [];
    if (added > 0) parts.push(`إضافة ${added} منتج`);
    if (updatedCount > 0) parts.push(`تحديث ${updatedCount} منتج`);
    toast.success(`تم استيراد ${selected.length} منتج بنجاح (${parts.join(', ')})`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">المنتجات</h1>
          <p className="text-xs text-muted-foreground">إدارة المنتجات والمخزون</p>
        </div>
        <div className="flex items-center gap-1.5">
          {canEdit && (
            <Fragment>
              <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
                <FileDown className="h-3.5 w-3.5 ml-1" /> نموذج
              </Button>
              <Button size="sm" className="hidden sm:inline-flex" variant="outline" onClick={() => excelInputRef.current?.click()}>
                <FileType className="h-3.5 w-3.5 ml-1" /> استيراد
              </Button>
              <Button size="sm" className="hidden sm:inline-flex" variant="outline" onClick={handleExportExcel}>
                <FileSpreadsheet className="h-3.5 w-3.5 ml-1" /> تصدير
              </Button>
              <input ref={excelInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileSelect} />
            </Fragment>
          )}
          {canEdit && (
            <Button size="sm" onClick={() => demoAction("إضافة منتج جديد")}>
              <Plus className="h-3.5 w-3.5 ml-1" /> إضافة منتج
            </Button>
          )}
        </div>
      </div>

      {/* Mobile import/export buttons */}
      {canEdit && (
        <div className="flex gap-2 sm:hidden">
          <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => excelInputRef.current?.click()}>
            <Upload className="h-3.5 w-3.5 ml-1" /> استيراد
          </Button>
          <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={handleExportExcel}>
            <Download className="h-3.5 w-3.5 ml-1" /> تصدير Excel
          </Button>
        </div>
      )}

      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input type="text" placeholder="بحث عن منتج..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-lg border border-input bg-background pr-9 pl-3 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
        </div>
        <Button variant="outline" size="sm"><Filter className="h-3.5 w-3.5 ml-1" /> تصفية</Button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50/80 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800">
                <th className="text-right p-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">المنتج</th>
                <th className="text-right p-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">القسم</th>
                <th className="text-right p-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">السعر</th>
                <th className="text-right p-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">التكلفة</th>
                <th className="text-right p-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">المخزون</th>
                <th className="text-right p-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">الحالة</th>
                <th className="text-center p-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {bodyContent}
            </tbody>
          </table>
        </div>
      </div>

      {/* Import Errors Modal */}
      <AnimatePresence>
        {showImportErrors && (
          <Fragment>
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowImportErrors(false)} />
            <motion.div initial={{y:'100%'}} animate={{y:0}} exit={{y:'100%'}} className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-[#0F172A] rounded-t-2xl shadow-2xl max-h-[85vh] overflow-y-auto max-w-2xl mx-auto" dir="rtl">
              <div className="flex justify-center mt-2 mb-1"><div className="h-1 w-10 rounded-full bg-gray-300" /></div>
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-red-600">أخطاء في الاستيراد</h3>
                      <p className="text-[10px] text-muted-foreground">{importErrors.length} خطأ في {new Set(importErrors.map(e => e.row)).size} صف</p>
                    </div>
                  </div>
                  <button onClick={() => setShowImportErrors(false)}><X className="h-4 w-4 text-gray-400" /></button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {importErrors.map((err, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30">
                      <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-red-700 dark:text-red-300">صف {err.row} - {err.column}</p>
                        <p className="text-[10px] text-red-500 mt-0.5">{err.message}</p>
                        {err.value && <p className="text-[10px] text-gray-400 mt-0.5">القيمة: "{err.value}"</p>}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30">
                  <div className="flex items-start gap-2">
                    <FileText className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-amber-700 dark:text-amber-300">نصائح</p>
                      <ul className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 space-y-0.5">
                        <li>• استخدم القوائم المنسدلة في الخلايا الصفراء</li>
                        <li>• الخلايا الرمادية للقراءة فقط</li>
                        <li>• تأكد من ملء جميع الحقول المطلوبة</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-3">
                  <Button variant="outline" size="sm" onClick={() => setShowImportErrors(false)} className="flex-1 h-9 text-xs">إغلاق</Button>
                  <Button size="sm" onClick={() => { setShowImportErrors(false); handleDownloadTemplate(); }} className="flex-1 h-9 text-xs">
                    <FileDown className="h-3.5 w-3.5 ml-1" /> تحميل نموذج جديد
                  </Button>
                </div>
              </div>
            </motion.div>
          </Fragment>
        )}
      </AnimatePresence>

      {/* Import Preview Modal */}
      <AnimatePresence>
        {showImportModal && (
          <Fragment>
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowImportModal(false)} />
            <motion.div initial={{y:'100%'}} animate={{y:0}} exit={{y:'100%'}} className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-[#0F172A] rounded-t-2xl shadow-2xl max-h-[85vh] overflow-y-auto max-w-2xl mx-auto" dir="rtl">
              <div className="flex justify-center mt-2 mb-1"><div className="h-1 w-10 rounded-full bg-gray-300" /></div>
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold">معاينة الاستيراد</h3>
                    <p className="text-[10px] text-muted-foreground">{importData.length} منتج في الملف</p>
                  </div>
                  <button onClick={() => setShowImportModal(false)}><X className="h-4 w-4 text-gray-400" /></button>
                </div>

                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="p-2 w-10">
                          <input
                            type="checkbox"
                            className="h-3.5 w-3.5"
                            checked={selectedImportRows.size === importData.length && importData.length > 0}
                            onChange={() => {
                              if (selectedImportRows.size === importData.length) {
                                setSelectedImportRows(new Set());
                              } else {
                                setSelectedImportRows(new Set(importData.map((_, i) => i)));
                              }
                            }}
                          />
                        </th>
                        <th className="text-right p-2 text-[10px] font-medium text-muted-foreground">الباركود</th>
                        <th className="text-right p-2 text-[10px] font-medium text-muted-foreground">الاسم (عربي)</th>
                        <th className="text-right p-2 text-[10px] font-medium text-muted-foreground">الاسم (إنجليزي)</th>
                        <th className="text-right p-2 text-[10px] font-medium text-muted-foreground">التصنيف</th>
                        <th className="text-right p-2 text-[10px] font-medium text-muted-foreground">السعر</th>
                        <th className="text-right p-2 text-[10px] font-medium text-muted-foreground">التكلفة</th>
                        <th className="text-right p-2 text-[10px] font-medium text-muted-foreground">المخزون</th>
                        <th className="text-right p-2 text-[10px] font-medium text-muted-foreground">الوحدة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importData.map((row, idx) => (
                        <tr key={idx} className={`border-b hover:bg-accent/50 transition-colors ${!selectedImportRows.has(idx) ? 'opacity-50' : ''}`}>
                          <td className="p-2">
                            <input
                              type="checkbox"
                              className="h-3.5 w-3.5"
                              checked={selectedImportRows.has(idx)}
                              onChange={() => toggleImportRow(idx)}
                            />
                          </td>
                          <td className="p-2 text-[10px] font-mono">{row.barcode}</td>
                          <td className="p-2 text-[10px]">{row.nameAr}</td>
                          <td className="p-2 text-[10px]">{row.name}</td>
                          <td className="p-2 text-[10px]">{row.category}</td>
                          <td className="p-2 text-[10px]">{row.price}</td>
                          <td className="p-2 text-[10px]">{row.cost}</td>
                          <td className="p-2 text-[10px]">{row.stock}</td>
                          <td className="p-2 text-[10px]">{row.unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between pt-3">
                  <p className="text-[10px] text-muted-foreground">
                    {(products || []).find((p: any) => importData.some((r) => r.barcode === p.barcode))
                      ? 'سيتم تحديث المنتجات الموجودة بنفس الباركود'
                      : ''}
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowImportModal(false)} className="h-9 text-xs">إلغاء</Button>
                    <Button size="sm" onClick={handleConfirmImport} className="h-9 text-xs bg-[#22C55E] hover:bg-[#16A34A]">
                      <FileType className="h-3.5 w-3.5 ml-1" /> استيراد ({selectedImportRows.size})
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </Fragment>
        )}
      </AnimatePresence>

      {/* Edit Product Modal */}
      <ProductEditModal 
        product={editProduct} 
        isOpen={!!editProduct} 
        onClose={() => setEditProduct(null)} 
        onSave={handleSaveProduct} 
      />
    </div>
  );
}

