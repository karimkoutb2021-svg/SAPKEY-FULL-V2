'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { normalizeArabic } from '@/lib/arabic-normalize';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/lib/store/auth-store';
import { codingDraftService, codingLabelService } from '@/lib/supabase/services/procurement';
import { inventoryService } from '@/lib/supabase/services/inventory';
import { UnifiedScanner } from '@/components/scanner/unified-scanner';
import { Mic, MicOff, Camera, FileText, Check, X, Search, Package, Plus, Upload, Download, Printer, QrCode, ScanLine, Trash2, AlertTriangle } from 'lucide-react';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import JsBarcode from 'jsbarcode';
import { loadCategories } from '@/lib/category-utils';
import { ImageUpload } from '@/components/ui/image-upload';

const supabase = createClient();

interface CodingDraft {
  id: string;
  product_code: string;
  product_name: string;
  category?: string;
  unit: string;
  shelf_number?: string;
  cost_price: number;
  selling_price: number;
  min_stock: number;
  status: 'pending' | 'approved' | 'rejected' | 'active';
  submitted_by_name?: string;
  rejection_reason?: string;
  image_url?: string;
}

interface StockItem {
  id: string;
  product_name: string;
  sku: string;
  barcode?: string;
  current_qty: number;
  cost_price: number;
  selling_price: number;
  location?: string;
  category?: string;
  unit: string;
  image_url?: string;
  min_qty?: number;
}

function ProductGridBtn({ product, onClick, audited }: { product: StockItem; onClick: (p: StockItem) => void; audited?: boolean }) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const imageUrl = product.image_url || '/product-placeholder.svg';

  return (
    <button
      onClick={() => onClick(product)}
      className={cn(
        "relative group bg-white/40 dark:bg-[#1C1C1E]/50 backdrop-blur-xl rounded-2xl shadow-sm border overflow-hidden text-right transition-all duration-300 active:scale-95",
        audited ? "border-emerald-500/50 opacity-70" : "hover:-translate-y-1 hover:shadow-xl hover:border-emerald-500/50 border-gray-200/50 dark:border-white/[0.08]"
      )}
    >
      <div className="relative aspect-square overflow-hidden bg-gray-50 dark:bg-slate-800/30 p-2">
        {!imgLoaded && !imgError && <div className="absolute inset-0 bg-gray-200 dark:bg-slate-700/50 animate-pulse" />}
        <img src={imgError ? '/product-placeholder.svg' : imageUrl} alt={product.product_name}
          className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal transition-transform duration-500 group-hover:scale-110"
          onLoad={() => setImgLoaded(true)}
          onError={() => setImgError(true)}
          loading="lazy" />
        {audited && (
          <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center backdrop-blur-sm">
            <span className="text-[11px] font-black text-white bg-emerald-500 px-2 py-1 rounded-lg shadow-sm">مُكود</span>
          </div>
        )}
      </div>
      <div className="p-2 sm:p-2.5">
        <h3 className="text-[10px] sm:text-xs font-bold line-clamp-2 leading-tight mb-1 text-gray-900 dark:text-white">{product.product_name}</h3>
        <div className="flex items-center justify-between">
          <span className="text-[11px] sm:text-[13px] font-black text-emerald-600 dark:text-emerald-400">{product.current_qty} {product.unit}</span>
          <span className="text-[9px] text-gray-400">{product.sku}</span>
        </div>
      </div>
    </button>
  );
}

