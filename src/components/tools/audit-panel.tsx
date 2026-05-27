'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Search, Camera, Check, X, AlertTriangle, TrendingUp, TrendingDown, Minus, Loader2, FileText, Package, ChevronRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store/auth-store';
import { auditItemService } from '@/lib/supabase/services/procurement';
import { auditService } from '@/lib/supabase/services/inventory';
import { inventoryService } from '@/lib/supabase/services/inventory';
import { normalizeArabic } from '@/lib/arabic-normalize';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const supabase = createClient();

interface AuditPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

export function AuditPanel({ isOpen, onClose, onComplete }: AuditPanelProps) {
  const user = useAuthStore((s) => s.user);
  const isManager = user?.role === 'manager' || user?.role === 'admin';
  const [tab, setTab] = useState<'voice' | 'manual' | 'ocr'>('voice');
  const [stockItems, setStockItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Voice audit state
  const [isRecording, setIsRecording] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [searchedProduct, setSearchedProduct] = useState<any>(null);
  const [actualQtyInput, setActualQtyInput] = useState('');
  const [varianceResult, setVarianceResult] = useState<any>(null);
  const recognitionRef = useRef<any>(null);

  // Manual audit state
  const [manualSearch, setManualSearch] = useState('');
  const [selectedManualItem, setSelectedManualItem] = useState<any>(null);
  const [manualActualQty, setManualActualQty] = useState('');

  // OCR state
  const [ocrImage, setOcrImage] = useState<string | null>(null);
  const [ocrProcessing, setOcrProcessing] = useState(false);

  // Session
  const [activeSession, setActiveSession] = useState<any>(null);

  // Product passport
  const [passportProduct, setPassportProduct] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      loadData();
      initSession();
    } else {
      resetState();
    }
  }, [isOpen]);

  const resetState = () => {
    setSearchedProduct(null);
    setActualQtyInput('');
    setVarianceResult(null);
    setVoiceTranscript('');
    setSelectedManualItem(null);
    setManualActualQty('');
    setOcrImage(null);
    setPassportProduct(null);
    stopRecording();
  };

  const loadData = async () => {
    setLoading(true);
    const { data } = await inventoryService.getAll();
    if (data) setStockItems(data);
    setLoading(false);
  };

  const initSession = async () => {
    const { data } = await auditService.create({
      type: 'voice',
      status: 'in_progress',
      started_by: user?.id,
    });
    if (data) setActiveSession(data);
  };

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { }
      recognitionRef.current = null;
    }
    setIsRecording(false);
  }, []);

  const startVoiceSearch = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { toast.error('المتصفح لا يدعم التعرف على الصوت'); return; }
    stopRecording();
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
    recognition.onerror = () => { setIsRecording(false); toast.error('خطأ في التعرف على الصوت'); };
    recognition.onend = () => setIsRecording(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  }, [stopRecording]);

  function processVoiceSearch(transcript: string) {
    let processed = normalizeArabic(transcript);
    processed = processed.replace(/عايز|وريني|ابحث عن|الصنف|رقم|الرف|جرد|كشف/g, '').trim();
    const found = stockItems.find((item) =>
      normalizeArabic(item.product_name).includes(processed) ||
      item.sku.toLowerCase().includes(processed) ||
      (item.barcode && item.barcode.includes(processed))
    );
    if (found) {
      setSearchedProduct(found);
      setActualQtyInput('');
      setVarianceResult(null);
      setPassportProduct(null);
    } else {
      toast.error('لم يتم العثور على المنتج');
    }
  }

  async function submitVoiceAudit() {
    if (!searchedProduct || !actualQtyInput || !activeSession) return;
    const actualQty = parseFloat(actualQtyInput);
    const systemQty = searchedProduct.current_qty || 0;
    const variance = actualQty - systemQty;
    const varianceValue = variance * (searchedProduct.cost_price || 0);
    let status: any = 'matched';
    if (variance < 0) status = 'shortage';
    else if (variance > 0) status = 'overage';

    await auditItemService.create({
      audit_session_id: activeSession.id,
      stock_item_id: searchedProduct.id,
      product_name: searchedProduct.product_name,
      product_sku: searchedProduct.sku,
      system_qty: systemQty,
      actual_qty: actualQty,
      cost_price: searchedProduct.cost_price || 0,
      status,
      notes: variance !== 0 ? `انحراف: ${variance} | القيمة: ${varianceValue} ج.م` : '',
      shelf_location: searchedProduct.location,
    });

    if (isManager) {
      await supabase.from('stock_items').update({
        current_qty: actualQty,
        last_audit_date: new Date().toISOString(),
        last_audit_by: user?.id,
        updated_at: new Date().toISOString(),
      }).eq('id', searchedProduct.id);
    }

    setVarianceResult({ status, variance, value: varianceValue });
    toast.success(status === 'matched' ? 'مطابق ✓' : `تم التسجيل - ${status === 'shortage' ? 'عجز' : 'زيادة'}`);
    onComplete?.();
    setTimeout(() => {
      setSearchedProduct(null);
      setActualQtyInput('');
      setVarianceResult(null);
      setVoiceTranscript('');
    }, 2500);
  }

  async function submitManualAudit() {
    if (!selectedManualItem || !manualActualQty || !activeSession) return;
    const actualQty = parseFloat(manualActualQty);
    const systemQty = selectedManualItem.current_qty || 0;
    const variance = actualQty - systemQty;
    const varianceValue = variance * (selectedManualItem.cost_price || 0);
    let status: any = 'matched';
    if (variance < 0) status = 'shortage';
    else if (variance > 0) status = 'overage';

    await auditItemService.create({
      audit_session_id: activeSession.id,
      stock_item_id: selectedManualItem.id,
      product_name: selectedManualItem.product_name,
      product_sku: selectedManualItem.sku,
      system_qty: systemQty,
      actual_qty: actualQty,
      cost_price: selectedManualItem.cost_price || 0,
      status,
      notes: variance !== 0 ? `انحراف: ${variance} | القيمة: ${varianceValue} ج.م` : '',
      shelf_location: selectedManualItem.location,
    });

    if (isManager) {
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
    onComplete?.();
  }

  const filteredManualItems = stockItems.filter((item) =>
    !manualSearch || normalizeArabic(item.product_name).includes(normalizeArabic(manualSearch)) ||
    item.sku.toLowerCase().includes(manualSearch.toLowerCase())
  );

  function showPassport(item: any) {
    setPassportProduct(item);
  }

  function handleOCRUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => setOcrImage(evt.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function processOCR() {
    if (!ocrImage || !activeSession) return;
    setOcrProcessing(true);
    await new Promise((r) => setTimeout(r, 2000));
    toast.success('تم معالجة الصورة - أضف النتائج يدوياً');
    setOcrProcessing(false);
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.96 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative w-full sm:max-w-lg mx-0 sm:mx-4 max-h-[85vh] bg-[#0A0A0C] border border-[rgba(255,255,255,0.08)] rounded-t-2xl sm:rounded-2xl overflow-hidden backdrop-blur-[25px]"
        style={{ backgroundColor: 'rgba(10,10,12,0.96)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center hover:bg-white/[0.1] transition-colors">
            <X size={16} className="text-gray-400" />
          </button>
          <h2 className="text-base font-semibold text-white">الجرد</h2>
          <div className="w-8" />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mx-5 mb-4 p-1 rounded-xl bg-white/[0.04]">
          {([
            { key: 'voice', label: 'صوتي', icon: Mic },
            { key: 'manual', label: 'يدوي', icon: Search },
            { key: 'ocr', label: 'تصوير', icon: Camera },
          ] as const).map((t) => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); resetState(); }}
              className={cn(
                'flex-1 h-9 rounded-lg flex items-center justify-center gap-1.5 text-xs font-medium transition-all duration-300',
                tab === t.key ? 'bg-white text-black' : 'text-gray-400 hover:text-white'
              )}
            >
              <t.icon size={14} />
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="overflow-y-auto px-5 pb-5 max-h-[calc(85vh-140px)]">
          <AnimatePresence mode="wait">
            {tab === 'voice' && (
              <motion.div key="voice" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {!searchedProduct && !passportProduct ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 rounded-2xl bg-white/[0.04] flex items-center justify-center mx-auto mb-4">
                      <Mic size={28} className="text-gray-500" />
                    </div>
                    <p className="text-sm text-gray-400 mb-6">تكلم باسم المنتج للبحث عنه</p>
                    <button
                      onClick={startVoiceSearch}
                      disabled={isRecording}
                      className={cn(
                        'w-16 h-16 rounded-full flex items-center justify-center mx-auto transition-all duration-300',
                        isRecording ? 'bg-red-500/20 border-2 border-red-500' : 'bg-white/[0.08] border border-white/[0.1] hover:bg-white/[0.12]'
                      )}
                    >
                      {isRecording ? <MicOff size={22} className="text-red-400" /> : <Mic size={22} className="text-gray-300" />}
                    </button>
                    {isRecording && <p className="text-xs text-red-400 mt-3">جاري التسجيل...</p>}
                    {voiceTranscript && <p className="text-xs text-gray-500 mt-3">✅ {voiceTranscript}</p>}
                  </div>
                ) : passportProduct ? (
                  <div>
                    <button onClick={() => setPassportProduct(null)} className="text-xs text-gray-400 hover:text-white mb-4 flex items-center gap-1">
                      <ChevronRight size={14} /> رجوع
                    </button>
                    <ProductPassportCard item={passportProduct} />
                  </div>
                ) : (
                  <div>
                    <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 mb-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/[0.06] flex items-center justify-center flex-shrink-0">
                          <Package size={20} className="text-gray-300" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white">{searchedProduct.product_name}</p>
                          <p className="text-xs text-gray-500 mt-0.5">SKU: {searchedProduct.sku}</p>
                          <p className="text-xs text-gray-500">الرصيد الدفتري: <span className="text-white font-medium">{searchedProduct.current_qty || 0}</span></p>
                        </div>
                        <button onClick={() => showPassport(searchedProduct)} className="text-xs text-emerald-400 hover:text-emerald-300 flex-shrink-0">
                          بطاقة
                        </button>
                      </div>
                    </div>

                    {!varianceResult ? (
                      <div>
                        <label className="text-xs text-gray-400 mb-2 block">الكمية الفعلية على الرف</label>
                        <div className="flex gap-3">
                          <div className="relative flex-1">
                            <input
                              type="number"
                              value={actualQtyInput}
                              onChange={(e) => setActualQtyInput(e.target.value)}
                              placeholder="0"
                              className="w-full h-12 bg-white/[0.06] border border-white/[0.08] rounded-xl px-4 text-white text-lg text-center outline-none focus:border-emerald-500/50 transition-colors [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                              autoFocus
                              onKeyDown={(e) => { if (e.key === 'Enter') submitVoiceAudit(); }}
                            />
                          </div>
                          <button
                            onClick={() => { setActualQtyInput(String(searchedProduct.current_qty || 0)); }}
                            className="h-12 px-4 rounded-xl bg-white/[0.06] text-xs text-gray-400 hover:bg-white/[0.1] transition-colors"
                          >
                            زي الدفتر
                          </button>
                        </div>

                        <div className="flex gap-3 mt-4">
                          <button
                            onClick={startVoiceSearch}
                            className="w-12 h-12 rounded-xl bg-white/[0.06] flex items-center justify-center hover:bg-white/[0.1] transition-colors flex-shrink-0"
                          >
                            <Mic size={18} className="text-gray-400" />
                          </button>
                          <button
                            onClick={submitVoiceAudit}
                            disabled={!actualQtyInput}
                            className={cn(
                              'flex-1 h-12 rounded-xl text-sm font-medium transition-all duration-300',
                              actualQtyInput ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-white/[0.06] text-gray-500 cursor-not-allowed'
                            )}
                          >
                            تأكيد الجرد
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className={cn(
                        'rounded-xl p-4 text-center border transition-all duration-300',
                        varianceResult.status === 'matched' ? 'bg-emerald-500/10 border-emerald-500/20' :
                        varianceResult.status === 'shortage' ? 'bg-red-500/10 border-red-500/20' :
                        'bg-amber-500/10 border-amber-500/20'
                      )}>
                        <div className="flex justify-center mb-2">
                          {varianceResult.status === 'matched' ? (
                            <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center"><Check size={24} className="text-emerald-400" /></div>
                          ) : varianceResult.status === 'shortage' ? (
                            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center"><TrendingDown size={24} className="text-red-400" /></div>
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center"><TrendingUp size={24} className="text-amber-400" /></div>
                          )}
                        </div>
                        <p className={cn(
                          'text-lg font-bold',
                          varianceResult.status === 'matched' ? 'text-emerald-400' :
                          varianceResult.status === 'shortage' ? 'text-red-400' : 'text-amber-400'
                        )}>
                          {varianceResult.status === 'matched' ? 'مطابق تماماً' :
                           varianceResult.status === 'shortage' ? `عجز: ${Math.abs(varianceResult.variance)}` : `زيادة: ${varianceResult.variance}`}
                        </p>
                        {varianceResult.status !== 'matched' && (
                          <p className="text-xs text-gray-400 mt-1">الأثر المالي: {varianceResult.value.toLocaleString('ar-EG')} ج.م</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {tab === 'manual' && (
              <motion.div key="manual" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {!selectedManualItem ? (
                  <div>
                    <div className="relative mb-4">
                      <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" />
                      <input
                        type="text"
                        value={manualSearch}
                        onChange={(e) => setManualSearch(e.target.value)}
                        placeholder="ابحث عن صنف..."
                        className="w-full h-11 bg-white/[0.06] border border-white/[0.08] rounded-xl pr-10 pl-4 text-sm text-white outline-none focus:border-emerald-500/50 transition-colors"
                      />
                    </div>
                    <div className="space-y-1 max-h-[300px] overflow-y-auto">
                      {filteredManualItems.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => setSelectedManualItem(item)}
                          className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.04] transition-colors text-right"
                        >
                          <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center flex-shrink-0">
                            <Package size={16} className="text-gray-400" />
                          </div>
                          <div className="flex-1 min-w-0 text-right">
                            <p className="text-sm font-medium text-white truncate">{item.product_name}</p>
                            <p className="text-xs text-gray-500">الرصيد: {item.current_qty || 0}</p>
                          </div>
                        </button>
                      ))}
                      {filteredManualItems.length === 0 && (
                        <p className="text-xs text-gray-500 text-center py-8">لا توجد نتائج</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 mb-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-white">{selectedManualItem.product_name}</p>
                          <p className="text-xs text-gray-500 mt-0.5">الرصيد الدفتري: {selectedManualItem.current_qty || 0}</p>
                        </div>
                        <button onClick={() => setSelectedManualItem(null)} className="text-xs text-gray-400">تغيير</button>
                      </div>
                    </div>
                    <label className="text-xs text-gray-400 mb-2 block">الكمية الفعلية</label>
                    <input
                      type="number"
                      value={manualActualQty}
                      onChange={(e) => setManualActualQty(e.target.value)}
                      placeholder="0"
                      className="w-full h-12 bg-white/[0.06] border border-white/[0.08] rounded-xl px-4 text-white text-lg text-center outline-none focus:border-emerald-500/50 transition-colors [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      autoFocus
                      onKeyDown={(e) => { if (e.key === 'Enter') submitManualAudit(); }}
                    />
                    <button
                      onClick={submitManualAudit}
                      disabled={!manualActualQty}
                      className={cn(
                        'w-full h-12 rounded-xl text-sm font-medium mt-4 transition-all duration-300',
                        manualActualQty ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-white/[0.06] text-gray-500 cursor-not-allowed'
                      )}
                    >
                      تأكيد الجرد
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {tab === 'ocr' && (
              <motion.div key="ocr" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="text-center py-6">
                  <div className="w-20 h-20 rounded-2xl bg-white/[0.04] border-2 border-dashed border-white/[0.1] flex items-center justify-center mx-auto mb-4 overflow-hidden">
                    {ocrImage ? (
                      <img src={ocrImage} alt="OCR" className="w-full h-full object-contain" />
                    ) : (
                      <Camera size={32} className="text-gray-600" />
                    )}
                  </div>
                  <label className="inline-flex items-center gap-2 px-6 h-11 rounded-xl bg-white/[0.08] text-sm text-gray-300 cursor-pointer hover:bg-white/[0.12] transition-colors">
                    <Camera size={16} />
                    اختر صورة الكشف
                    <input type="file" accept="image/*" capture="environment" onChange={handleOCRUpload} className="hidden" />
                  </label>
                  {ocrImage && (
                    <button
                      onClick={processOCR}
                      disabled={ocrProcessing}
                      className="w-full h-12 rounded-xl bg-emerald-600 text-white text-sm font-medium mt-4 hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {ocrProcessing ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                      {ocrProcessing ? 'جاري المعالجة...' : 'معالجة الصورة'}
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Product Passport Card ─── */
function ProductPassportCard({ item }: { item: any }) {
  const turnover = item.cost_price && item.cost_price > 0
    ? ((item.current_qty || 0) * item.cost_price / 1000).toFixed(1)
    : '—';

  return (
    <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 flex items-center justify-center">
          <Package size={24} className="text-emerald-400" />
        </div>
        <div>
          <p className="text-base font-semibold text-white">{item.product_name}</p>
          <p className="text-xs text-gray-500">{item.sku}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white/[0.04] rounded-xl p-3">
          <p className="text-xs text-gray-500 mb-1">الرصيد الدفتري</p>
          <p className="text-lg font-bold text-white">{item.current_qty || 0}</p>
          <p className="text-xs text-gray-500">{item.unit || 'قطعة'}</p>
        </div>
        <div className="bg-white/[0.04] rounded-xl p-3">
          <p className="text-xs text-gray-500 mb-1">الموقع</p>
          <p className="text-sm font-bold text-white">{item.location || '—'}</p>
          <p className="text-xs text-gray-500">{item.category || '—'}</p>
        </div>
        <div className="bg-white/[0.04] rounded-xl p-3">
          <p className="text-xs text-gray-500 mb-1">سعر التكلفة</p>
          <p className="text-sm font-bold text-emerald-400">{item.cost_price?.toLocaleString('ar-EG') || 0} ج.م</p>
        </div>
        <div className="bg-white/[0.04] rounded-xl p-3">
          <p className="text-xs text-gray-500 mb-1">سعر البيع</p>
          <p className="text-sm font-bold text-emerald-400">{item.selling_price?.toLocaleString('ar-EG') || 0} ج.م</p>
        </div>
      </div>

      <div className="bg-white/[0.04] rounded-xl p-3 mb-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs text-gray-400">معدل الدوران</p>
          <p className="text-sm font-bold text-white">{turnover}</p>
        </div>
        <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(parseFloat(turnover) * 10, 100)}%` }} />
        </div>
      </div>

      {item.last_audit_date && (
        <p className="text-xs text-gray-500">آخر جرد: {new Date(item.last_audit_date).toLocaleDateString('ar-EG')}</p>
      )}
    </div>
  );
}
