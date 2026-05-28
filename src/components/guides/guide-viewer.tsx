'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, ChevronDown, ChevronUp, Clock, RefreshCw, Star, AlertCircle, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { Share2, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { DynamicInfographic } from '@/components/guides/dynamic-infographic';

interface GuideSection {
  id: string;
  title: string;
  content: string;
  order: number;
}

interface GuideData {
  title: string;
  titleEn: string;
  version: string;
  lastUpdated: string;
  sections: GuideSection[];
}

function GuideAccordion({ section, index, color }: { section: GuideSection; index: number; color: string }) {
  const [open, setOpen] = useState(index === 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 overflow-hidden"
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-slate-800/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-xl flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: color }}>
            {index + 1}
          </div>
          <span className="text-sm font-bold text-gray-900 dark:text-white">{section.title}</span>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-0 border-t border-gray-50 dark:border-slate-800/50">
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mt-3 whitespace-pre-line">{section.content}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function GuideViewer({ role, color, accessCode }: { role: string; color: string; accessCode?: string }) {
  const [guide, setGuide] = useState<GuideData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [hasCode, setHasCode] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [codeError, setCodeError] = useState('');
  const [showCode, setShowCode] = useState(false);
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);

  useEffect(() => {
    if (role === 'customer') {
      setHasCode(true);
      return;
    }
    const stored = sessionStorage.getItem(`guide_access_${role}`);
    if (stored === 'granted') {
      setHasCode(true);
    } else {
      setShowCode(true);
    }
  }, [role]);

  const loadGuide = async () => {
    setSyncing(true);
    try {
      const res = await fetch(`/api/guides?role=${role}`);
      const data = await res.json();
      if (data.success && data.guide) {
        setGuide(data.guide);
      }
    } catch (e) {
      console.error('Failed to load guide:', e);
    }
    setSyncing(false);
    setLoading(false);
  };

  useEffect(() => {
    if (!hasCode) return;
    loadGuide();

    supabaseRef.current = createClient();
    const channel = supabaseRef.current
      .channel(`guide-${role}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'guide_content', filter: `role=eq.${role}` },
        () => { loadGuide(); }
      )
      .subscribe();

    return () => {
      supabaseRef.current?.removeChannel(channel);
    };
  }, [hasCode, role]);

  const handleCodeSubmit = () => {
    if (!codeInput.trim()) { setCodeError('أدخل كود الوصول'); return; }
    const storedCode = localStorage.getItem('guides_access_code') || 'SAPKEY GUIDES';
    if (codeInput.trim() === storedCode) {
      sessionStorage.setItem(`guide_access_${role}`, 'granted');
      setHasCode(true);
      setShowCode(false);
      setCodeError('');
    } else {
      setCodeError('كود الوصول غير صحيح');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = (method: 'whatsapp' | 'email') => {
    const text = encodeURIComponent(`دليل الاستخدام (${role}):\n${window.location.href}`);
    if (method === 'whatsapp') {
      window.open(`https://wa.me/?text=${text}`, '_blank');
    } else {
      window.open(`mailto:?subject=دليل استخدام النظام&body=${text}`);
    }
  };

  if (showCode) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#020617] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-xl p-6 space-y-4">
          <div className="text-center relative">
            <Link href="/" className="absolute top-0 right-0 p-2 text-gray-400 hover:text-gray-900 transition-colors">
              <ArrowRight className="w-5 h-5" />
            </Link>
            <div className="h-14 w-14 rounded-2xl mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: color }}>
              <BookOpen className="h-7 w-7 text-white" />
            </div>
            <h2 className="text-lg font-black text-gray-900 dark:text-white">دليل {role === 'cashier' ? 'الكاشير' : role === 'manager' ? 'المدير' : role === 'customer' ? 'العميل' : 'المطور'}</h2>
            <p className="text-xs text-gray-400 mt-1">أدخل كود الوصول للمتابعة</p>
          </div>
          <div>
            <label className="text-[10px] font-medium text-gray-500 block mb-1">كود الوصول</label>
            <input
              type="password"
              value={codeInput}
              onChange={(e) => { setCodeInput(e.target.value); setCodeError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleCodeSubmit()}
              dir="ltr"
              placeholder="أدخل الكود..."
              className="w-full h-11 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-xs px-3 text-black focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all"
            />
            {codeError && (
              <p className="text-[10px] text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {codeError}</p>
            )}
          </div>
          <button
            onClick={handleCodeSubmit}
            className="w-full h-11 rounded-xl text-white text-sm font-bold"
            style={{ backgroundColor: color }}
          >
            دخول
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#020617] flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-t-transparent rounded-full" style={{ borderColor: color }} />
      </div>
    );
  }

  if (!guide) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#020617] flex items-center justify-center">
        <p className="text-sm text-gray-400">لا يوجد دليل متاح</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#020617] pb-8">
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-200 dark:border-slate-800 print:hidden">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-2 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
              <ArrowRight className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-bold">دليل {role === 'cashier' ? 'الكاشير' : role === 'manager' ? 'المدير' : role === 'developer' ? 'المطور' : 'العميل'}</h1>
          </div>
          
          <div className="flex items-center gap-2">
            {role === 'developer' && (
              <>
                <button onClick={() => handleShare('whatsapp')} className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors text-sm font-bold">
                  <Share2 className="w-4 h-4" /> واتساب
                </button>
                <button onClick={handlePrint} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors text-sm font-bold">
                  <Download className="w-4 h-4" /> PDF
                </button>
              </>
            )}
            <button
              onClick={loadGuide}
              disabled={syncing}
              className="h-8 w-8 rounded-lg bg-gray-100 dark:bg-slate-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-slate-700 transition-all disabled:opacity-50"
              title="تحديث"
            >
              <RefreshCw className={`h-4 w-4 text-gray-500 ${syncing ? 'animate-spin' : ''}`} />
            </button>
            {guide.role === 'customer' ? (
              <a href="/login" className="text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 px-4 py-1.5 rounded-lg transition-all shadow-md">
                تسجيل الدخول / مستخدم جديد
              </a>
            ) : (
              <button onClick={() => setHasCode(false)} className="text-sm font-medium text-red-500 hover:text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                خروج
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-4 space-y-4">
        {/* Version & Sync Info */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4" style={{ color }} />
              <span className="text-xs font-bold text-gray-900 dark:text-white">الإصدار {guide.version}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
              <Clock className="h-3 w-3" />
              <span>آخر تحديث: {new Date(guide.lastUpdated).toLocaleDateString('ar-EG')}</span>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[10px] text-green-500">
            <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
            <span>متزامن لحظيًا مع Supabase</span>
          </div>
        </div>

        {/* Detailed Guide Content */}
        <div className="space-y-4">
          <DynamicInfographic role={role} />
          
          {guide.sections
            .sort((a, b) => a.order - b.order)
            .map((section, i) => (
              <GuideAccordion key={section.id} section={section} index={i} color={color} />
            ))}
        </div>

        {/* Footer */}
        <div className="text-center py-4">
          <p className="text-[10px] text-gray-400">
            SAPKEY SOLUTIONS <sup>TM</sup> &copy; {new Date().getFullYear()} — يتم تحديث هذا الدليل تلقائيًا
          </p>
        </div>
      </div>
    </div>
  );
}