export default function CodingPage() {
  const auth = useAuthStore();
  const user = auth.user;
  const isManager = user?.role === 'manager' || user?.role === 'admin';

  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [drafts, setDrafts] = useState<CodingDraft[]>([]);
  const [categories, setCategories] = useState<{id: string, name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Filter
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

  // Action Panel State
  const [panelTab, setPanelTab] = useState<'single' | 'excel' | 'drafts'>('single');
  
  // Single Coding Form
  const [form, setForm] = useState({
    id: '', product_code: '', product_name: '', category: '', unit: 'قطعة', shelf_number: '', cost_price: '', selling_price: '', min_stock: '10', image_url: ''
  });

  // Voice
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Scanner
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerMode, setScannerMode] = useState<'qr' | 'barcode' | 'form-barcode'>('barcode');

  // Excel
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [importedData, setImportedData] = useState<any[]>([]);
  const [excelPreview, setExcelPreview] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchData();
    const channel = supabase.channel('coding-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_items' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'coding_drafts' }, fetchData)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  async function fetchData() {
    const [stockRes, draftsRes, catRes] = await Promise.all([
      inventoryService.getAll(),
      codingDraftService.getAll(),
      loadCategories()
    ]);
    if (stockRes.data) setStockItems(stockRes.data);
    if (draftsRes.data) setDrafts(draftsRes.data);
    if (catRes) setCategories([{id: 'all', name: 'الكل', image: ''} as any, ...catRes.map((c: any) => ({id: c.id, name: c.name_ar, image: c.image_url || ''}))]);
    setLoading(false);
  }

  // Edit existing
  function handleEditProduct(p: StockItem) {
    setPanelTab('single');
    setForm({
      id: p.id,
      product_code: p.sku,
      product_name: p.product_name,
      category: p.category || '',
      unit: p.unit || 'قطعة',
      shelf_number: p.location || '',
      cost_price: String(p.cost_price),
      selling_price: String(p.selling_price),
      min_stock: String(p.min_qty || 10),
      image_url: p.image_url || ''
    });
  }

  // Voice Coding
  function toggleVoice() {
    if (isRecording) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsRecording(false);
      return;
    }
    if (!('webkitSpeechRecognition' in window)) { toast.error('غير مدعوم'); return; }
    const SpeechRecognition = (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'ar-EG';
    recognition.onresult = (e: any) => {
      const trans = e.results[0][0].transcript;
      setIsRecording(false);
      setForm(prev => ({ ...prev, product_name: trans }));
      toast.success('تم التقاط الاسم: ' + trans);
    };
    recognition.onend = () => setIsRecording(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  }

  async function submitSingle() {
    if (!form.product_name) { toast.error('أدخل اسم المنتج'); return; }
    setSaving(true);
    const code = form.product_code || `AUTO-${Date.now()}`;
    
    if (form.id) {
       await supabase.from('stock_items').update({
          product_name: form.product_name, sku: code, category: form.category, unit: form.unit,
          location: form.shelf_number, cost_price: parseFloat(form.cost_price) || 0,
          selling_price: parseFloat(form.selling_price) || 0, min_qty: parseFloat(form.min_stock) || 10,
          image_url: form.image_url
        }).eq('id', form.id);
        
       await supabase.from('products').update({
          name_ar: form.product_name, name_en: form.product_name,
          unit: form.unit, sale_price: parseFloat(form.selling_price) || 0,
          cost_price: parseFloat(form.cost_price) || 0,
          image_url: form.image_url
       }).eq('sku', code);
        toast.success('تم التحديث والمزامنة');
    } else {
      if (isManager) {
        await supabase.from('products').insert({
          sku: code, barcode: code, name_ar: form.product_name, name_en: form.product_name,
          category_id: form.category, unit: form.unit, sale_price: parseFloat(form.selling_price) || 0,
          cost_price: parseFloat(form.cost_price) || 0, image_url: form.image_url
        });
        await supabase.from('stock_items').insert({
          sku: code, barcode: code, product_name: form.product_name, category: form.category, unit: form.unit,
          location: form.shelf_number, cost_price: parseFloat(form.cost_price) || 0,
          selling_price: parseFloat(form.selling_price) || 0, min_qty: parseFloat(form.min_stock) || 10,
          image_url: form.image_url
        });
        toast.success('تم التكويد بنجاح');
      } else {
        await codingDraftService.create({
          product_code: code, product_name: form.product_name, category: form.category, unit: form.unit,
          shelf_number: form.shelf_number, cost_price: parseFloat(form.cost_price) || 0,
          selling_price: parseFloat(form.selling_price) || 0, min_stock: parseFloat(form.min_stock) || 10,
          status: 'pending', submitted_by: user?.id, submitted_by_name: user?.nameAr || user?.name,
          image_url: form.image_url
        });
        toast.success('تم الإرسال للمراجعة');
      }
    }
    setForm({ id: '', product_code: '', product_name: '', category: '', unit: 'قطعة', shelf_number: '', cost_price: '', selling_price: '', min_stock: '10', image_url: '' });
    setSaving(false);
    fetchData();
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setExcelFile(file);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target?.result, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws);
      setImportedData(data);
      setExcelPreview(data);
    };
    reader.readAsBinaryString(file);
  }

  async function handleExcelImport() {
    setUploading(true);
    for (const row of importedData) {
      const code = row['كود المنتج'] || `AUTO-${Date.now()}-${Math.floor(Math.random()*1000)}`;
      if (isManager) {
        await supabase.from('products').insert({ sku: code, name_ar: row['اسم الصنف'], sale_price: row['سعر البيع'] || 0, unit: row['الوحدة'] || 'قطعة' });
        await supabase.from('stock_items').insert({ sku: code, product_name: row['اسم الصنف'], selling_price: row['سعر البيع'] || 0, unit: row['الوحدة'] || 'قطعة' });
      } else {
        await codingDraftService.create({
          product_code: code, product_name: row['اسم الصنف'] || 'منتج جديد',
          selling_price: row['سعر البيع'] || 0,
          status: 'pending'
        } as any);
      }
    }
    setUploading(false);
    toast.success(isManager ? 'تم الاستيراد واعتماد الدفعة' : 'تم الإرسال للمراجعة');
    setExcelPreview([]);
    setImportedData([]);
    setExcelFile(null);
    fetchData();
  }

  async function handleApprove(draft: any) {
    await codingDraftService.approve(draft.id, user?.id || '');
    await supabase.from('products').insert({
      sku: draft.product_code, barcode: draft.product_code, name_ar: draft.product_name, name_en: draft.product_name,
      category_id: draft.category, unit: draft.unit, sale_price: draft.selling_price || 0,
      cost_price: draft.cost_price || 0, image_url: draft.image_url
    });
    await supabase.from('stock_items').insert({
      sku: draft.product_code, barcode: draft.product_code, product_name: draft.product_name, category: draft.category, unit: draft.unit,
      location: draft.shelf_number, cost_price: draft.cost_price || 0,
      selling_price: draft.selling_price || 0, min_qty: draft.min_stock || 10,
      image_url: draft.image_url
    });
    toast.success('تم الاعتماد وإضافة المنتج');
    fetchData();
  }

  async function handleReject(draft: any) {
    await codingDraftService.reject(draft.id, 'مرفوض');
    toast.success('تم الحذف');
    fetchData();
  }

  function handleExportTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([['كود المنتج', 'اسم الصنف', 'القسم الرئيسي', 'الوحدة', 'سعر البيع']]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    XLSX.writeFile(wb, 'coding-template.xlsx');
  }

  const filtered = stockItems.filter(p => {
    const nSearch = normalizeArabic(search);
    const ms = !search || normalizeArabic(p.product_name).includes(nSearch) || p.sku.includes(search) || (p.barcode && p.barcode.includes(search));
    const selectedCat = categories.find(c => c.id === category)?.name;
    return category === 'all' || category === 'الكل' ? ms : ms && p.category === selectedCat;
  });

  const pendingDrafts = drafts.filter(d => d.status === 'pending');

  if (loading) return <div className="text-center py-8 text-gray-500">جاري التحميل...</div>;

  return (
    <div className="flex flex-col lg:flex-row flex-1 h-full gap-4 overflow-hidden" dir="rtl">
      
      {/* ─── Action Panel (First in DOM so it's on the Right in RTL) ─── */}
      <div className="w-full lg:w-96 flex flex-col overflow-hidden bg-white/95 dark:bg-slate-900/60 rounded-3xl border border-gray-200 dark:border-white/20 shadow-lg shrink-0 lg:min-h-0 order-1">
        
        {/* Panel Tabs */}
        <div className="flex p-2 bg-gray-50 dark:bg-slate-800/20 border-b border-gray-200 dark:border-white/10 shrink-0">
          <button onClick={() => setPanelTab('single')} className={cn("flex-1 py-2 text-xs font-bold rounded-lg transition-colors text-center", panelTab === 'single' ? "bg-white dark:bg-slate-700 shadow text-emerald-600 dark:text-emerald-400" : "text-gray-500 hover:bg-white/50 dark:hover:bg-white/10")}>يدوي/صوتي</button>
          <button onClick={() => setPanelTab('excel')} className={cn("flex-1 py-2 text-xs font-bold rounded-lg transition-colors text-center", panelTab === 'excel' ? "bg-white dark:bg-slate-700 shadow text-emerald-600 dark:text-emerald-400" : "text-gray-500 hover:bg-white/50 dark:hover:bg-white/10")}>إكسيل</button>
          <button onClick={() => setPanelTab('drafts')} className={cn("flex-1 py-2 text-xs font-bold rounded-lg transition-colors text-center", panelTab === 'drafts' ? "bg-white dark:bg-slate-700 shadow text-emerald-600 dark:text-emerald-400" : "text-gray-500 hover:bg-white/50 dark:hover:bg-white/10")}>المسودات</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
          {/* Single Form */}
          {panelTab === 'single' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-gray-900 dark:text-white">{form.id ? 'تعديل منتج' : 'تكويد منتج جديد'}</h3>
                {!form.id && (
                  <button onClick={toggleVoice} className={cn("p-2 rounded-full transition-colors", isRecording ? "bg-red-500 text-white animate-pulse" : "bg-emerald-100 text-emerald-600 hover:bg-emerald-200")}>
                    <Mic size={16} />
                  </button>
                )}
              </div>
              
              <div className="space-y-3 text-sm">
                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">اسم المنتج</label>
                  <input type="text" value={form.product_name} onChange={e => setForm({...form, product_name: e.target.value})} className="w-full p-2.5 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-white/20 focus:ring-2 focus:ring-emerald-500/50 text-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">الكود / الباركود</label>
                  <div className="flex gap-2">
                    <input type="text" value={form.product_code} onChange={e => setForm({...form, product_code: e.target.value})} placeholder="تلقائي" className="w-full p-2.5 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-white/20 focus:ring-2 focus:ring-emerald-500/50 text-gray-900 dark:text-white" />
                    <button onClick={() => { setScannerMode('barcode'); setScannerOpen(true); }} className="p-2.5 rounded-xl bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors text-gray-700 dark:text-gray-300"><ScanLine size={18} /></button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">القسم</label>
                    <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full p-2.5 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-white/20 focus:ring-2 focus:ring-emerald-500/50 text-gray-900 dark:text-white">
                      <option value="">بدون</option>
                      {categories.filter(c => c.id !== 'all').map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">الوحدة</label>
                    <select value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} className="w-full p-2.5 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-white/20 focus:ring-2 focus:ring-emerald-500/50 text-gray-900 dark:text-white">
                      <option value="قطعة">قطعة</option>
                      <option value="علبة">علبة</option>
                      <option value="كيلو">كيلو</option>
                      <option value="لتر">لتر</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">التكلفة (ج.م)</label>
                    <input type="number" value={form.cost_price} onChange={e => setForm({...form, cost_price: e.target.value})} className="w-full p-2.5 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-white/20 focus:ring-2 focus:ring-emerald-500/50 text-gray-900 dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">سعر البيع (ج.م)</label>
                    <input type="number" value={form.selling_price} onChange={e => setForm({...form, selling_price: e.target.value})} className="w-full p-2.5 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-white/20 focus:ring-2 focus:ring-emerald-500/50 text-gray-900 dark:text-white" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">رقم الرف / الموقع</label>
                    <input type="text" value={form.shelf_number} onChange={e => setForm({...form, shelf_number: e.target.value})} className="w-full p-2.5 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-white/20 focus:ring-2 focus:ring-emerald-500/50 text-gray-900 dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">الحد الأدنى</label>
                    <input type="number" value={form.min_stock} onChange={e => setForm({...form, min_stock: e.target.value})} className="w-full p-2.5 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-white/20 focus:ring-2 focus:ring-emerald-500/50 text-gray-900 dark:text-white" />
                  </div>
                </div>
                
                {/* Image Upload */}
                <div className="pt-2 border-t border-gray-100 dark:border-white/10">
                  <ImageUpload
                    label="صورة المنتج (اختياري)"
                    value={form.image_url}
                    onChange={(url) => setForm({ ...form, image_url: url })}
                  />
                </div>
              </div>

              <button onClick={submitSingle} disabled={saving} className="w-full mt-4 py-3 rounded-2xl bg-gradient-to-l from-emerald-500 to-teal-600 text-white font-bold hover:opacity-90 transition-all shadow-lg flex items-center justify-center gap-2">
                <Check className="w-5 h-5" /> {saving ? 'جاري الحفظ...' : isManager ? (form.id ? 'حفظ التعديلات' : 'اعتماد التكويد') : 'إرسال للمراجعة'}
              </button>
            </div>
          )}

          {/* Excel Form */}
          {panelTab === 'excel' && (
            <div className="space-y-4">
              <h3 className="font-bold mb-4">التكويد السريع عبر Excel</h3>
              <button onClick={handleExportTemplate} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold hover:bg-blue-500/20 transition-colors">
                <Download size={18} /> تحميل القالب
              </button>

              <div className="border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-xl p-8 text-center bg-white/30 dark:bg-slate-800/30">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                <p className="text-sm font-medium mb-3">ارفع ملف Excel بعد تعبئته</p>
                <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} className="hidden" id="excel-upload" />
                <label htmlFor="excel-upload" className="px-6 py-2 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors cursor-pointer text-sm font-bold inline-block shadow-md">
                  تصفح الملفات
                </label>
                {excelFile && <p className="text-xs text-gray-500 mt-3 font-mono">{excelFile.name}</p>}
              </div>

              {excelPreview.length > 0 && (
                <div className="mt-6">
                  <p className="text-sm font-bold mb-2">معاينة ({excelPreview.length} منتج)</p>
                  <button onClick={handleExcelImport} disabled={uploading} className="w-full py-3 rounded-xl bg-emerald-500 text-white font-bold hover:bg-emerald-600 transition-colors shadow-lg disabled:opacity-50 flex items-center justify-center gap-2">
                    <Check size={18} /> {uploading ? 'جاري الرفع...' : (isManager ? 'اعتماد الدفعة' : 'إرسال للمراجعة')}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Drafts */}
          {panelTab === 'drafts' && (
            <div className="space-y-4">
              <h3 className="font-bold mb-4">المسودات المعلقة ({pendingDrafts.length})</h3>
              {pendingDrafts.length === 0 ? (
                <div className="text-center py-10 text-gray-400">لا توجد مسودات معلقة</div>
              ) : (
                <div className="space-y-3">
                  {pendingDrafts.map(draft => (
                    <div key={draft.id} className="p-3 rounded-xl bg-white/50 dark:bg-slate-800/50 border border-white/20 shadow-sm text-sm">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-bold">{draft.product_name}</p>
                          <p className="text-xs text-gray-500">{draft.product_code} • {draft.category || 'بدون'}</p>
                        </div>
                        <span className="text-[10px] bg-amber-500/20 text-amber-600 px-2 py-0.5 rounded-full font-bold">معلق</span>
                      </div>
                      <div className="flex justify-between text-xs mb-3">
                        <span>سعر البيع: {draft.selling_price}</span>
                        <span>تكلفة: {draft.cost_price}</span>
                      </div>
                      {isManager && (
                        <div className="flex gap-2">
                          <button onClick={() => handleApprove(draft)} className="flex-1 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 font-bold hover:bg-emerald-500/20">اعتماد</button>
                          <button onClick={() => handleReject(draft)} className="flex-1 py-1.5 rounded-lg bg-red-500/10 text-red-600 font-bold hover:bg-red-500/20">رفض</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ─── Product Grid Area (Second in DOM so it's on the Left in RTL) ─── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white/80 dark:bg-slate-900/40 rounded-3xl border border-gray-200 dark:border-white/20 shadow-lg relative lg:min-h-0 order-2">
        {/* Top bar */}
        <div className="p-4 border-b border-gray-100 dark:border-white/10 flex items-center justify-between gap-4 bg-gray-50/50 dark:bg-slate-800/20">
          <div className="flex-1 relative max-w-md">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث عن منتج..."
              className="w-full pr-10 pl-4 py-2.5 rounded-xl bg-white dark:bg-slate-900/50 border border-gray-200 dark:border-transparent text-sm focus:ring-2 focus:ring-emerald-500/50 text-gray-900 dark:text-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { setScannerMode('barcode'); setScannerOpen(true); }} className="h-10 w-10 flex items-center justify-center rounded-xl bg-white dark:bg-slate-900/50 text-gray-500 hover:bg-gray-50 dark:hover:bg-white/80 transition-colors border border-gray-200 dark:border-transparent" title="مسح باركود">
              <ScanLine className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setPanelTab('single');
                setForm({ id: '', product_code: '', product_name: '', category: '', unit: 'قطعة', shelf_number: '', cost_price: '', selling_price: '', min_stock: '10', image_url: '' });
              }}
              className="hidden sm:flex items-center gap-2 h-10 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold hover:shadow-lg hover:opacity-90 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm">تكويد جديد</span>
            </button>
          </div>
        </div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-2 pt-1 px-1 shrink-0 scrollbar-hide">
          {categories.map(c => (
            <button key={c.id} onClick={() => setCategory(c.id)} className={cn("px-5 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-300 shadow-sm border backdrop-blur-md flex items-center gap-2", category === c.id ? "bg-emerald-500 text-white border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.4)] scale-105" : "bg-white dark:bg-slate-800/40 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-slate-700/60 hover:scale-105")}>
              {(c as any).image && <img src={(c as any).image} alt={c.name} className="w-5 h-5 object-contain" />}
              {c.name}
            </button>
          ))}
        </div>

        {/* Grid Area - Updated Layout & Smaller Columns */}
        <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2 pb-20">
            {filtered.map(p => (
              <ProductGridBtn key={p.id} product={p} onClick={handleEditProduct} />
            ))}
          </div>
        </div>
        
        {/* Floating Add Drafts badge */}
        {pendingDrafts.length > 0 && isManager && (
          <button onClick={() => setPanelTab('drafts')} className="absolute bottom-6 right-6 bg-amber-500 text-white px-4 py-2 rounded-full font-bold shadow-xl animate-bounce flex items-center gap-2 z-10">
            <AlertTriangle className="w-4 h-4" /> يوجد {pendingDrafts.length} مسودات معلقة
          </button>
        )}
      </div>

      <UnifiedScanner
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={(res) => {
          setForm(prev => ({ ...prev, product_code: res.decodedValue || res.rawValue }));
          setScannerOpen(false);
          toast.success('تم مسح الكود بنجاح');
        }}
        mode={scannerMode}
      />
    </div>
  );
}
