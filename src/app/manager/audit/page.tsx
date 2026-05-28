'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { normalizeArabic } from '@/lib/arabic-normalize';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/lib/store/auth-store';
import { auditService, inventoryService } from '@/lib/supabase/services/inventory';
import { auditItemService } from '@/lib/supabase/services/procurement';
import { UnifiedScanner } from '@/components/scanner/unified-scanner';
import { ProductMasterCard } from '@/components/tools/product-master-card';
import { Mic, MicOff, Camera, FileText, Check, X, AlertTriangle, TrendingUp, TrendingDown, Search, Package, Eye, Download, QrCode, ScanLine } from 'lucide-react';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { loadCategories } from '@/lib/category-utils';
import { Tooltip } from '@/components/ui/tooltip';

const supabase = createClient();

interface StockItem {
  id: string;
  product_name: string;
  sku: string;
  barcode?: string;
  current_qty: number;
  min_qty: number;
  cost_price: number;
  selling_price: number;
  location?: string;
  category?: string;
  unit: string;
  image_url?: string;
}

interface AuditItem {
  id: string;
  stock_item_id?: string;
  product_name: string;
  product_sku?: string;
  system_qty: number;
  actual_qty: number;
  variance: number;
  variance_value: number;
  cost_price: number;
  status: 'matched' | 'shortage' | 'overage' | 'damaged' | 'not_found';
  notes?: string;
}

interface AuditSession {
  id: string;
  type: 'voice' | 'ocr' | 'manual';
  status: 'in_progress' | 'completed' | 'cancelled';
  initiated_by?: string;
  created_at: string;
  completed_at?: string;
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
            <span className="text-[11px] font-black text-white bg-emerald-500 px-2 py-1 rounded-lg shadow-sm">تم الجرد</span>
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

export default function AuditPage() {
  const auth = useAuthStore();
  const user = auth.user;
  const isManager = user?.role === 'manager' || user?.role === 'admin';

  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [categories, setCategories] = useState<{id: string, name: string}[]>([]);
  const [auditItems, setAuditItems] = useState<AuditItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

  // Active Audit
  const [activeSession, setActiveSession] = useState<AuditSession | null>(null);
  
  // Selection
  const [selectedProduct, setSelectedProduct] = useState<StockItem | null>(null);
  const [actualQty, setActualQty] = useState('');

  // Scanner
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerMode, setScannerMode] = useState<'qr' | 'barcode'>('barcode');
  const [productCardOpen, setProductCardOpen] = useState(false);
  const [scannedCode, setScannedCode] = useState('');

  // Voice
  const [isRecording, setIsRecording] = useState(false);

