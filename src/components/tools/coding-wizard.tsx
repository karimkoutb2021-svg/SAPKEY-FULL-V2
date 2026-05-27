'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Check, ChevronRight, ChevronLeft, X, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store/auth-store';
import { codingDraftService } from '@/lib/supabase/services/procurement';
import { normalizeArabic } from '@/lib/arabic-normalize';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const supabase = createClient();

const voiceSteps = [
  { key: 'product_code', label: 'كود المنتج', placeholder: 'مثال: مية الف واحد', icon: '🔢' },
  { key: 'product_name', label: 'اسم الصنف', placeholder: 'مثال: لبن نيدو خمسمية جرام', icon: '📦' },
  { key: 'shelf_number', label: 'رقم الرف', placeholder: 'مثال: الرف التاني قطاع الجبن', icon: '📍' },
  { key: 'category', label: 'القسم', placeholder: 'مثال: ألبان', icon: '📁' },
  { key: 'unit', label: 'الوحدة', placeholder: 'مثال: علبة', icon: '📏' },
  { key: 'cost_price', label: 'سعر التكلفة', placeholder: 'مثال: خمستاشر', icon: '💰' },
  { key: 'selling_price', label: 'سعر البيع', placeholder: 'مثال: تمنتاشر', icon: '🏷️' },
];

const numberMap: Record<string, string> = {
  'الفين': '2000', 'تلات الاف': '3000', 'الف': '1000',
  'ميتين': '200', 'ثلاثمية': '300', 'أربعمية': '400', 'خمسمية': '500',
  'ستمية': '600', 'سبعمية': '700', 'تمنمية': '800', 'تسعمية': '900',
  'مية': '100',
  'نص': '0.5', 'ربع': '0.25', 'تلت': '0.33',
  'اتنين': '2', 'تلاتة': '3', 'واحد': '1', 'أربعة': '4', 'خمسة': '5',
  'ستة': '6', 'سبعة': '7', 'تمنية': '8', 'تسعة': '9', 'عشرة': '10',
};

function processArabicSpeech(text: string, field: string): string {
  let processed = text;
  if (field === 'product_code') {
    Object.entries(numberMap).forEach(([word, num]) => {
      processed = processed.replace(new RegExp(word, 'g'), num);
    });
    processed = processed.replace(/[^0-9]/g, '');
  } else if (field === 'cost_price' || field === 'selling_price') {
    Object.entries(numberMap).forEach(([word, num]) => {
      processed = processed.replace(new RegExp(word, 'g'), num);
    });
    processed = processed.replace(/[^0-9.]/g, '');
  } else if (field === 'shelf_number') {
    const ordinalMap: Record<string, string> = {
      'الأول': '1', 'التاني': '2', 'التالت': '3', 'الرابع': '4', 'الخامس': '5',
      'السادس': '6', 'السابع': '7', 'التامن': '8', 'التاسع': '9', 'العاشر': '10',
    };
    Object.entries(ordinalMap).forEach(([word, num]) => {
      processed = processed.replace(new RegExp(word, 'g'), num);
    });
  }
  return processed.trim();
}

interface CodingWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -300 : 300,
    opacity: 0,
  }),
};

