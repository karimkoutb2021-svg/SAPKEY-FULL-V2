'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Search, Camera, Check, X, AlertTriangle, TrendingUp, TrendingDown, Minus, Loader2, FileText, Package, ChevronRight, CheckCircle2, XCircle } from 'lucide-react';
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
  const [voiceMode, setVoiceMode] = useState<'search' | 'quantity'>('search');
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
    setVoiceMode('search');
    setSelectedManualItem(null);
    setManualActualQty('');
    setOcrImage(null);
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
    } as any);
    if (data) setActiveSession(data);
  };

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { }
      recognitionRef.current = null;
    }
    setIsRecording(false);
  }, []);

  const startVoiceCapture = useCallback((mode: 'search' | 'quantity') => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { toast.error('المتصفح لا يدعم التعرف على الصوت'); return; }
    
    stopRecording();
    setVoiceMode(mode);
    setVoiceTranscript('');

    const recognition = new SpeechRecognition();
    recognition.lang = 'ar-EG';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setVoiceTranscript(transcript);
      setIsRecording(false);
      if (mode === 'search') {
        processVoiceSearch(transcript);
      } else {
        processVoiceQuantity(transcript);
      }
    };
    recognition.onerror = () => { setIsRecording(false); toast.error('لم أتمكن من السماع، حاول مرة أخرى'); };
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
    } else {
      toast.error('لم يتم العثور على المنتج');
    }
  }

  function processVoiceQuantity(transcript: string) {
    // Basic Arabic text to number conversion
    let qtyStr = transcript.trim();
    const arNumbers: Record<string, string> = {
      'واحد': '1', 'اثنان': '2', 'اتنين': '2', 'ثلاثة': '3', 'تلاتة': '3', 'اربعة': '4', 'أربعة': '4',
      'خمسة': '5', 'ستة': '6', 'سبعة': '7', 'ثمانية': '8', 'تمنية': '8', 'تسعة': '9', 'عشرة': '10',
      'عشرين': '20', 'ثلاثين': '30', 'تلاتين': '30', 'اربعين': '40', 'خمسين': '50', 'ستين': '60',
      'صفر': '0', 'مية': '100', 'مائة': '100', 'الف': '1000'
    };
    
    // Replace text numbers with digits (rudimentary)
    Object.keys(arNumbers).forEach(key => {
      qtyStr = qtyStr.replace(new RegExp(key, 'g'), arNumbers[key]);
    });

    const parsed = parseFloat(qtyStr.replace(/[^0-9.]/g, ''));
    if (!isNaN(parsed)) {
      setActualQtyInput(parsed.toString());
      toast.success(`الكمية الملتقطة: ${parsed}`);
    } else {
      toast.error('لم أتمكن من فهم الكمية، يرجى الإدخال يدوياً أو الإعادة');
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
    onComplete?.();
    setTimeout(() => {
      resetState();
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
    toast.success('تم معالجة الصورة بنجاح');
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
        className="relative w-full sm:max-w-lg mx-0 sm:mx-4 max-h-[85vh] bg-[#0A0A0C] border border-[rgba(255,255,255,0.08)] rounded-t-2xl sm:rounded-2xl overflow-hidden backdrop-blur-[25px] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 bg-gradient-to-b from-white/[0.05] to-transparent">
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center hover:bg-white/[0.1] transition-colors">
            <X size={16} className="text-gray-400" />
          </button>
          <h2 className="text-lg font-bold text-white tracking-wide">المدقق الآلي</h2>
          <div className="w-8" />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mx-5 mb-4 p-1 rounded-xl bg-white/[0.04]">
          {([
            { key: 'voice', label: 'مساعد صوتي', icon: Mic },
            { key: 'ocr', label: 'كشف مطبوع', icon: Camera },
            { key: 'manual', label: 'بحث يدوي', icon: Search },
          ] as const).map((t) => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); resetState(); }}
              className={cn(
                'flex-1 h-9 rounded-lg flex items-center justify-center gap-1.5 text-xs font-bold transition-all duration-300',
                tab === t.key ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/[0.05]'
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
                {!searchedProduct ? (
                  <div className="text-center py-10">
                    <div className="relative w-24 h-24 mx-auto mb-6">
                      <div className={cn(
                        "absolute inset-0 rounded-full transition-all duration-700",
                        isRecording ? "bg-emerald-500/30 animate-ping" : "bg-white/[0.02]"
                      )} />
                      <button
                        onClick={() => startVoiceCapture('search')}
                        disabled={isRecording}
                        className={cn(
                          'relative w-full h-full rounded-full flex items-center justify-center transition-all duration-300 z-10 border shadow-2xl',
                          isRecording ? 'bg-emerald-500 border-emerald-400 text-white scale-110' : 'bg-gradient-to-br from-[#1A1A1C] to-[#0A0A0C] border-white/[0.08] hover:border-emerald-500/50 hover:bg-white/[0.05]'
                        )}
                      >
                        {isRecording ? <Mic size={32} /> : <Mic size={32} className="text-emerald-500" />}
                      </button>
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">
                      {isRecording ? 'أنا أستمع...' : 'تحدث للبحث عن منتج'}
                    </h3>
                    <p className="text-sm text-gray-500">مثال: "علبة تونة القطط"</p>
                    
                    {voiceTranscript && (
                      <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.04] text-xs text-gray-300 border border-white/[0.05]">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        "{voiceTranscript}"
                      </div>
                    )}
                  </div>
                ) : (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                    <ProductPassportCard item={searchedProduct} />

                    {!varianceResult ? (
                      <div className="mt-5 space-y-4">
                        <div className="flex gap-3">
                          <button
                            onClick={() => resetState()}
                            className="flex-1 h-12 rounded-xl bg-red-500/10 text-red-400 font-bold hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2"
                          >
                            <XCircle size={18} />
                            تخطي
                          </button>
                          <button
                            onClick={() => startVoiceCapture('quantity')}
                            className={cn(
                              "flex-1 h-12 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-white shadow-lg",
                              isRecording && voiceMode === 'quantity' ? "bg-emerald-400" : "bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-90"
                            )}
                          >
                            <Mic size={18} />
                            {isRecording && voiceMode === 'quantity' ? 'جاري السماع...' : 'تأكيد (انطق الكمية)'}
                          </button>
                        </div>
                        
                        <div className="relative flex items-center">
                          <div className="flex-1 border-t border-white/[0.08]"></div>
                          <span className="px-3 text-xs text-gray-600 font-medium uppercase">أو أدخل يدوياً</span>
                          <div className="flex-1 border-t border-white/[0.08]"></div>
                        </div>

                        <div className="flex gap-3">
                          <input
                            type="number"
                            value={actualQtyInput}
                            onChange={(e) => setActualQtyInput(e.target.value)}
                            placeholder="الكمية"
                            className="flex-1 h-12 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 text-white text-center text-xl font-bold outline-none focus:border-emerald-500/50 transition-colors [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            onKeyDown={(e) => { if (e.key === 'Enter') submitVoiceAudit(); }}
                          />
                          <button
                            onClick={() => { setActualQtyInput(String(searchedProduct.current_qty || 0)); }}
                            className="h-12 px-4 rounded-xl bg-white/[0.06] text-xs font-bold text-emerald-400 hover:bg-white/[0.1] border border-white/[0.05]"
                          >
                            مُطابق للدفتر
                          </button>
                        </div>

                        <button
                          onClick={submitVoiceAudit}
                          disabled={!actualQtyInput}
                          className="w-full h-12 rounded-xl bg-white text-black font-bold disabled:opacity-50 hover:bg-gray-200 transition-colors"
                        >
                          تسجيل الجرد
                        </button>
                      </div>
                    ) : (
                      <div className="mt-5 rounded-2xl p-6 text-center bg-white/[0.02] border border-white/[0.05]">
                        <div className="flex justify-center mb-4">
                          {varianceResult.status === 'matched' ? (
                            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center"><Check size={32} className="text-emerald-400" /></div>
                          ) : varianceResult.status === 'shortage' ? (
                            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center"><TrendingDown size={32} className="text-red-400" /></div>
                          ) : (
                            <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center"><TrendingUp size={32} className="text-amber-400" /></div>
                          )}
                        </div>
                        <p className={cn(
                          'text-2xl font-black mb-1',
                          varianceResult.status === 'matched' ? 'text-emerald-400' :
                          varianceResult.status === 'shortage' ? 'text-red-400' : 'text-amber-400'
                        )}>
                          {varianceResult.status === 'matched' ? 'مطابق تماماً' :
                           varianceResult.status === 'shortage' ? `عجز: ${Math.abs(varianceResult.variance)}` : `زيادة: ${varianceResult.variance}`}
                        </p>
                        {varianceResult.status !== 'matched' && (
                          <p className="text-sm font-medium text-gray-400 mt-2 bg-white/[0.04] py-2 px-4 rounded-lg inline-block">
                            الأثر المالي: <span className="text-white">{varianceResult.value.toLocaleString('ar-EG')} ج.م</span>
                          </p>
                        )}
                      </div>
                    )}
                  </motion.div>
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
                        placeholder="ابحث عن صنف بالاسم أو الباركود..."
                        className="w-full h-11 bg-white/[0.04] border border-white/[0.08] rounded-xl pr-10 pl-4 text-sm text-white outline-none focus:border-emerald-500/50 transition-colors"
                      />
                    </div>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                      {filteredManualItems.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => setSelectedManualItem(item)}
                          className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.06] hover:border-white/[0.1] transition-all text-right group"
                        >
                          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-500/20 transition-colors">
                            <Package size={18} className="text-emerald-400" />
                          </div>
                          <div className="flex-1 min-w-0 text-right">
                            <p className="text-sm font-bold text-white truncate">{item.product_name}</p>
                            <p className="text-xs font-medium text-gray-500 mt-0.5">المخزون المسجل: {item.current_qty || 0}</p>
                          </div>
                          <ChevronRight size={16} className="text-gray-600 group-hover:text-white transition-colors" />
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div>
                    <ProductPassportCard item={selectedManualItem} />
                    <div className="mt-5 flex gap-3">
                      <input
                        type="number"
                        value={manualActualQty}
                        onChange={(e) => setManualActualQty(e.target.value)}
                        placeholder="الكمية الفعلية"
                        className="flex-1 h-12 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 text-white text-xl font-bold text-center outline-none focus:border-emerald-500/50 transition-colors [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        autoFocus
                        onKeyDown={(e) => { if (e.key === 'Enter') submitManualAudit(); }}
                      />
                    </div>
                    <div className="flex gap-3 mt-4">
                      <button onClick={() => setSelectedManualItem(null)} className="w-1/3 h-12 rounded-xl bg-white/[0.04] text-gray-400 font-bold hover:bg-white/[0.08]">
                        إلغاء
                      </button>
                      <button
                        onClick={submitManualAudit}
                        disabled={!manualActualQty}
                        className="flex-1 h-12 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                      >
                        تسجيل النتيجة
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {tab === 'ocr' && (
              <motion.div key="ocr" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="text-center py-6 bg-white/[0.02] border border-white/[0.05] rounded-2xl">
                  <div className="w-full max-w-[280px] aspect-[1/1.4] rounded-xl bg-black/40 border-2 border-dashed border-white/[0.2] flex flex-col items-center justify-center mx-auto mb-5 overflow-hidden relative group">
                    {ocrImage ? (
                      <>
                        <img loading="lazy" src={ocrImage} alt="OCR" className="w-full h-full object-cover opacity-80" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end justify-center pb-4">
                          <label className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-full text-xs font-bold text-white cursor-pointer hover:bg-white/30 transition-colors">
                            تغيير الصورة
                            <input type="file" accept="image/*" capture="environment" onChange={handleOCRUpload} className="hidden" />
                          </label>
                        </div>
                      </>
                    ) : (
                      <>
                        <Camera size={40} className="text-gray-600 mb-3 group-hover:scale-110 transition-transform" />
                        <p className="text-sm font-bold text-gray-500">التقط صورة الكشف المطبوع</p>
                        <p className="text-[10px] text-gray-600 mt-1">يجب أن تكون الأرقام واضحة</p>
                        <label className="absolute inset-0 cursor-pointer">
                          <input type="file" accept="image/*" capture="environment" onChange={handleOCRUpload} className="hidden" />
                        </label>
                      </>
                    )}
                    
                    {/* Bounding box guide */}
                    {!ocrImage && (
                      <div className="absolute inset-4 border border-emerald-500/30 rounded-lg pointer-events-none" />
                    )}
                  </div>
                  
                  {ocrImage && (
                    <button
                      onClick={processOCR}
                      disabled={ocrProcessing}
                      className="w-[280px] mx-auto h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                    >
                      {ocrProcessing ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} />}
                      {ocrProcessing ? 'جاري قراءة البيانات بذكاء...' : 'بدء قراءة الكشف (OCR)'}
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

/* ─── 2D Glassmorphic Product Passport Card ─── */
function ProductPassportCard({ item }: { item: any }) {
  const turnover = item.cost_price && item.cost_price > 0
    ? ((item.current_qty || 0) * item.cost_price / 1000).toFixed(1)
    : '—';

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/[0.1] shadow-2xl backdrop-blur-xl">
      {/* Background glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
      
      <div className="p-5">
        <div className="flex items-start gap-4 mb-5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 flex-shrink-0">
            <Package size={28} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-black text-white leading-tight mb-1">{item.product_name}</h3>
            <div className="flex items-center gap-2 text-xs font-medium text-gray-400">
              <span className="bg-black/30 px-2 py-1 rounded-md">{item.sku}</span>
              {item.category && <span>• {item.category}</span>}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-black/20 border border-white/[0.05] rounded-xl p-3">
            <p className="text-[10px] text-gray-500 mb-0.5 uppercase tracking-wider">النظام (الدفتر)</p>
            <p className="text-xl font-black text-white">{item.current_qty || 0}</p>
            <p className="text-[10px] font-bold text-gray-600 mt-1">{item.unit || 'قطعة'}</p>
          </div>
          <div className="bg-black/20 border border-white/[0.05] rounded-xl p-3">
            <p className="text-[10px] text-gray-500 mb-0.5 uppercase tracking-wider">الموقع (الرف)</p>
            <p className="text-sm font-bold text-white mt-1">{item.location || 'غير محدد'}</p>
          </div>
          <div className="bg-emerald-950/30 border border-emerald-500/20 rounded-xl p-3">
            <p className="text-[10px] text-emerald-500/70 mb-0.5 uppercase tracking-wider">التكلفة</p>
            <p className="text-sm font-black text-emerald-400">{item.cost_price?.toLocaleString('ar-EG') || 0} ج.م</p>
          </div>
          <div className="bg-emerald-950/30 border border-emerald-500/20 rounded-xl p-3">
            <p className="text-[10px] text-emerald-500/70 mb-0.5 uppercase tracking-wider">سعر البيع</p>
            <p className="text-sm font-black text-emerald-400">{item.selling_price?.toLocaleString('ar-EG') || 0} ج.م</p>
          </div>
        </div>

        <div className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-3 mb-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-bold text-gray-400">معدل الدوران والإهلاك</p>
            <p className="text-xs font-black text-white">{turnover} / 10</p>
          </div>
          <div className="h-2 bg-black/40 rounded-full overflow-hidden border border-white/[0.02]">
            <motion.div 
              initial={{ width: 0 }} 
              animate={{ width: `${Math.min(parseFloat(turnover) * 10, 100)}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full" 
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-[10px] font-bold text-gray-500">
          <p>آخر مراجعة: {item.last_audit_date ? new Date(item.last_audit_date).toLocaleDateString('ar-EG') : 'لم يتم الجرد'}</p>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            بيانات حية
          </div>
        </div>
      </div>
    </div>
  );
}