  // Modals
  const [showStartModal, setShowStartModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportData, setReportData] = useState<{total:number, matched:number, shortage:number, overage:number, value:number} | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    fetchData();
    const channel = supabase.channel('audit-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_items' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'audit_items' }, fetchAuditItems)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  async function fetchData() {
    const [stockRes, catRes, sessionRes] = await Promise.all([
      inventoryService.getAll(),
      loadCategories(),
      supabase.from('audit_sessions').select('*').eq('status', 'in_progress').order('created_at', { ascending: false }).limit(1)
    ]);
    if (stockRes.data) setStockItems(stockRes.data);
    if (catRes) {
      setCategories([{id: 'all', name: 'الكل'}, ...catRes.map((c: any) => ({id: c.id, name: c.name_ar}))]);
    }
    if (sessionRes.data && sessionRes.data.length > 0) {
      setActiveSession(sessionRes.data[0] as AuditSession);
      fetchAuditItemsForSession(sessionRes.data[0].id);
    }
    setLoading(false);
  }

  async function fetchAuditItemsForSession(sessionId: string) {
    const res = await auditItemService.getAll(sessionId);
    if (res.data) setAuditItems(res.data as AuditItem[]);
  }

  async function fetchAuditItems() {
    if (activeSession) fetchAuditItemsForSession(activeSession.id);
  }

  async function startAudit(typeStr: string = 'manual') {
    setShowStartModal(false);
    
    // Ensure the type matches the Supabase Enum ('voice', 'ocr', 'manual')
    const type = (typeStr === 'voice' || typeStr === 'ocr') ? typeStr : 'manual';
    
    const res = await auditService.create({
      type,
      status: 'in_progress',
      created_at: new Date().toISOString(),
      initiated_by: user?.id,
    });
    
    if (res.error) {
      toast.error('خطأ في بدء الجلسة: ' + ((res.error as any)?.message || 'Unknown error'));
      return;
    }
    
    if (res.data) {
      setActiveSession(res.data);
      setAuditItems([]);
      toast.success('تم بدء جلسة الجرد بنجاح', { icon: '🚀' });
    }
  }

  async function completeAudit() {
    if (!activeSession) return;
    
    const differences = auditItems.filter(i => i.status !== 'matched');
    const shortageCount = differences.filter(i => i.status === 'shortage').length;
    const overageCount = differences.filter(i => i.status === 'overage').length;
    const matchedCount = auditItems.filter(i => i.status === 'matched').length;
    const totalValue = differences.reduce((acc, curr) => acc + (curr.variance_value || 0), 0);

    setReportData({
      total: auditItems.length,
      matched: matchedCount,
      shortage: shortageCount,
      overage: overageCount,
      value: totalValue
    });

    await auditService.update(activeSession.id, {
      status: 'completed',
      completed_at: new Date().toISOString(),
      differences,
    });
    
    setShowReportModal(true);
  }

  function closeReportAndReset() {
    setShowReportModal(false);
    setActiveSession(null);
    setAuditItems([]);
    setSelectedProduct(null);
    setReportData(null);
  }

  async function submitItem() {
    if (!selectedProduct || !actualQty || !activeSession) return;
    
    const actual = parseFloat(actualQty);
    const system = selectedProduct.current_qty;
    const variance = actual - system;
    const varianceValue = variance * selectedProduct.cost_price;

    let status: AuditItem['status'] = 'matched';
    if (variance < 0) status = 'shortage';
    else if (variance > 0) status = 'overage';

    const { error } = await auditItemService.create({
      audit_session_id: activeSession.id,
      stock_item_id: selectedProduct.id,
      product_name: selectedProduct.product_name,
      product_sku: selectedProduct.sku,
      system_qty: system,
      actual_qty: actual,
      cost_price: selectedProduct.cost_price,
      status,
      variance,
      variance_value: varianceValue,
    });

    if (error) {
      toast.error('خطأ في تسجيل المنتج');
      return;
    }

    if (isManager) {
      await supabase.from('stock_items').update({
        current_qty: actual,
        last_audit_date: new Date().toISOString(),
      }).eq('id', selectedProduct.id);

      // Log into product_history
      await supabase.from('product_history').insert({
        stock_item_id: selectedProduct.id,
        product_name: selectedProduct.product_name,
        type: 'audit',
        quantity: variance,
        price: selectedProduct.cost_price,
        total_value: varianceValue,
        reference_id: activeSession.id,
        performed_by_name: (user as any)?.nameAr || (user as any)?.name || 'مدير'
      });
    }

    if (variance === 0) {
      toast.success('مطابقة تامة! رصيد سليم ✅', { icon: '✅', style: { background: '#10B981', color: '#fff' } });
    } else if (variance < 0) {
      toast.error(`عجز بمقدار ${Math.abs(variance)} ${selectedProduct.unit} 🔻`, { icon: '🔻', style: { background: '#EF4444', color: '#fff' } });
    } else {
      toast.success(`زيادة بمقدار ${variance} ${selectedProduct.unit} 🔺`, { icon: '🔺', style: { background: '#F59E0B', color: '#fff' } });
    }

    setSelectedProduct(null);
    setActualQty('');
    fetchAuditItems();
  }

  // Voice
  function toggleVoice() {
    if (isRecording) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsRecording(false);
      return;
    }
    if (!('webkitSpeechRecognition' in window)) { toast.error('غير مدعوم في المتصفح'); return; }
    const SpeechRecognition = (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'ar-EG';
    recognition.onresult = (e: any) => {
      const trans = e.results[0][0].transcript;
      setSearch(trans);
      setIsRecording(false);
      toast.success(`تم البحث: ${trans}`);
    };
    recognition.onend = () => setIsRecording(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  }

  const handleScanResult = useCallback(async (result: { rawValue: string; decodedValue: string; format: string }) => {
    setScannerOpen(false);
    const p = stockItems.find(x => x.barcode === result.decodedValue || x.sku === result.decodedValue);
    if (p) {
      if (!activeSession) {
        setScannedCode(result.decodedValue);
        setProductCardOpen(true);
      } else {
        setSelectedProduct(p);
      }
    } else {
      toast.error('لم يتم العثور على المنتج');
    }
  }, [stockItems, activeSession]);

  const filtered = stockItems.filter(p => {
    const nSearch = normalizeArabic(search);
    const ms = !search || normalizeArabic(p.product_name).includes(nSearch) || p.sku.includes(search) || (p.barcode && p.barcode.includes(search));
    return category === 'all' || category === 'الكل' ? ms : ms && p.category === category;
  });

  if (loading) return <div className="text-center py-8 text-gray-500">جاري التحميل...</div>;

  return (
    <div className="flex flex-col lg:flex-row flex-1 h-full gap-4 overflow-hidden" dir="rtl">
      
      {/* ─── Audit Action Panel (First in DOM) ─── */}
      <div className="w-full lg:w-96 flex flex-col overflow-hidden bg-white/60 dark:bg-slate-900/60 rounded-3xl border border-white/20 shadow-lg shrink-0 lg:min-h-0 order-1">
        
        {!activeSession ? (
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 text-center">
            <Package className="w-16 h-16 mx-auto mb-4 text-emerald-500 opacity-50" />
            <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">لا توجد جلسة جرد نشطة</h3>
            <p className="text-gray-500 text-sm mb-6">ابدأ جلسة جرد جديدة لتسجيل ومطابقة كميات المنتجات الفعلية مع النظام</p>
            <button
              onClick={() => setShowStartModal(true)}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold transition-colors"
            >
              بدء جرد جديد
            </button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-emerald-500/10">
              <div>
                <h3 className="font-bold text-emerald-600 dark:text-emerald-400">جلسة جرد نشطة</h3>
                <p className="text-xs text-gray-500">{auditItems.length} صنف تم جرده</p>
              </div>
              <button onClick={completeAudit} className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-500 text-xs font-bold hover:bg-red-500/30">
                إنهاء الجرد
              </button>
            </div>

            {selectedProduct ? (
              <div className="p-6 flex-1 overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-lg">{selectedProduct.product_name}</h4>
                  <button onClick={() => setSelectedProduct(null)} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700"><X size={16} /></button>
                </div>
                
                <div className="grid grid-cols-2 gap-3 mb-6 text-sm">
                  <div className="p-3 rounded-xl bg-white/50 dark:bg-slate-800/50 border border-white/40">
                    <span className="block text-[10px] text-gray-500 uppercase mb-1">الرصيد الدفتري</span>
                    <span className="font-black text-blue-600 text-lg">{selectedProduct.current_qty} {selectedProduct.unit}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white/50 dark:bg-slate-800/50 border border-white/40">
                    <span className="block text-[10px] text-gray-500 uppercase mb-1">التكلفة</span>
                    <span className="font-bold">{selectedProduct.cost_price} ج.م</span>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-xs font-bold text-gray-500 mb-2">أدخل الكمية الفعلية المجردة</label>
                  <input
                    type="number" value={actualQty} onChange={(e) => setActualQty(e.target.value)}
                    placeholder="0"
                    className="w-full px-6 py-4 rounded-2xl bg-white dark:bg-slate-900 border-2 border-emerald-500/50 text-center text-3xl font-black text-emerald-600 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 transition-all shadow-inner"
                  />
                </div>

                <button onClick={submitItem} disabled={!actualQty} className="w-full py-4 rounded-2xl bg-gradient-to-l from-emerald-500 to-teal-600 text-white font-black hover:opacity-90 transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-2">
                  <Check className="w-5 h-5" /> تسجيل المطابقة
                </button>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-4 bg-white/20 dark:bg-slate-900/20">
                {auditItems.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400">
                    <ScanLine className="w-12 h-12 mb-2 opacity-50" />
                    <p className="text-sm">اختر منتج من القائمة لجرد كميته</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {auditItems.map(item => (
                      <div key={item.id} className="p-3 rounded-xl bg-white/60 dark:bg-slate-800/60 border border-white/20 text-sm">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold truncate">{item.product_name}</span>
                          {item.status === 'matched' ? <Check size={14} className="text-emerald-500 shrink-0" /> :
                           item.status === 'shortage' ? <TrendingDown size={14} className="text-red-500 shrink-0" /> :
                           <TrendingUp size={14} className="text-amber-500 shrink-0" />}
                        </div>
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>دفتري: {item.system_qty}</span>
                          <span>فعلي: {item.actual_qty}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Product Grid Area (Second in DOM) ─── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white/40 dark:bg-slate-900/40 rounded-3xl border border-white/20 shadow-lg lg:min-h-0 order-2">
        {/* Top bar */}
        <div className="p-4 border-b border-white/10 flex items-center gap-2 bg-white/20 dark:bg-slate-800/20">
          <div className="flex-1 relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث عن منتج للجرد..."
              className="w-full pr-10 pl-4 py-2.5 rounded-xl bg-white/50 dark:bg-slate-900/50 border-none text-sm focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>
          <Tooltip text="المساعد الصوتي">
            <button onClick={toggleVoice} className={cn("h-10 w-10 flex items-center justify-center rounded-xl transition-colors", isRecording ? "bg-red-500 text-white" : "bg-white/50 dark:bg-slate-900/50 text-gray-500 hover:bg-white/80")}>
              <Mic className="w-4 h-4" />
            </button>
          </Tooltip>
          <Tooltip text="مسح باركود">
            <button onClick={() => { setScannerMode('barcode'); setScannerOpen(true); }} className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/50 dark:bg-slate-900/50 text-gray-500 hover:bg-white/80 transition-colors">
              <ScanLine className="w-4 h-4" />
            </button>
          </Tooltip>
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

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-3 scrollbar-hide">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2 pb-20">
            {filtered.map(p => (
              <ProductGridBtn
                key={p.id} product={p}
                audited={auditItems.some(i => i.stock_item_id === p.id)}
                onClick={(p) => {
                  if (!activeSession) { 
                    setScannedCode(p.barcode || p.sku || p.id);
                    setProductCardOpen(true);
                    return; 
                  }
                  setSelectedProduct(p);
                  setActualQty('');
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <UnifiedScanner isOpen={scannerOpen} onClose={() => setScannerOpen(false)} onScan={handleScanResult} mode={scannerMode} />
      <ProductMasterCard isOpen={productCardOpen} onClose={() => setProductCardOpen(false)} barcode={scannedCode} />

      {/* ─── Modals ─── */}
      {showStartModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-gray-100 dark:border-slate-800">
            <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-xl font-bold">بدء جلسة جرد جديدة</h3>
              <button onClick={() => setShowStartModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-500 mb-4">اختر طريقة الجرد المناسبة لك:</p>
              
              <button onClick={() => startAudit('manual')} className="w-full p-4 rounded-2xl border-2 border-emerald-500/20 hover:border-emerald-500 bg-emerald-500/5 hover:bg-emerald-500/10 transition-all text-right group">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-emerald-500 text-white flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white text-lg">جرد يدوي</h4>
                    <p className="text-xs text-gray-500 mt-1">البحث عن المنتجات وتحديث كمياتها يدوياً</p>
                  </div>
                </div>
              </button>

              <button onClick={() => startAudit('voice')} className="w-full p-4 rounded-2xl border-2 border-blue-500/20 hover:border-blue-500 bg-blue-500/5 hover:bg-blue-500/10 transition-all text-right group">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-blue-500 text-white flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
                    <Mic className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white text-lg">جرد بالصوت</h4>
                    <p className="text-xs text-gray-500 mt-1">نطق اسم المنتج وسيتم البحث عنه فوراً</p>
                  </div>
                </div>
              </button>

              <button onClick={() => startAudit('ocr')} className="w-full p-4 rounded-2xl border-2 border-purple-500/20 hover:border-purple-500 bg-purple-500/5 hover:bg-purple-500/10 transition-all text-right group">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-purple-500 text-white flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
                    <ScanLine className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white text-lg">جرد بالكاميرا / باركود</h4>
                    <p className="text-xs text-gray-500 mt-1">مسح الباركود للوصول للمنتج بدقة</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {showReportModal && reportData && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-gray-100 dark:border-slate-800">
            <div className="bg-gradient-to-l from-emerald-500 to-teal-600 p-6 text-white text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 backdrop-blur-sm">
                <Check className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-black mb-1">تم إغلاق الجرد بنجاح</h3>
              <p className="text-emerald-100 text-sm">تم تسجيل جميع التسويات وحفظ التقرير</p>
            </div>
            
            <div className="p-6">
              <h4 className="font-bold text-gray-900 dark:text-white mb-4">ملخص نتائج الجرد</h4>
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700/50 text-center">
                  <span className="block text-3xl font-black text-gray-900 dark:text-white mb-1">{reportData.total}</span>
                  <span className="text-xs text-gray-500 font-bold uppercase">إجمالي الأصناف المجردة</span>
                </div>
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 text-center">
                  <span className="block text-3xl font-black text-emerald-600 dark:text-emerald-400 mb-1">{reportData.matched}</span>
                  <span className="text-xs text-emerald-600/70 dark:text-emerald-400/70 font-bold uppercase">أصناف مطابقة</span>
                </div>
                <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 text-center">
                  <span className="block text-3xl font-black text-red-600 dark:text-red-400 mb-1">{reportData.shortage}</span>
                  <span className="text-xs text-red-600/70 dark:text-red-400/70 font-bold uppercase">أصناف بها عجز</span>
                </div>
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 text-center">
                  <span className="block text-3xl font-black text-amber-600 dark:text-amber-400 mb-1">{reportData.overage}</span>
                  <span className="text-xs text-amber-600/70 dark:text-amber-400/70 font-bold uppercase">أصناف بها زيادة</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-gray-100 dark:bg-slate-800 flex justify-between items-center mb-6">
                <span className="font-bold text-gray-600 dark:text-gray-300">القيمة الإجمالية للتسوية:</span>
                <span className={`text-xl font-black ${reportData.value < 0 ? 'text-red-500' : reportData.value > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                  {reportData.value} ج.م
                </span>
              </div>

              <button onClick={closeReportAndReset} className="w-full py-4 rounded-2xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold hover:opacity-90 transition-opacity">
                إغلاق والعودة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
