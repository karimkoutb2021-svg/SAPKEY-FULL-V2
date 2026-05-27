'use client';

import { useEffect, useState, useRef } from 'react';
import { normalizeArabic } from '@/lib/arabic-normalize';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/lib/store/auth-store';
import { auditService, inventoryService } from '@/lib/supabase/services/inventory';
import { auditItemService, warehouseService, productHistoryService } from '@/lib/supabase/services/procurement';
import { UnifiedScanner } from '@/components/scanner/unified-scanner';
import { ProductCardModal } from '@/components/scanner/product-card-modal';
import { Mic, MicOff, Camera, FileText, Check, X, AlertTriangle, TrendingUp, TrendingDown, Minus, Search, Package, ChevronRight, ChevronLeft, Eye, Download, BarChart3, Clock } from 'lucide-react';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';

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
  shelf_location?: string;
  voice_input?: string;
}

interface AuditSession {
  id: string;
  type: 'voice' | 'ocr' | 'manual';
  status: 'in_progress' | 'completed' | 'cancelled';
  total_items: number;
  matched_items: number;
  discrepancies: number;
  started_at: string;
  completed_at?: string;
  notes?: string;
}

export default function AuditPage() {
  const auth = useAuthStore();
  const user = auth.user;
  const [sessions, setSessions] = useState<AuditSession[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [auditItems, setAuditItems] = useState<AuditItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Active audit
  const [activeSession, setActiveSession] = useState<AuditSession | null>(null);
  const [auditMode, setAuditMode] = useState<'voice' | 'ocr' | 'manual' | null>(null);

  // Voice audit
  const [isRecording, setIsRecording] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [searchedProduct, setSearchedProduct] = useState<StockItem | null>(null);
  const [actualQtyInput, setActualQtyInput] = useState('');
  const [varianceResult, setVarianceResult] = useState<{ status: string; variance: number; value: number } | null>(null);
  const recognitionRef = useRef<any>(null);

  // OCR audit
  const [ocrImage, setOcrImage] = useState<string | null>(null);
  const [ocrProcessing, setOcrProcessing] = useState(false);

  // Manual audit
  const [manualSearch, setManualSearch] = useState('');
  const [selectedManualItem, setSelectedManualItem] = useState<StockItem | null>(null);
  const [manualActualQty, setManualActualQty] = useState('');

  // Product passport
  const [productCardOpen, setProductCardOpen] = useState(false);
  const [scannedCode, setScannedCode] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerMode, setScannerMode] = useState<'qr' | 'barcode'>('barcode');

  // Variance report
  const [showVarianceReport, setShowVarianceReport] = useState(false);

  useEffect(() => {
    fetchData();

    const channel = supabase.channel('audit-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'audit_sessions' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'audit_items' }, () => fetchAuditItems())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'audit_ocr_results' }, () => fetchData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  async function fetchData() {
    const [sessionsRes, stockRes] = await Promise.all([
      auditService.getAll(),
      inventoryService.getAll(),
    ]);
    if (sessionsRes.data) setSessions(sessionsRes.data);
    if (stockRes.data) setStockItems(stockRes.data);
    setLoading(false);
  }

  async function fetchAuditItems() {
    if (activeSession) {
      const res = await auditItemService.getAll(activeSession.id);
      if (res.data) setAuditItems(res.data);
    }
  }

  async function startAudit(type: 'voice' | 'ocr' | 'manual') {
    const res = await auditService.create({
      type,
      status: 'in_progress',
      total_items: 0,
      matched_items: 0,
      discrepancies: 0,
      started_at: new Date().toISOString(),
      started_by: user?.id,
    });
    if (res.data) {
      setActiveSession(res.data);
      setAuditMode(type);
    }
  }

  async function completeAudit() {
    if (!activeSession) return;

    const matched = auditItems.filter(i => i.status === 'matched').length;
    const discrepancies = auditItems.filter(i => i.status !== 'matched').length;

    await auditService.update(activeSession.id, {
      status: 'completed',
      completed_at: new Date().toISOString(),
      total_items: auditItems.length,
      matched_items: matched,
      discrepancies,
    });

    toast.success('تم إنهاء الجرد بنجاح');
    setActiveSession(null);
    setAuditMode(null);
    setAuditItems([]);
    setSearchedProduct(null);
    setVarianceResult(null);
    fetchData();
  }

  // Voice recognition
  function startVoiceRecognition() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error('المتصفح لا يدعم التعرف على الصوت');
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'ar-EG';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setVoiceTranscript(transcript);
      setIsRecording(false);
      processVoiceSearch(transcript);
    };

    recognition.onerror = () => {
      setIsRecording(false);
      toast.error('خطأ في التعرف على الصوت');
    };

    recognition.onend = () => setIsRecording(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  }

  function stopVoiceRecognition() {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  }

  function processVoiceSearch(transcript: string) {
    // Egyptian Arabic NLP
    let processed = normalizeArabic(transcript);

    // Remove common words (after normalization: عايز -> عايز, وريني -> وريني, etc.)
    processed = processed.replace(/عايز|وريني|ابحث عن|الصنف|رقم|الرف/g, '').trim();

    // Search in products
    const found = stockItems.find(item =>
      normalizeArabic(item.product_name).includes(processed) ||
      item.sku.toLowerCase().includes(processed) ||
      (item.barcode && item.barcode.includes(processed)) ||
      (item.location && item.location.toLowerCase().includes(processed))
    );

    if (found) {
      setSearchedProduct(found);
      setActualQtyInput('');
      setVarianceResult(null);
      setScannedCode(found.sku || found.barcode || found.id);
      setProductCardOpen(true);
      setScannerMode('barcode');
    } else {
      toast.error('لم يتم العثور على المنتج');
    }
  }

  async function submitAuditItem() {
    if (!searchedProduct || !actualQtyInput || !activeSession) return;

    const actualQty = parseFloat(actualQtyInput);
    const systemQty = searchedProduct.current_qty;
    const variance = actualQty - systemQty;
    const varianceValue = variance * searchedProduct.cost_price;

    let status: AuditItem['status'] = 'matched';
    if (variance < 0) status = 'shortage';
    else if (variance > 0) status = 'overage';

    const res = await auditItemService.create({
      audit_session_id: activeSession.id,
      stock_item_id: searchedProduct.id,
      product_name: searchedProduct.product_name,
      product_sku: searchedProduct.sku,
      system_qty: systemQty,
      actual_qty: actualQty,
      cost_price: searchedProduct.cost_price,
      status,
      notes: variance !== 0 ? `انحراف: ${variance} | القيمة: ${varianceValue} ج.م` : '',
      shelf_location: searchedProduct.location,
      voice_input: voiceTranscript || undefined,
    });

    if (res.data) {
      setAuditItems(prev => [...prev, res.data as AuditItem]);

      // Update stock if manager
      if (user?.role === 'manager' || user?.role === 'admin') {
        await supabase.from('stock_items').update({
          current_qty: actualQty,
          last_audit_date: new Date().toISOString(),
          last_audit_by: user?.id,
          updated_at: new Date().toISOString(),
        }).eq('id', searchedProduct.id);
      }

      setVarianceResult({
        status: status === 'matched' ? 'matched' : status === 'shortage' ? 'shortage' : 'overage',
        variance,
        value: varianceValue,
      });

      toast.success(status === 'matched' ? 'مطابق ✓' : `تم التسجيل - ${status === 'shortage' ? 'عجز' : 'زيادة'}`);
    }

    // Reset for next item
    setTimeout(() => {
      setSearchedProduct(null);
      setActualQtyInput('');
      setVarianceResult(null);
      setVoiceTranscript('');
    }, 2000);
  }

  // OCR
  async function handleOCRUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      setOcrImage(evt.target?.result as string);
    };
    reader.readAsDataURL(file);
  }

  async function processOCR() {
    if (!ocrImage || !activeSession) return;
    setOcrProcessing(true);

    // Simulate OCR processing (in production, use Tesseract.js or API)
    await new Promise(r => setTimeout(r, 2000));

    // For now, create a mock audit item
    toast.success('تم معالجة الصورة - أضف النتائج يدوياً');
    setOcrProcessing(false);
  }

  // Manual audit
  const filteredManualItems = stockItems.filter(item =>
    normalizeArabic(item.product_name).includes(normalizeArabic(manualSearch)) ||
    item.sku.toLowerCase().includes(manualSearch.toLowerCase()) ||
    (item.barcode && item.barcode.includes(manualSearch))
  );

  async function submitManualAudit() {
    if (!selectedManualItem || !manualActualQty || !activeSession) return;

    const actualQty = parseFloat(manualActualQty);
    const systemQty = selectedManualItem.current_qty;
    const variance = actualQty - systemQty;
    const varianceValue = variance * selectedManualItem.cost_price;

    let status: AuditItem['status'] = 'matched';
    if (variance < 0) status = 'shortage';
    else if (variance > 0) status = 'overage';

    await auditItemService.create({
      audit_session_id: activeSession.id,
      stock_item_id: selectedManualItem.id,
      product_name: selectedManualItem.product_name,
      product_sku: selectedManualItem.sku,
      system_qty: systemQty,
      actual_qty: actualQty,
      cost_price: selectedManualItem.cost_price,
      status,
      notes: variance !== 0 ? `انحراف: ${variance} | القيمة: ${varianceValue} ج.م` : '',
      shelf_location: selectedManualItem.location,
    });

    if (user?.role === 'manager' || user?.role === 'admin') {
      await supabase.from('stock_items').update({
        current_qty: actualQty,
        last_audit_date: new Date().toISOString(),
        last_audit_by: user?.id,
        updated_at: new Date().toISOString(),
      }).eq('id', selectedManualItem.id);
    }

    toast.success('تم تسجيل الجرد');
    setSelectedManualItem(null);
    setManualActualQty('');
    fetchAuditItems();
  }

  // Export variance report
  function exportVarianceReport() {
    const data = auditItems.map(item => ({
      'المنتج': item.product_name,
      'SKU': item.product_sku,
      'الكمية الدفترية': item.system_qty,
      'الكمية الفعلية': item.actual_qty,
      'الفارق': item.variance,
      'القيمة المالية': item.variance_value,
      'الحالة': item.status === 'matched' ? 'مطابق' : item.status === 'shortage' ? 'عجز' : 'زيادة',
      'الموقع': item.shelf_location || '-',
      'ملاحظات': item.notes || '-',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'تقرير الفروقات');
    XLSX.writeFile(wb, `audit-variance-${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('تم تصدير التقرير');
  }

  // Export audit sheet for printing
  function exportAuditSheet() {
    const data = stockItems.map(item => ({
      'كود المنتج': item.sku,
      'اسم الصنف': item.product_name,
      'القسم': item.category || '-',
      'الموقع': item.location || '-',
      'الوحدة': item.unit,
      'الكمية الدفترية': item.current_qty,
      'الكمية الفعلية': '',
      'ملاحظات': '',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [
      { wch: 15 }, { wch: 30 }, { wch: 15 }, { wch: 15 },
      { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 25 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'كشف الجرد');
    XLSX.writeFile(wb, `audit-sheet-${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('تم تصدير كشف الجرد');
  }

  if (loading) return <div className="text-center py-8 text-gray-500">جاري التحميل...</div>;

  // Active audit view
  if (activeSession) {
    return (
      <div className="space-y-6">
        {/* Session header */}
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold">
              جرد {auditMode === 'voice' ? 'صوتي' : auditMode === 'ocr' ? 'بالكاميرا' : 'يدوي'}
            </h3>
            <p className="text-xs text-gray-400">{auditItems.length} صنف تم جرده</p>
          </div>
          <div className="flex gap-2">
            <button onClick={exportVarianceReport} className="px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-400 text-xs hover:bg-blue-500/30 transition-colors flex items-center gap-1">
              <Download size={12} /> تقرير
            </button>
            <button onClick={completeAudit} className="px-4 py-1.5 rounded-lg bg-emerald-500 text-xs hover:bg-emerald-600 transition-colors font-medium">
              إنهاء الجرد
            </button>
          </div>
        </div>

        {/* Voice Audit */}
        {auditMode === 'voice' && (
          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6">
            <div className="max-w-md mx-auto">
              {/* Search */}
              {!searchedProduct && !varianceResult && (
                <div className="text-center mb-6">
                  <button
                    onClick={isRecording ? stopVoiceRecognition : startVoiceRecognition}
                    className={cn('w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 transition-all duration-300',
                      isRecording ? 'bg-red-500/20 border-2 border-red-500 animate-pulse' : 'bg-emerald-500/20 border-2 border-emerald-500 hover:bg-emerald-500/30'
                    )}
                  >
                    {isRecording ? <MicOff className="w-8 h-8 text-red-400" /> : <Mic className="w-8 h-8 text-emerald-400" />}
                  </button>
                  <p className="text-sm text-gray-400 mb-3">{isRecording ? 'جاري التسجيل... تحدث باسم المنتج أو الكود' : 'اضغط للبحث الصوتي'}</p>

                  {voiceTranscript && (
                    <div className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.08] mb-3">
                      <p className="text-xs text-gray-400 mb-1">سمعت:</p>
                      <p className="text-sm font-medium">{voiceTranscript}</p>
                    </div>
                  )}

                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      value={manualSearch}
                      onChange={(e) => setManualSearch(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && manualSearch) {
                          processVoiceSearch(manualSearch);
                        }
                      }}
                      placeholder="أو اكتب للبحث..."
                      className="w-full pr-10 pl-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm focus:outline-none focus:border-emerald-500/50"
                    />
                  </div>

                  {filteredManualItems.length > 0 && manualSearch && !searchedProduct && (
                    <div className="mt-3 space-y-1 max-h-40 overflow-y-auto">
                      {filteredManualItems.slice(0, 5).map(item => (
                        <button
                          key={item.id}
                          onClick={() => { setSearchedProduct(item); setManualSearch(''); setScannedCode(item.sku || item.barcode || item.id); setProductCardOpen(true); setScannerMode('barcode'); }}
                          className="w-full flex items-center justify-between p-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] transition-colors text-sm"
                        >
                          <span>{item.product_name}</span>
                          <span className="text-xs text-gray-400">{item.sku}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Product found - enter actual qty */}
              {searchedProduct && !varianceResult && (
                <div className="space-y-6">
                  <div className="p-6 rounded-3xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-3xl border border-white/20 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
                    
                    <div className="flex items-center justify-between mb-6 relative z-10">
                      <h4 className="text-xl font-black text-gray-900 dark:text-white">{searchedProduct.product_name}</h4>
                      <button onClick={() => { setSearchedProduct(null); setVoiceTranscript(''); }} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-gray-500 hover:bg-red-100 hover:text-red-500 transition-colors">
                        <X size={16} />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-500 dark:text-gray-400 relative z-10 mb-8">
                      <div className="p-3 bg-white/50 dark:bg-slate-800/50 rounded-xl border border-white/40 dark:border-slate-700">
                        <span className="block text-[10px] uppercase font-bold mb-1">الكود</span>
                        <span className="text-gray-900 dark:text-white font-mono font-bold">{searchedProduct.sku}</span>
                      </div>
                      <div className="p-3 bg-white/50 dark:bg-slate-800/50 rounded-xl border border-white/40 dark:border-slate-700">
                        <span className="block text-[10px] uppercase font-bold mb-1">الموقع</span>
                        <span className="text-gray-900 dark:text-white font-bold">{searchedProduct.location || '-'}</span>
                      </div>
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
                        <span className="block text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 mb-1">الرصيد الدفتري</span>
                        <span className="text-blue-700 dark:text-blue-300 font-black text-lg">{searchedProduct.current_qty} {searchedProduct.unit}</span>
                      </div>
                      <div className="p-3 bg-white/50 dark:bg-slate-800/50 rounded-xl border border-white/40 dark:border-slate-700">
                        <span className="block text-[10px] uppercase font-bold mb-1">التكلفة</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">{searchedProduct.cost_price} ج.م</span>
                      </div>
                    </div>

                    <div className="text-center relative z-10">
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">أدخل الكمية الفعلية المجردة</label>
                      <input
                        type="number"
                        value={actualQtyInput}
                        onChange={(e) => setActualQtyInput(e.target.value)}
                        placeholder="0"
                        className="w-full px-6 py-5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-gray-200 dark:border-slate-700 text-center text-4xl font-black text-emerald-600 dark:text-emerald-400 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 transition-all shadow-inner"
                      />
                    </div>
                  </div>

                  <button
                    onClick={submitAuditItem}
                    disabled={!actualQtyInput}
                    className="w-full py-4 rounded-2xl bg-gradient-to-l from-emerald-500 to-teal-600 text-white font-black hover:opacity-90 transition-all shadow-xl disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2 text-lg"
                  >
                    <Check className="w-6 h-6" />
                    تأكيد ومطابقة
                  </button>
                </div>
              )}

              {/* Variance result */}
              {varianceResult && (
                <div className={cn('p-8 rounded-3xl text-center shadow-2xl relative overflow-hidden backdrop-blur-3xl border',
                  varianceResult.status === 'matched' ? 'bg-emerald-50/90 dark:bg-emerald-900/40 border-emerald-200 dark:border-emerald-800' :
                  varianceResult.status === 'shortage' ? 'bg-red-50/90 dark:bg-red-900/40 border-red-200 dark:border-red-800' :
                  'bg-amber-50/90 dark:bg-amber-900/40 border-amber-200 dark:border-amber-800'
                )}>
                  
                  <div className={cn('absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none opacity-50',
                    varianceResult.status === 'matched' ? 'bg-emerald-400' :
                    varianceResult.status === 'shortage' ? 'bg-red-400' : 'bg-amber-400'
                  )} />

                  <div className={cn('w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner relative z-10',
                    varianceResult.status === 'matched' ? 'bg-emerald-100 dark:bg-emerald-800/50' :
                    varianceResult.status === 'shortage' ? 'bg-red-100 dark:bg-red-800/50' :
                    'bg-amber-100 dark:bg-amber-800/50'
                  )}>
                    {varianceResult.status === 'matched' ? <Check className="w-12 h-12 text-emerald-600 dark:text-emerald-400" /> :
                     varianceResult.status === 'shortage' ? <TrendingDown className="w-12 h-12 text-red-600 dark:text-red-400" /> :
                     <TrendingUp className="w-12 h-12 text-amber-600 dark:text-amber-400" />}
                  </div>
                  
                  <h4 className={cn("text-3xl font-black mb-2 relative z-10",
                    varianceResult.status === 'matched' ? 'text-emerald-700 dark:text-emerald-400' :
                    varianceResult.status === 'shortage' ? 'text-red-700 dark:text-red-400' :
                    'text-amber-700 dark:text-amber-400'
                  )}>
                    {varianceResult.status === 'matched' ? 'رصيد مطابق ✓' :
                     varianceResult.status === 'shortage' ? 'يوجد عجز بالمخزون' : 'يوجد زيادة بالمخزون'}
                  </h4>
                  
                  <div className="flex items-center justify-center gap-4 mt-6 relative z-10">
                    <div className="bg-white/60 dark:bg-slate-900/60 px-4 py-2 rounded-xl">
                      <span className="block text-[10px] font-bold text-gray-500 uppercase">الفارق الكمي</span>
                      <span className="text-lg font-black text-gray-900 dark:text-white" dir="ltr">{varianceResult.variance > 0 ? '+' : ''}{varianceResult.variance}</span>
                    </div>
                    <div className="bg-white/60 dark:bg-slate-900/60 px-4 py-2 rounded-xl">
                      <span className="block text-[10px] font-bold text-gray-500 uppercase">الأثر المالي</span>
                      <span className="text-lg font-black text-gray-900 dark:text-white" dir="ltr">{varianceResult.value > 0 ? '+' : ''}{varianceResult.value.toLocaleString('ar-EG')} ج.م</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setVarianceResult(null);
                      setSearchedProduct(null);
                      setVoiceTranscript('');
                      setActualQtyInput('');
                    }}
                    className="mt-8 px-8 py-3 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold hover:scale-105 transition-transform shadow-xl relative z-10"
                  >
                    متابعة الجرد
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* OCR Audit */}
        {auditMode === 'ocr' && (
          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6">
            <div className="text-center">
              <div className="w-48 h-48 mx-auto rounded-2xl border-2 border-dashed border-white/[0.1] flex items-center justify-center mb-4 overflow-hidden">
                {ocrImage ? (
                  <img src={ocrImage} alt="OCR" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-12 h-12 text-gray-500" />
                )}
              </div>
              <p className="text-sm text-gray-400 mb-4">صور كشف الجرد المكتوب بخط اليد</p>

              <input type="file" accept="image/*" onChange={handleOCRUpload} className="hidden" id="ocr-upload" />
              <label htmlFor="ocr-upload" className="px-6 py-2 rounded-xl bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors cursor-pointer text-sm font-medium inline-block mx-2">
                اختيار صورة
              </label>

              {ocrImage && (
                <button onClick={processOCR} disabled={ocrProcessing} className="px-6 py-2 rounded-xl bg-emerald-500 text-sm hover:bg-emerald-600 transition-colors font-medium disabled:opacity-50 mx-2">
                  {ocrProcessing ? 'جاري المعالجة...' : 'معالجة OCR'}
                </button>
              )}

              <p className="text-xs text-gray-500 mt-4">أضف النتائج يدوياً بعد معالجة الصورة</p>
            </div>
          </div>
        )}

        {/* Manual Audit */}
        {auditMode === 'manual' && (
          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6">
            <div className="relative mb-4">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={manualSearch}
                onChange={(e) => setManualSearch(e.target.value)}
                placeholder="ابحث عن منتج..."
                className="w-full pr-10 pl-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm focus:outline-none focus:border-emerald-500/50"
              />
            </div>

            {!selectedManualItem ? (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {filteredManualItems.slice(0, 20).map(item => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedManualItem(item)}
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] transition-colors text-sm"
                  >
                    <div>
                      <p className="font-medium">{item.product_name}</p>
                      <p className="text-xs text-gray-400">{item.sku} • دفتری: {item.current_qty} {item.unit}</p>
                    </div>
                    <ChevronLeft size={16} className="text-gray-500" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">{selectedManualItem.product_name}</h4>
                    <button onClick={() => setSelectedManualItem(null)} className="text-gray-400 hover:text-white"><X size={16} /></button>
                  </div>
                  <p className="text-xs text-gray-400">دفتری: <span className="text-white font-bold">{selectedManualItem.current_qty} {selectedManualItem.unit}</span></p>
                </div>

                <input
                  type="number"
                  value={manualActualQty}
                  onChange={(e) => setManualActualQty(e.target.value)}
                  placeholder="الكمية الفعلية..."
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-center text-xl font-bold focus:outline-none focus:border-emerald-500/50"
                />

                <button onClick={submitManualAudit} disabled={!manualActualQty} className="w-full py-3 rounded-xl bg-emerald-500 text-sm hover:bg-emerald-600 transition-colors font-medium disabled:opacity-50">
                  تسجيل
                </button>
              </div>
            )}
          </div>
        )}

        {/* Audit items list */}
        {auditItems.length > 0 && (
          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6">
            <h3 className="text-sm font-semibold mb-3">الأصناف المجرودة ({auditItems.length})</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {auditItems.map(item => (
                <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02]">
                  <div className="flex items-center gap-3">
                    {item.status === 'matched' ? <Check size={14} className="text-emerald-400" /> :
                     item.status === 'shortage' ? <TrendingDown size={14} className="text-red-400" /> :
                     <TrendingUp size={14} className="text-amber-400" />}
                    <div>
                      <p className="text-sm font-medium">{item.product_name}</p>
                      <p className="text-xs text-gray-400">دفتری: {item.system_qty} | فعلي: {item.actual_qty}</p>
                    </div>
                  </div>
                  {item.variance !== 0 && (
                    <span className={cn('text-xs px-2 py-0.5 rounded-full',
                      item.variance < 0 ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
                    )}>
                      {item.variance > 0 ? '+' : ''}{item.variance} ({item.variance_value > 0 ? '+' : ''}{item.variance_value} ج.م)
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Audit type selection
  return (
    <div className="space-y-6">
      {/* Start new audit */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6">
        <h2 className="text-lg font-semibold mb-4">بدء جرد جديد</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button onClick={() => startAudit('voice')} className="group p-6 rounded-xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] hover:border-emerald-500/30 transition-all duration-300 text-center">
            <Mic className="w-10 h-10 text-emerald-400 mx-auto mb-3 group-hover:scale-110 transition-transform" />
            <h3 className="font-semibold mb-1">الجرد الصوتي</h3>
            <p className="text-sm text-gray-400">ابحث صوتياً وأدخل الكميات</p>
          </button>
          <button onClick={() => startAudit('ocr')} className="group p-6 rounded-xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] hover:border-blue-500/30 transition-all duration-300 text-center">
            <Camera className="w-10 h-10 text-blue-400 mx-auto mb-3 group-hover:scale-110 transition-transform" />
            <h3 className="font-semibold mb-1">جرد بالكاميرا</h3>
            <p className="text-sm text-gray-400">صور كشف الجرد المكتوب</p>
          </button>
          <button onClick={() => startAudit('manual')} className="group p-6 rounded-xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] hover:border-purple-500/30 transition-all duration-300 text-center">
            <FileText className="w-10 h-10 text-purple-400 mx-auto mb-3 group-hover:scale-110 transition-transform" />
            <h3 className="font-semibold mb-1">جرد يدوي</h3>
            <p className="text-sm text-gray-400">أدخل البيانات يدوياً</p>
          </button>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex gap-3">
        <button onClick={exportAuditSheet} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-sm hover:bg-white/[0.08] transition-colors">
          <Download size={14} /> تصدير كشف الجرد
        </button>
        <button onClick={() => { setScannerMode('barcode'); setScannerOpen(true); }} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-sm hover:bg-white/[0.08] transition-colors">
          <Eye size={14} /> فحص منتج
        </button>
      </div>

      {/* History */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6">
        <h2 className="text-lg font-semibold mb-4">سجل الجرد</h2>
        {sessions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">لا توجد جلسات جرد</div>
        ) : (
          <div className="space-y-2">
            {sessions.map(session => {
              const statusColors = { in_progress: 'bg-blue-500/20 text-blue-400', completed: 'bg-emerald-500/20 text-emerald-400', cancelled: 'bg-gray-500/20 text-gray-400' };
              const statusLabels = { in_progress: 'قيد التنفيذ', completed: 'مكتمل', cancelled: 'ملغي' };
              return (
                <div key={session.id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                  <div className="flex items-center gap-3">
                    {session.type === 'voice' ? <Mic size={16} className="text-emerald-400" /> :
                     session.type === 'ocr' ? <Camera size={16} className="text-blue-400" /> :
                     <FileText size={16} className="text-purple-400" />}
                    <div>
                      <p className="text-sm font-medium">جرد {session.type === 'voice' ? 'صوتي' : session.type === 'ocr' ? 'بالكاميرا' : 'يدوي'}</p>
                      <p className="text-xs text-gray-500">{new Date(session.started_at).toLocaleDateString('ar-EG')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400">{session.matched_items}/{session.total_items} مطابق</span>
                    <span className={cn('text-xs px-2 py-0.5 rounded-full', statusColors[session.status])}>{statusLabels[session.status]}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Scanner */}
      <UnifiedScanner
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={(result) => {
          setScannedCode(result.decodedValue || result.rawValue);
          setProductCardOpen(true);
          setScannerOpen(false);
        }}
        mode={scannerMode}
      />
      <ProductCardModal
        isOpen={productCardOpen}
        onClose={() => setProductCardOpen(false)}
        scannedCode={scannedCode}
        mode={scannerMode}
      />
    </div>
  );
}