export function CodingWizard({ isOpen, onClose, onComplete }: CodingWizardProps) {
  const user = useAuthStore((s) => s.user);
  const isManager = user?.role === 'manager' || user?.role === 'admin';
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [data, setData] = useState<Record<string, string>>({});
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingValue, setEditingValue] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (!isOpen) {
      setStep(0);
      setData({});
      setTranscript('');
      setShowEditor(false);
      setEditingValue('');
      stopRecording();
    }
  }, [isOpen]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { }
      recognitionRef.current = null;
    }
    setIsRecording(false);
  }, []);

  const startRecording = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('المتصفح لا يدعم التعرف على الصوت');
      return;
    }
    stopRecording();
    const recognition = new SpeechRecognition();
    recognition.lang = 'ar-EG';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      let finalText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalText += event.results[i][0].transcript;
        }
      }
      if (finalText) {
        const processed = processArabicSpeech(normalizeArabic(finalText), voiceSteps[step].key);
        setData((prev) => ({ ...prev, [voiceSteps[step].key]: processed }));
        setTranscript(finalText);
        setIsRecording(false);
      }
    };

    recognition.onerror = () => { setIsRecording(false); toast.error('خطأ في التعرف على الصوت'); };
    recognition.onend = () => setIsRecording(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  }, [step, stopRecording]);

  const handleEdit = () => {
    setEditingValue(data[voiceSteps[step].key] || '');
    setShowEditor(true);
    stopRecording();
  };

  const handleSaveEdit = () => {
    setData((prev) => ({ ...prev, [voiceSteps[step].key]: editingValue }));
    setShowEditor(false);
  };

  const goNext = () => {
    if (step < voiceSteps.length - 1) {
      setDirection(1);
      setStep(step + 1);
    }
  };

  const goPrev = () => {
    if (step > 0) {
      setDirection(-1);
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const code = data['product_code'] || `AUTO-${Date.now()}`;
      const name = data['product_name'] || 'منتج جديد';
      await codingDraftService.create({
        product_code: code,
        product_name: name,
        category: data['category'] || '',
        unit: data['unit'] || 'قطعة',
        shelf_number: data['shelf_number'] || '',
        cost_price: parseFloat(data['cost_price']) || 0,
        selling_price: parseFloat(data['selling_price']) || 0,
        min_stock: 10,
        status: 'pending',
        submitted_by: user?.id,
        submitted_by_name: user?.nameAr || user?.name || user?.id,
        submitted_by_role: user?.role,
        voice_input: data,
      });
      toast.success(isManager ? 'تم إرسال التكويد للمراجعة' : 'تم إرسال مسودة التكويد بانتظار اعتماد المدير');
      setStep(0);
      setData({});
      setTranscript('');
      onComplete?.();
      onClose();
    } catch {
      toast.error('حدث خطأ أثناء الحفظ');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const currentStep = voiceSteps[step];
  const currentValue = data[currentStep.key] || '';

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
        className="relative w-full sm:max-w-md mx-0 sm:mx-4 bg-[#0A0A0C] border border-[rgba(255,255,255,0.08)] rounded-t-2xl sm:rounded-2xl overflow-hidden backdrop-blur-[25px]"
        style={{ backgroundColor: 'rgba(10,10,12,0.96)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center hover:bg-white/[0.1] transition-colors">
            <X size={16} className="text-gray-400" />
          </button>
          <div className="flex items-center gap-1.5">
            {voiceSteps.map((s, i) => (
              <div
                key={s.key}
                className={cn(
                  'w-2 h-2 rounded-full transition-all duration-300',
                  i === step ? 'bg-emerald-400 w-6' : i < step ? 'bg-emerald-500/50' : 'bg-white/[0.08]'
                )}
              />
            ))}
          </div>
          <div className="text-xs text-gray-500 font-medium">{step + 1} / {voiceSteps.length}</div>
        </div>

        {/* Step progress bar */}
        <div className="px-5 pb-1">
          <div className="h-0.5 bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] rounded-full"
              style={{ width: `${((step + 1) / voiceSteps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Step content with slide animation */}
        <div className="relative overflow-hidden min-h-[280px]">
          <AnimatePresence mode="popLayout" custom={direction}>
            {showEditor ? (
              <motion.div
                key="editor"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="px-5 py-6"
              >
                <p className="text-sm text-gray-400 mb-3">{currentStep.placeholder}</p>
                <input
                  type="text"
                  value={editingValue}
                  onChange={(e) => setEditingValue(e.target.value)}
                  className="w-full h-12 bg-white/[0.06] border border-white/[0.08] rounded-xl px-4 text-white text-base outline-none focus:border-emerald-500/50 transition-colors"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(); }}
                />
                <div className="flex gap-3 mt-4">
                  <button onClick={() => setShowEditor(false)} className="flex-1 h-11 rounded-xl bg-white/[0.06] text-sm text-gray-300 hover:bg-white/[0.1] transition-colors">
                    إلغاء
                  </button>
                  <button onClick={handleSaveEdit} className="flex-1 h-11 rounded-xl bg-emerald-600 text-sm text-white font-medium hover:bg-emerald-700 transition-colors">
                    حفظ
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key={step}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                className="px-5 py-6"
              >
                {/* Step label and icon */}
                <div className="text-center mb-6">
                  <div className="text-3xl mb-2">{currentStep.icon}</div>
                  <h3 className="text-lg font-semibold text-white">{currentStep.label}</h3>
                  <p className="text-sm text-gray-500 mt-1">{currentStep.placeholder}</p>
                </div>

                {/* Value display */}
                <div className={cn(
                  'h-16 rounded-xl flex items-center justify-center transition-all duration-300 mb-6',
                  currentValue ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-white/[0.03] border border-white/[0.06]'
                )}>
                  {currentValue ? (
                    <span className="text-xl font-bold text-emerald-400">{currentValue}</span>
                  ) : (
                    <span className="text-sm text-gray-600">اضغط المايك للتحدث</span>
                  )}
                </div>

                {/* Transcript */}
                {transcript && (
                  <p className="text-xs text-gray-500 text-center mb-4">✅ "{transcript}"</p>
                )}

                {/* Actions */}
                <div className="flex items-center justify-center gap-3 mb-4">
                  <button
                    onClick={startRecording}
                    disabled={isRecording}
                    className={cn(
                      'w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300',
                      isRecording
                        ? 'bg-red-500/20 border-2 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)]'
                        : 'bg-white/[0.08] border border-white/[0.1] hover:bg-white/[0.12]'
                    )}
                  >
                    {isRecording ? (
                      <div className="relative">
                        <MicOff size={22} className="text-red-400" />
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-ping" />
                      </div>
                    ) : (
                      <Mic size={22} className="text-gray-300" />
                    )}
                  </button>
                  {currentValue && !isRecording && (
                    <button onClick={handleEdit} className="w-10 h-10 rounded-full bg-white/[0.06] flex items-center justify-center hover:bg-white/[0.1] transition-colors">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Navigation */}
                <div className="flex gap-3">
                  {step > 0 ? (
                    <button onClick={goPrev} className="flex-1 h-11 rounded-xl bg-white/[0.06] flex items-center justify-center gap-1.5 text-sm text-gray-300 hover:bg-white/[0.1] transition-colors">
                      <ChevronRight size={16} /> السابق
                    </button>
                  ) : (
                    <div className="flex-1" />
                  )}
                  {step < voiceSteps.length - 1 ? (
                    <button
                      onClick={goNext}
                      disabled={!currentValue}
                      className={cn(
                        'flex-1 h-11 rounded-xl flex items-center justify-center gap-1.5 text-sm font-medium transition-all duration-300',
                        currentValue
                          ? 'bg-white text-black hover:bg-gray-200'
                          : 'bg-white/[0.06] text-gray-500 cursor-not-allowed'
                      )}
                    >
                      التالي <ChevronLeft size={16} />
                    </button>
                  ) : (
                    <button
                      onClick={handleSubmit}
                      disabled={!currentValue || isSubmitting}
                      className={cn(
                        'flex-1 h-11 rounded-xl flex items-center justify-center gap-1.5 text-sm font-medium transition-all duration-300',
                        currentValue && !isSubmitting
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                          : 'bg-white/[0.06] text-gray-500 cursor-not-allowed'
                      )}
                    >
                      {isSubmitting ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <><Check size={16} /> {isManager ? 'اعتماد' : 'إرسال كمسودة'}</>
                      )}
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Recording indicator */}
        {isRecording && (
          <div className="px-5 pb-4">
            <div className="h-9 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs text-red-400">جاري التسجيل... تحدث الآن</span>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
